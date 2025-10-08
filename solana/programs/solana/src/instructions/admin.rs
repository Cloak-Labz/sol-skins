use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

use crate::errors::SkinVaultError;
use crate::events::*;
use crate::states::*;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        seeds = [b"global"],
        bump,
        space = Global::LEN
    )]
    pub global: Account<'info, Global>,

    /// USDC mint (or test mint for devnet)
    pub usdc_mint: Account<'info, Mint>,

    /// Treasury ATA - PDA will own this account
    #[account(
        init,
        payer = authority,
        associated_token::mint = usdc_mint,
        associated_token::authority = global
    )]
    pub treasury_ata: Account<'info, TokenAccount>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ToggleBuyback<'info> {
    #[account(
        mut,
        seeds = [b"global"],
        bump = global.bump,
        has_one = authority @ SkinVaultError::Unauthorized
    )]
    pub global: Account<'info, Global>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct SetMinTreasuryBalance<'info> {
    #[account(
        mut,
        seeds = [b"global"],
        bump = global.bump,
        has_one = authority @ SkinVaultError::Unauthorized
    )]
    pub global: Account<'info, Global>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct DepositTreasury<'info> {
    #[account(
        seeds = [b"global"],
        bump = global.bump
    )]
    pub global: Account<'info, Global>,

    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = global
    )]
    pub treasury_ata: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = depositor_ata.mint == usdc_mint.key() @ SkinVaultError::Unauthorized
    )]
    pub depositor_ata: Account<'info, TokenAccount>,

    #[account(address = global.usdc_mint)]
    pub usdc_mint: Account<'info, Mint>,

    #[account(mut)]
    pub depositor: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

pub fn initialize_handler(ctx: Context<Initialize>) -> Result<()> {
    let global = &mut ctx.accounts.global;
    global.authority = ctx.accounts.authority.key();
    global.usdc_mint = ctx.accounts.usdc_mint.key();
    global.buyback_enabled = true;
    global.min_treasury_balance = 1000 * 1_000_000; // 1000 USDC
    global.current_batch = 0;
    global.total_boxes_minted = 0;
    global.total_buybacks = 0;
    global.total_buyback_volume = 0;
    global.paused = false;
    global.pending_authority = None;
    global.bump = ctx.bumps.global;

    msg!("SkinVault initialized with authority: {}", global.authority);
    msg!("USDC mint: {}", global.usdc_mint);

    Ok(())
}

pub fn toggle_buyback_handler(ctx: Context<ToggleBuyback>, enabled: bool) -> Result<()> {
    let global = &mut ctx.accounts.global;
    global.buyback_enabled = enabled;

    emit!(BuybackToggled {
        enabled,
        authority: ctx.accounts.authority.key(),
    });

    msg!("Buyback {}", if enabled { "enabled" } else { "disabled" });

    Ok(())
}

pub fn set_min_treasury_balance_handler(
    ctx: Context<SetMinTreasuryBalance>,
    amount: u64,
) -> Result<()> {
    let global = &mut ctx.accounts.global;
    global.min_treasury_balance = amount;

    msg!("Minimum treasury balance set to: {}", amount);

    Ok(())
}

pub fn deposit_treasury_handler(ctx: Context<DepositTreasury>, amount: u64) -> Result<()> {
    // Transfer USDC from depositor to treasury
    crate::cpi::spl::transfer_tokens(
        &ctx.accounts.token_program,
        &ctx.accounts.depositor_ata,
        &ctx.accounts.treasury_ata,
        &ctx.accounts.depositor.to_account_info(),
        amount,
        None,
    )?;

    let new_balance = ctx
        .accounts
        .treasury_ata
        .amount
        .checked_add(amount)
        .ok_or(SkinVaultError::ArithmeticOverflow)?;

    emit!(TreasuryDeposit {
        amount,
        depositor: ctx.accounts.depositor.key(),
        new_balance,
    });

    msg!(
        "Treasury deposit: {} USDC from {}",
        amount,
        ctx.accounts.depositor.key()
    );

    Ok(())
}

