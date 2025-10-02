use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::cpi::metaplex;
use crate::errors::SkinVaultError;
use crate::events::*;
use crate::states::*;

#[derive(Accounts)]
#[instruction(batch_id: u64)]
pub struct MintBox<'info> {
    #[account(
        mut,
        seeds = [b"global"],
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

    /// CHECK: Metadata account PDA
    #[account(
        mut,
        seeds = [
            b"metadata",
            mpl_token_metadata::ID.as_ref(),
            nft_mint.key().as_ref(),
        ],
        bump,
        seeds::program = mpl_token_metadata::ID,
    )]
    pub metadata: UncheckedAccount<'info>,

    /// CHECK: Master Edition account PDA (optional, for NFTs)
    #[account(
        mut,
        seeds = [
            b"metadata",
            mpl_token_metadata::ID.as_ref(),
            nft_mint.key().as_ref(),
            b"edition",
        ],
        bump,
        seeds::program = mpl_token_metadata::ID,
    )]
    pub master_edition: UncheckedAccount<'info>,

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

    /// CHECK: Metaplex Token Metadata Program
    #[account(address = mpl_token_metadata::ID)]
    pub metadata_program: UncheckedAccount<'info>,

    /// CHECK: Sysvar instructions
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub sysvar_instructions: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn mint_box_handler(ctx: Context<MintBox>, batch_id: u64, metadata_uri: String) -> Result<()> {
    // Check if program is paused
    require!(!ctx.accounts.global.paused, SkinVaultError::BuybackDisabled);

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
    box_state.redeemed = false;
    box_state.redeem_time = 0;
    box_state.bump = ctx.bumps.box_state;

    // Update counters
    batch.boxes_minted = batch
        .boxes_minted
        .checked_add(1)
        .ok_or(SkinVaultError::ArithmeticOverflow)?;

    global.total_boxes_minted = global
        .total_boxes_minted
        .checked_add(1)
        .ok_or(SkinVaultError::ArithmeticOverflow)?;

    // Create NFT metadata using Metaplex
    let box_name = format!("SkinVault Box #{}", global.total_boxes_minted);
    let box_symbol = "SVBOX".to_string();

    // Create metadata with creator (the program authority)
    let creators = vec![metaplex::Creator {
        address: global.authority,
        verified: false, // Will be verified if needed
        share: 100,
    }];

    metaplex::create_nft_metadata(
        &ctx.accounts.metadata_program.to_account_info(),
        &ctx.accounts.metadata.to_account_info(),
        Some(&ctx.accounts.master_edition.to_account_info()),
        &ctx.accounts.nft_mint.to_account_info(),
        &ctx.accounts.payer.to_account_info(), // mint authority
        &ctx.accounts.payer.to_account_info(), // payer
        &ctx.accounts.payer.to_account_info(), // update authority (user can update)
        &ctx.accounts.system_program.to_account_info(),
        &ctx.accounts.sysvar_instructions.to_account_info(),
        &ctx.accounts.token_program.to_account_info(),
        box_name,
        box_symbol,
        metadata_uri.clone(),
        Some(creators),
        500,  // 5% seller fee basis points
        None, // collection (can add later)
        true, // is_mutable (so metadata can be updated after opening)
        None, // no PDA signer needed - user is authority
    )?;

    emit!(BoxMinted {
        nft_mint: box_state.nft_mint,
        batch_id,
        owner: box_state.owner,
        metadata_uri: metadata_uri.clone(),
    });

    msg!(
        "Box minted with metadata: {} for batch {} by {}",
        box_state.nft_mint,
        batch_id,
        box_state.owner
    );

    Ok(())
}
