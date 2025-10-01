use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::errors::SkinVaultError;
use crate::events::*;
use crate::state::*;

#[derive(Accounts)]
#[instruction(batch_id: u64)]
pub struct MintBox<'info> {
    #[account(
        mut,
        seeds = [b"skinvault", global.authority.as_ref()],
        bump = global.bump
    )]
    pub global: Account<'info, Global>,

    #[account(
        mut,
        seeds = [b"batch", batch_id.to_le_bytes().as_ref()],
        bump = batch.bump,
        constraint = batch.batch_id == batch_id @ SkinVaultError::InvalidBatchId
    )]
    pub batch: Account<'info, Batch>,

    /// NFT mint for the box (should be created beforehand)
    #[account(
        constraint = nft_mint.supply == 1 @ SkinVaultError::InvalidBatchId,
        constraint = nft_mint.decimals == 0 @ SkinVaultError::InvalidBatchId
    )]
    pub nft_mint: Account<'info, Mint>,

    /// User's token account for the NFT
    #[account(
        constraint = nft_ata.mint == nft_mint.key() @ SkinVaultError::Unauthorized,
        constraint = nft_ata.owner == payer.key() @ SkinVaultError::Unauthorized,
        constraint = nft_ata.amount == 1 @ SkinVaultError::Unauthorized
    )]
    pub nft_ata: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = payer,
        seeds = [b"box", nft_mint.key().as_ref()],
        bump,
        space = BoxState::LEN
    )]
    pub box_state: Account<'info, BoxState>,

    #[account(mut)]
    pub payer: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn mint_box_handler(
    ctx: Context<MintBox>,
    batch_id: u64,
    metadata_uri: String,
) -> Result<()> {
    let current_time = Clock::get()?.unix_timestamp;

    // Validate metadata URI
    require!(!metadata_uri.is_empty(), SkinVaultError::InvalidBatchId);
    require!(metadata_uri.len() <= 200, SkinVaultError::InvalidBatchId);

    let box_state = &mut ctx.accounts.box_state;
    let batch = &mut ctx.accounts.batch;
    let global = &mut ctx.accounts.global;

    // Initialize box state
    box_state.owner = ctx.accounts.payer.key();
    box_state.batch_id = batch_id;
    box_state.opened = false;
    box_state.assigned_inventory = [0u8; 32];
    box_state.nft_mint = ctx.accounts.nft_mint.key();
    box_state.mint_time = current_time;
    box_state.open_time = 0;
    box_state.random_index = 0;
    box_state.bump = ctx.bumps.box_state;

    // Update counters
    batch.boxes_minted = batch.boxes_minted
        .checked_add(1)
        .ok_or(SkinVaultError::ArithmeticOverflow)?;
    
    global.total_boxes_minted = global.total_boxes_minted
        .checked_add(1)
        .ok_or(SkinVaultError::ArithmeticOverflow)?;

    emit!(BoxMinted {
        nft_mint: box_state.nft_mint,
        batch_id,
        owner: box_state.owner,
        metadata_uri,
    });

    msg!(
        "Box minted: {} for batch {} by {}",
        box_state.nft_mint,
        batch_id,
        box_state.owner
    );

    Ok(())
}
