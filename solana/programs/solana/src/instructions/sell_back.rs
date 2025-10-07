use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::cpi::core::{burn_core_asset, update_freeze_delegate};
use crate::errors::SkinVaultError;
use crate::events::*;
use crate::states::*;
use crate::utils::*;

#[derive(Accounts)]
pub struct SellBack<'info> {
    #[account(
        mut,
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
        constraint = user_ata.mint == usdc_mint.key() @ SkinVaultError::Unauthorized,
        constraint = user_ata.owner == seller.key() @ SkinVaultError::Unauthorized
    )]
    pub user_ata: Account<'info, TokenAccount>,

    #[account(address = global.usdc_mint)]
    pub usdc_mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [b"box", box_state.asset.as_ref()],
        bump = box_state.bump,
        constraint = box_state.owner == seller.key() @ SkinVaultError::NotBoxOwner,
        constraint = box_state.opened @ SkinVaultError::NotOpenedYet,
        constraint = box_state.assigned_inventory != [0u8; 32] @ SkinVaultError::InventoryAlreadyAssigned,
        constraint = !box_state.redeemed @ SkinVaultError::AlreadyOpened
    )]
    pub box_state: Account<'info, BoxState>,

    /// Core NFT asset to be burned (must be owned by seller)
    /// CHECK: Validated by Core program during burn
    #[account(
        mut,
        constraint = asset.key() == box_state.asset @ SkinVaultError::Unauthorized
    )]
    pub asset: UncheckedAccount<'info>,

    /// Optional collection (if asset belongs to a collection)
    /// CHECK: Validated by Core program if provided
    #[account(mut)]
    pub collection: Option<UncheckedAccount<'info>>,

    /// Metaplex Core program
    /// CHECK: Validated in burn_core_asset helper
    pub core_program: UncheckedAccount<'info>,

    #[account(mut)]
    pub seller: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn sell_back_handler(ctx: Context<SellBack>, market_price: u64, min_price: u64) -> Result<()> {
    let global = &mut ctx.accounts.global;

    // Check if program is paused
    require!(!global.paused, SkinVaultError::BuybackDisabled);

    // Check buyback is enabled
    require!(global.buyback_enabled, SkinVaultError::BuybackDisabled);

    // Validate market price is non-zero
    require!(market_price > 0, SkinVaultError::SlippageExceeded);

    // Calculate payout with spread fee
    let payout = calculate_buyback_payout(market_price)?;
    let spread_fee = market_price
        .checked_sub(payout)
        .ok_or(SkinVaultError::ArithmeticOverflow)?;

    // Check minimum price tolerance
    require!(payout >= min_price, SkinVaultError::SlippageExceeded);

    // Check treasury has sufficient funds
    let treasury_balance = ctx.accounts.treasury_ata.amount;
    let required_balance = payout
        .checked_add(global.min_treasury_balance)
        .ok_or(SkinVaultError::ArithmeticOverflow)?;

    require!(
        treasury_balance >= required_balance,
        SkinVaultError::TreasuryInsufficient
    );

    // Transfer USDC from treasury to user
    let global_seeds: &[&[u8]] = &[b"global", &[global.bump]];
    let signer_seeds: &[&[&[u8]]] = &[global_seeds];

    crate::cpi::spl::transfer_tokens(
        &ctx.accounts.token_program,
        &ctx.accounts.treasury_ata,
        &ctx.accounts.user_ata,
        &global.to_account_info(),
        payout,
        Some(signer_seeds),
    )?;

    // Update global statistics
    global.total_buybacks = global
        .total_buybacks
        .checked_add(1)
        .ok_or(SkinVaultError::ArithmeticOverflow)?;

    global.total_buyback_volume = global
        .total_buyback_volume
        .checked_add(payout)
        .ok_or(SkinVaultError::ArithmeticOverflow)?;

    // Filter out default pubkey for collection
    let collection_ref = ctx
        .accounts
        .collection
        .as_ref()
        .filter(|c| c.key() != Pubkey::default())
        .map(|c| c.to_account_info());

    // Step 1: Unfreeze the asset (platform has freeze delegate authority)
    update_freeze_delegate(
        &ctx.accounts.core_program.to_account_info(),
        &ctx.accounts.asset.to_account_info(),
        collection_ref.as_ref(),
        &ctx.accounts.seller.to_account_info(),
        &global.to_account_info(),
        &ctx.accounts.system_program.to_account_info(),
        false, // frozen = false (unfreeze)
        Some(signer_seeds),
    )?;

    // Step 2: Burn the Core NFT asset
    burn_core_asset(
        &ctx.accounts.core_program.to_account_info(),
        &ctx.accounts.asset.to_account_info(),
        collection_ref.as_ref(),
        &ctx.accounts.seller.to_account_info(),
        &ctx.accounts.system_program.to_account_info(),
        None, // Seller signs the burn
    )?;

    // Mark box as redeemed
    let box_state = &mut ctx.accounts.box_state;
    box_state.redeemed = true;
    box_state.redeem_time = Clock::get()?.unix_timestamp;

    emit!(BuybackExecuted {
        nft_mint: box_state.asset, // Now using asset address instead of mint
        inventory_id_hash: box_state.assigned_inventory,
        price: market_price,
        spread_fee,
        payout,
        buyer: ctx.accounts.seller.key(),
    });
    Ok(())
}
