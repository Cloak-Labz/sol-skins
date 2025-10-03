use crate::cpi::core::create_core_asset;
use crate::errors::ProgramError;
use crate::states::{Global, VrfPending};
use anchor_lang::prelude::*;

/// Reveal and Claim NFT - Metaplex Core Minting
///
/// After VRF randomness is fulfilled, user calls this to mint their Metaplex Core NFT
/// with the VRF-determined skin metadata. The NFT is minted with:
/// - PERMANENT Freeze Delegate (locked until platform unlocks, can't be removed)
/// - REGULAR Transfer Delegate (for future marketplace, can be removed if needed)
#[derive(Accounts)]
pub struct RevealAndClaim<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        seeds = [b"global"],
        bump,
    )]
    pub global_state: Account<'info, Global>,

    #[account(
        mut,
        seeds = [b"vrf_pending", user.key().as_ref()],
        bump,
        close = user, // Close and refund rent after claiming
    )]
    pub vrf_pending: Account<'info, VrfPending>,

    #[account(
        init,
        payer = user,
        seeds = [b"box", asset.key().as_ref()],
        bump,
        space = crate::states::BoxState::LEN
    )]
    pub box_state: Account<'info, crate::states::BoxState>,

    /// Collection asset (Metaplex Core collection) - optional
    /// CHECK: Validated by Core program during CPI
    pub collection: Option<UncheckedAccount<'info>>,

    /// Core NFT asset to be created (signer for new asset)
    /// CHECK: New account, will be initialized by Core program
    #[account(mut)]
    pub asset: Signer<'info>,

    /// Metaplex Core program
    /// CHECK: Validated in create_core_asset helper
    pub core_program: UncheckedAccount<'info>,

    /// System program
    pub system_program: Program<'info, System>,
}

/// Skin metadata URIs from Candy Machine upload
/// These were uploaded via Sugar CLI and stored permanently on Arweave
const SKIN_METADATA: [&str; 3] = [
    "https://gateway.irys.xyz/DZL844th8iuN8vdmGxp89utCDTS9YUbeNVqYnUrauUk", // AK-47 | Fire Serpent
    "https://gateway.irys.xyz/9WcjY4MehfSoppfG2UVhXNq4ByUS1WAm7pAX5fN49tE6", // AWP | Dragon Lore
    "https://gateway.irys.xyz/Abk2aS4x3uwPtXjskHq3DxfaF5rLMHC4cCTkK6aQEagL", // M4A4 | Howl
];

const SKIN_NAMES: [&str; 3] = ["AK-47 | Fire Serpent", "AWP | Dragon Lore", "M4A4 | Howl"];

/// Handler for reveal_and_claim instruction
///
/// Flow:
/// 1. Validate VRF pending account has randomness
/// 2. Calculate skin index from randomness (randomness % num_skins)
/// 3. Create Metaplex Core NFT asset with freeze & transfer delegate plugins
/// 4. Close VRF pending account (refund rent)
///
/// Key Benefits of Core:
/// - Single asset account (no mint, token account, metadata, edition)
/// - ~40% cheaper in rent costs
/// - Built-in plugin system for freezing and transfer delegation
/// - Owner field directly on asset (no token account needed)
pub fn reveal_and_claim_handler(ctx: Context<RevealAndClaim>) -> Result<()> {
    let vrf_pending = &ctx.accounts.vrf_pending;
    let user = &ctx.accounts.user;
    let global_state = &ctx.accounts.global_state;
    let current_time = Clock::get()?.unix_timestamp;

    // Validate randomness is fulfilled
    require!(vrf_pending.randomness != 0, ProgramError::VrfNotFulfilled);

    // Calculate deterministic skin index from VRF randomness
    let num_skins = SKIN_METADATA.len() as u64;
    let skin_index = (vrf_pending.randomness % num_skins) as usize;

    // Get skin metadata
    let name = SKIN_NAMES[skin_index].to_string();
    let uri = SKIN_METADATA[skin_index].to_string();

    // Create inventory hash (using skin index for now)
    let mut inventory_hash = [0u8; 32];
    inventory_hash[0] = skin_index as u8;

    // Create Core NFT with plugins (skip collection if default pubkey)
    let collection_ref = ctx
        .accounts
        .collection
        .as_ref()
        .filter(|c| c.key() != Pubkey::default())
        .map(|c| c.to_account_info());

    create_core_asset(
        &ctx.accounts.core_program.to_account_info(),
        &ctx.accounts.asset.to_account_info(),
        collection_ref.as_ref(),
        &ctx.accounts.user.to_account_info(),
        Some(&ctx.accounts.user.to_account_info()),
        &ctx.accounts.system_program.to_account_info(),
        name.clone(),
        uri.clone(),
        global_state.key(),
        global_state.key(),
        None,
    )?;

    // Initialize BoxState
    let box_state = &mut ctx.accounts.box_state;
    box_state.owner = user.key();
    box_state.batch_id = 0;
    box_state.opened = true;
    box_state.assigned_inventory = inventory_hash;
    box_state.asset = ctx.accounts.asset.key();
    box_state.mint_time = current_time;
    box_state.open_time = current_time;
    box_state.random_index = skin_index as u64;
    box_state.redeemed = false;
    box_state.redeem_time = 0;
    box_state.bump = ctx.bumps.box_state;

    msg!("✅ {} revealed and minted", name);

    Ok(())
}
