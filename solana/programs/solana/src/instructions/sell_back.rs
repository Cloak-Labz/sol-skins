use anchor_lang::prelude::*;
use anchor_spl::token::{burn, close_account, Burn, CloseAccount, Mint, Token, TokenAccount};

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
        seeds = [b"price", box_state.assigned_inventory.as_ref()],
        bump = price_store.bump,
        constraint = price_store.inventory_id_hash == box_state.assigned_inventory @ SkinVaultError::InvalidBatchId
    )]
    pub price_store: Account<'info, PriceStore>,

    #[account(
        mut,
        seeds = [b"box", box_state.nft_mint.as_ref()],
        bump = box_state.bump,
        constraint = box_state.owner == seller.key() @ SkinVaultError::NotBoxOwner,
        constraint = box_state.opened @ SkinVaultError::NotOpenedYet,
        constraint = box_state.assigned_inventory != [0u8; 32] @ SkinVaultError::InventoryAlreadyAssigned,
        constraint = !box_state.redeemed @ SkinVaultError::AlreadyOpened
    )]
    pub box_state: Account<'info, BoxState>,

    /// NFT mint to be burned
    #[account(
        mut,
        constraint = nft_mint.key() == box_state.nft_mint @ SkinVaultError::Unauthorized
    )]
    pub nft_mint: Account<'info, Mint>,

    /// Seller's NFT token account (to be burned and closed)
    #[account(
        mut,
        constraint = seller_nft_ata.mint == nft_mint.key() @ SkinVaultError::Unauthorized,
        constraint = seller_nft_ata.owner == seller.key() @ SkinVaultError::Unauthorized,
        constraint = seller_nft_ata.amount == 1 @ SkinVaultError::Unauthorized
    )]
    pub seller_nft_ata: Account<'info, TokenAccount>,

    #[account(mut)]
    pub seller: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

pub fn sell_back_handler(ctx: Context<SellBack>, min_price: u64) -> Result<()> {
    let global = &mut ctx.accounts.global;
    let current_time = Clock::get()?.unix_timestamp;

    // Check if program is paused
    require!(!global.paused, SkinVaultError::BuybackDisabled);

    // Check buyback is enabled
    require!(global.buyback_enabled, SkinVaultError::BuybackDisabled);

    // Check price is not stale
    require!(
        !is_price_stale(ctx.accounts.price_store.timestamp, current_time),
        SkinVaultError::PriceStale
    );

    // Calculate payout with spread fee
    let market_price = ctx.accounts.price_store.price;
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

    // Burn the NFT
    burn(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                mint: ctx.accounts.nft_mint.to_account_info(),
                from: ctx.accounts.seller_nft_ata.to_account_info(),
                authority: ctx.accounts.seller.to_account_info(),
            },
        ),
        1,
    )?;

    // Close the NFT token account and reclaim rent
    close_account(CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        CloseAccount {
            account: ctx.accounts.seller_nft_ata.to_account_info(),
            destination: ctx.accounts.seller.to_account_info(),
            authority: ctx.accounts.seller.to_account_info(),
        },
    ))?;

    // Mark box as redeemed
    let box_state = &mut ctx.accounts.box_state;
    box_state.redeemed = true;
    box_state.redeem_time = Clock::get()?.unix_timestamp;

    emit!(BuybackExecuted {
        nft_mint: box_state.nft_mint,
        inventory_id_hash: box_state.assigned_inventory,
        price: market_price,
        spread_fee,
        payout,
        buyer: ctx.accounts.seller.key(),
    });

    msg!(
        "Buyback executed: {} USDC paid for NFT {} (market: {}, spread: {})",
        payout,
        box_state.nft_mint,
        market_price,
        spread_fee
    );
    msg!("NFT burned and token account closed");

    Ok(())
}
