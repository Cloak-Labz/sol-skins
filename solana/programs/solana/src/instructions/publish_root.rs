use anchor_lang::prelude::*;

use crate::errors::SkinVaultError;
use crate::events::*;
use crate::states::*;

#[derive(Accounts)]
#[instruction(batch_id: u64, candy_machine: Pubkey, metadata_uris: Vec<String>)]
pub struct PublishMerkleRoot<'info> {
    #[account(
        seeds = [b"global"],
        bump = global.bump,
        has_one = authority @ SkinVaultError::Unauthorized
    )]
    pub global: Account<'info, Global>,

    #[account(
        init_if_needed,
        payer = authority,
        seeds = [b"batch", batch_id.to_le_bytes().as_ref()],
        bump,
        space = Batch::space(metadata_uris.len())  // Dynamic sizing
    )]
    pub batch: Account<'info, Batch>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn publish_merkle_root_handler(
    ctx: Context<PublishMerkleRoot>,
    batch_id: u64,
    candy_machine: Pubkey,
    metadata_uris: Vec<String>,
    merkle_root: [u8; 32],
    snapshot_time: i64,
) -> Result<()> {
    let current_time = Clock::get()?.unix_timestamp;

    // Validate timestamp (allow some tolerance for test environments)
    require!(
        snapshot_time > 0 && snapshot_time <= current_time + 60, // Allow 1 minute tolerance
        SkinVaultError::InvalidBatchId
    );

    // Validate merkle root is not empty
    require!(merkle_root != [0u8; 32], SkinVaultError::InvalidBatchId);

    // Validate metadata URIs
    require!(!metadata_uris.is_empty(), SkinVaultError::InvalidMetadata);
    for uri in &metadata_uris {
        require!(
            uri.len() <= 200 && !uri.is_empty(),
            SkinVaultError::InvalidMetadata
        );
    }

    let total_items = metadata_uris.len() as u64;

    let batch = &mut ctx.accounts.batch;
    let global = &mut ctx.accounts.global;

    // Update global counter to track the highest batch ID
    if batch_id > global.current_batch {
        global.current_batch = batch_id;
    }

    batch.batch_id = batch_id;
    batch.candy_machine = candy_machine;
    batch.metadata_uris = metadata_uris;
    batch.merkle_root = merkle_root;
    batch.snapshot_time = snapshot_time;
    batch.total_items = total_items;
    batch.boxes_minted = 0;
    batch.boxes_opened = 0;
    batch.bump = ctx.bumps.batch;

    emit!(MerklePublished {
        batch_id,
        merkle_root,
        snapshot_time,
    });

    msg!("📦 Batch {} created with {} skins", batch_id, total_items);
    msg!("🍬 Candy Machine (reference): {}", candy_machine);
    msg!("📅 Snapshot time: {}", snapshot_time);

    Ok(())
}
