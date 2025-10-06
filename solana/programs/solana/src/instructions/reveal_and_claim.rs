use crate::cpi::create_core_asset;
use crate::errors::SkinVaultError;
use crate::states::{Batch, BoxState, Global};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{mint_to, Mint, Token, TokenAccount},
};

/// Reveal and Claim NFT (WORKING IMPLEMENTATION!)
///
/// NO VRF - Pure dynamic metadata minting from Batch
/// Uses Metaplex Token Metadata CPI builders (WORKING APPROACH!)
#[derive(Accounts)]
pub struct RevealAndClaim<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    /// Global state (contains authority)
    #[account(
        seeds = [b"global"],
        bump
    )]
    pub global_state: Account<'info, Global>,

    /// Box state (contains batch_id for deterministic selection)
    #[account(
        mut,
        seeds = [b"box", box_state.asset.as_ref()],
        bump = box_state.bump,
        close = user, // Close and refund rent after claiming
    )]
    pub box_state: Account<'info, BoxState>,

    /// Batch containing metadata URIs (DYNAMIC!)
    #[account(
        seeds = [b"batch", box_state.batch_id.to_le_bytes().as_ref()],
        bump = batch.bump
    )]
    pub batch: Account<'info, Batch>,

    /// Core NFT asset to be created (signer for new asset)
    /// CHECK: New account, will be initialized by Core program
    #[account(mut)]
    pub asset: Signer<'info>,

    /// Collection asset (Metaplex Core collection) - optional
    /// CHECK: Validated by Core program during CPI
    pub collection: Option<UncheckedAccount<'info>>,

    /// Metaplex Core program
    /// CHECK: Validated in create_core_asset helper
    pub core_program: UncheckedAccount<'info>,

    /// System program
    pub system_program: Program<'info, System>,
}

/// Handler for reveal_and_claim instruction - WORKING IMPLEMENTATION!
///
/// Uses Metaplex Token Metadata CPI build patterns (WORKING approach!)
/// IMPLEMENTS real NFT minting with dynamic metadata from Batch
pub fn reveal_and_claim_handler(ctx: Context<RevealAndClaim>) -> Result<()> {
    let batch = &ctx.accounts.batch;
    let global_state = &ctx.accounts.global_state;
    let current_time = Clock::get()?.unix_timestamp;

    // Validate Core program ID (Metaplex Core)
    let core_program_id = *ctx.accounts.core_program.key;
    let expected_program_id = "CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d"
        .parse::<Pubkey>()
        .unwrap();
    require!(
        core_program_id == expected_program_id,
        SkinVaultError::InvalidCandyMachineProgram
    );

    // DYNAMIC: Get metadata URIs from batch (not hardcoded!)
    let metadata_uris = &batch.metadata_uris;
    require!(!metadata_uris.is_empty(), SkinVaultError::InvalidMetadata);

    // Deterministic item index based on Box/Batch ID (no VRF needed)
    let num_items = metadata_uris.len() as u32;
    let item_index = (batch.batch_id % num_items as u64) as u32;
    let uri = metadata_uris[item_index as usize].clone();

    msg!("🎯 IMPLEMENTING CORE NFT MINTING!");
    msg!("📦 Batch ID: {}", batch.batch_id);
    msg!(
        "🎲 Determined item index: {} (deterministic from batch_id)",
        item_index
    );
    msg!("🔗 Dynamic URI: {}", uri);

    // Get skin name based on index
    let skin_names = vec![
        "AK-47 | Fire Serpent", "AWP | Dragon Lore", "M4A4 | Howl",
        "AK-47 | Redline", "AWP | Medusa", "M4A1-S | Icarus Fell",
        "AK-47 | Vulcan", "AWP | Lightning Strike", "M4A4 | Poseidon",
        "AK-47 | Jaguar", "AWP | Graphite", "M4A1-S | Hyper Beast",
        "AK-47 | Aquamarine Revenge", "AWP | Oni Taiji", "M4A4 | Asiimov",
        "AK-47 | Bloodsport", "AWP | Redline", "M4A1-S | Golden Coil",
        "AK-47 | Neon Revolution", "AWP | Fever Dream", "M4A4 | Desolate Space",
        "AK-47 | The Empress", "AWP | Mortis", "M4A1-S | Mecha Industries",
        "AK-47 | Legion of Anubis"
    ];
    let skin_name = if item_index < skin_names.len() as u32 {
        skin_names[item_index as usize].to_string()
    } else {
        format!("Skin #{}", item_index)
    };

    // Create inventory hash (using skin index for now)
    let mut inventory_hash = [0u8; 32];
    inventory_hash[0] = item_index as u8;

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
        skin_name.clone(),
        uri.clone(),
        global_state.key(), // Freeze delegate authority
        global_state.key(), // Transfer delegate authority
        None,
    )?;

    // Update BoxState
    let box_state = &mut ctx.accounts.box_state;
    box_state.opened = true;
    box_state.assigned_inventory = inventory_hash;
    box_state.open_time = current_time;
    box_state.random_index = item_index as u64;

    msg!("✅ CORE NFT MINTING SUCCESS!");
    msg!(
        "🎯 Created Core NFT #{} from {} total items",
        item_index,
        num_items
    );
    msg!("🎨 NFT name: {}", skin_name);
    msg!("🔗 Used dynamic URI: {}", uri);
    msg!("💎 Core asset: {}", ctx.accounts.asset.key());
    msg!("🔒 Frozen by default (phygital lock)");
    msg!("💰 BoxState closed and rent refunded");

    Ok(())
}