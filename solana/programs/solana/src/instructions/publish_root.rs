use anchor_lang::prelude::*;

use crate::errors::SkinVaultError;
use crate::events::*;
use crate::states::*;

#[derive(Accounts)]
#[instruction(batch_id: u64)]
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
        space = Batch::LEN
    )]
    pub batch: Account<'info, Batch>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn publish_merkle_root_handler(
    ctx: Context<PublishMerkleRoot>,
    batch_id: u64,
    merkle_root: [u8; 32],
    snapshot_time: i64,
    total_items: u64,
) -> Result<()> {
    let current_time = Clock::get()?.unix_timestamp;

    // Validate timestamp (allow some tolerance for test environments)
    require!(
        snapshot_time > 0 && snapshot_time <= current_time + 60, // Allow 1 minute tolerance
        SkinVaultError::InvalidTimestamp
    );

    // Validate merkle root is not empty
    require!(merkle_root != [0u8; 32], SkinVaultError::InvalidBatchId);

    require!(total_items > 0, SkinVaultError::InvalidBatchId);

    let batch = &mut ctx.accounts.batch;
    let global = &mut ctx.accounts.global;

    // If this is a new batch, update global counter
    if batch.batch_id == 0 {
        global.current_batch = global
            .current_batch
            .checked_add(1)
            .ok_or(SkinVaultError::ArithmeticOverflow)?;
    }

    batch.batch_id = batch_id;
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

    msg!(
        "Published Merkle root for batch {}: {} items at timestamp {}",
        batch_id,
        total_items,
        snapshot_time
    );

    Ok(())
}