#[derive(Accounts)]
pub struct WithdrawTreasury<'info> {
    #[account(
        seeds = [b"global"],
        bump = global.bump,
        has_one = authority @ SkinVaultError::Unauthorized
    )]
    pub global: Account<'info, Global>,

    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = global
    )]
    pub treasury_ata: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = recipient_ata.mint == usdc_mint.key() @ SkinVaultError::Unauthorized
    )]
    pub recipient_ata: Account<'info, TokenAccount>,

    #[account(address = global.usdc_mint)]
    pub usdc_mint: Account<'info, Mint>,

    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

pub fn withdraw_treasury_handler(ctx: Context<WithdrawTreasury>, amount: u64) -> Result<()> {
    let global = &ctx.accounts.global;
    let treasury_balance = ctx.accounts.treasury_ata.amount;

    // Ensure minimum balance remains
    let remaining_balance = treasury_balance
        .checked_sub(amount)
        .ok_or(SkinVaultError::ArithmeticOverflow)?;

    require!(
        remaining_balance >= global.min_treasury_balance,
        SkinVaultError::TreasuryInsufficient
    );

    // Transfer from treasury using PDA signer
    let global_seeds: &[&[u8]] = &[b"global", &[global.bump]];
    let signer_seeds: &[&[&[u8]]] = &[global_seeds];

    crate::cpi::spl::transfer_tokens(
        &ctx.accounts.token_program,
        &ctx.accounts.treasury_ata,
        &ctx.accounts.recipient_ata,
        &global.to_account_info(),
        amount,
        Some(signer_seeds),
    )?;

    msg!(
        "Treasury withdrawal: {} USDC to {}",
        amount,
        ctx.accounts.authority.key()
    );

    Ok(())
}

// Emergency Controls

#[derive(Accounts)]
pub struct EmergencyPause<'info> {
    #[account(
        mut,
        seeds = [b"global"],
        bump = global.bump,
        has_one = authority @ SkinVaultError::Unauthorized
    )]
    pub global: Account<'info, Global>,

    pub authority: Signer<'info>,
}

pub fn emergency_pause_handler(ctx: Context<EmergencyPause>, paused: bool) -> Result<()> {
    ctx.accounts.global.paused = paused;

    msg!("Emergency pause set to: {}", paused);

    Ok(())
}

// Authority Transfer (2-step for safety)

pub fn initiate_authority_transfer_handler(
    ctx: Context<EmergencyPause>,
    new_authority: Pubkey,
) -> Result<()> {
    let global = &mut ctx.accounts.global;
    global.pending_authority = Some(new_authority);

    msg!(
        "Authority transfer initiated from {} to {}",
        global.authority,
        new_authority
    );

    Ok(())
}

#[derive(Accounts)]
pub struct AcceptAuthority<'info> {
    #[account(
        mut,
        seeds = [b"global"],
        bump = global.bump,
        constraint = global.pending_authority == Some(new_authority.key())
            @ SkinVaultError::Unauthorized
    )]
    pub global: Account<'info, Global>,

    pub new_authority: Signer<'info>,
}

pub fn accept_authority_handler(ctx: Context<AcceptAuthority>) -> Result<()> {
    let global = &mut ctx.accounts.global;
    let old_authority = global.authority;

    global.authority = ctx.accounts.new_authority.key();
    global.pending_authority = None;

    msg!(
        "Authority transferred from {} to {}",
        old_authority,
        global.authority
    );

    Ok(())
}

/// Close Global account (DANGEROUS - only use to reset program state)
/// Uses UncheckedAccount to bypass deserialization of corrupted data
#[derive(Accounts)]
pub struct CloseGlobal<'info> {
    /// CHECK: We intentionally skip deserialization to close corrupted accounts
    #[account(
        mut,
        seeds = [b"global"],
        bump
    )]
    pub global: UncheckedAccount<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,
}

pub fn close_global_handler(ctx: Context<CloseGlobal>) -> Result<()> {
    msg!("⚠️  CLOSING GLOBAL ACCOUNT - Program will need to be reinitialized!");
    msg!("Authority: {}", ctx.accounts.authority.key());

    // Manually transfer lamports and clear data
    let global_lamports = ctx.accounts.global.lamports();
    **ctx.accounts.global.lamports.borrow_mut() = 0;
    **ctx.accounts.authority.lamports.borrow_mut() += global_lamports;

    msg!("Recovered {} lamports", global_lamports);
    Ok(())
}
