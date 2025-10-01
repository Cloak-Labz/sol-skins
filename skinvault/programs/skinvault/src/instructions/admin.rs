use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

use crate::errors::SkinVaultError;
use crate::events::*;
use crate::state::*;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        seeds = [b"skinvault", authority.key().as_ref()],
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
pub struct SetOracle<'info> {
    #[account(
        mut,
        seeds = [b"skinvault", authority.key().as_ref()],
        bump = global.bump,
        has_one = authority @ SkinVaultError::Unauthorized
    )]
    pub global: Account<'info, Global>,
    
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct ToggleBuyback<'info> {
    #[account(
        mut,
        seeds = [b"skinvault", authority.key().as_ref()],
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
        seeds = [b"skinvault", authority.key().as_ref()],
        bump = global.bump,
        has_one = authority @ SkinVaultError::Unauthorized
    )]
    pub global: Account<'info, Global>,
    
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct DepositTreasury<'info> {
    #[account(
        seeds = [b"skinvault", global.authority.as_ref()],
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

pub fn initialize_handler(
    ctx: Context<Initialize>,
    oracle_pubkey: Pubkey,
) -> Result<()> {
    let global = &mut ctx.accounts.global;
    global.authority = ctx.accounts.authority.key();
    global.oracle_pubkey = oracle_pubkey;
    global.usdc_mint = ctx.accounts.usdc_mint.key();
    global.buyback_enabled = true;
    global.min_treasury_balance = 1000 * 1_000_000; // 1000 USDC
    global.current_batch = 0;
    global.total_boxes_minted = 0;
    global.total_buybacks = 0;
    global.total_buyback_volume = 0;
    global.bump = ctx.bumps.global;

    msg!("SkinVault initialized with authority: {}", global.authority);
    msg!("Oracle set to: {}", oracle_pubkey);
    msg!("USDC mint: {}", global.usdc_mint);

    Ok(())
}

pub fn set_oracle_handler(
    ctx: Context<SetOracle>,
    new_oracle_pubkey: Pubkey,
) -> Result<()> {
    let global = &mut ctx.accounts.global;
    let old_oracle = global.oracle_pubkey;
    global.oracle_pubkey = new_oracle_pubkey;

    emit!(OracleUpdated {
        old_oracle,
        new_oracle: new_oracle_pubkey,
        authority: ctx.accounts.authority.key(),
    });

    msg!("Oracle updated from {} to {}", old_oracle, new_oracle_pubkey);

    Ok(())
}

pub fn toggle_buyback_handler(
    ctx: Context<ToggleBuyback>,
    enabled: bool,
) -> Result<()> {
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

pub fn deposit_treasury_handler(
    ctx: Context<DepositTreasury>,
    amount: u64,
) -> Result<()> {
    // Transfer USDC from depositor to treasury
    crate::cpi::spl::transfer_tokens(
        &ctx.accounts.token_program,
        &ctx.accounts.depositor_ata,
        &ctx.accounts.treasury_ata,
        &ctx.accounts.depositor.to_account_info(),
        amount,
        None,
    )?;

    let new_balance = ctx.accounts.treasury_ata.amount
        .checked_add(amount)
        .ok_or(SkinVaultError::ArithmeticOverflow)?;

    emit!(TreasuryDeposit {
        amount,
        depositor: ctx.accounts.depositor.key(),
        new_balance,
    });

    msg!("Treasury deposit: {} USDC from {}", amount, ctx.accounts.depositor.key());

    Ok(())
}
