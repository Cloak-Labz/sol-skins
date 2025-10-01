use anchor_lang::prelude::*;

use crate::cpi::metaplex;
use crate::errors::SkinVaultError;
use crate::events::*;
use crate::merkle::*;
use crate::state::*;
use crate::utils::*;

#[derive(Accounts)]
#[instruction(inventory_id_hash: [u8; 32])]
pub struct Assign<'info> {
    #[account(
        seeds = [b"global"],
        bump = global.bump
    )]
    pub global: Account<'info, Global>,

    #[account(
        seeds = [b"batch", batch.batch_id.to_le_bytes().as_ref()],
        bump = batch.bump
    )]
    pub batch: Account<'info, Batch>,

    #[account(
        mut,
        seeds = [b"box", box_state.nft_mint.as_ref()],
        bump = box_state.bump,
        constraint = box_state.opened @ SkinVaultError::NotOpenedYet,
        constraint = box_state.assigned_inventory == [0u8; 32] @ SkinVaultError::InventoryAlreadyAssigned
    )]
    pub box_state: Account<'info, BoxState>,

    /// Track inventory assignment to prevent reuse
    #[account(
        init,
        payer = signer,
        seeds = [b"inventory", inventory_id_hash.as_ref()],
        bump,
        space = InventoryAssignment::LEN
    )]
    pub inventory_assignment: Account<'info, InventoryAssignment>,

    /// CHECK: Metadata account for updating after assignment (optional)
    #[account(
        mut,
        seeds = [
            b"metadata",
            mpl_token_metadata::ID.as_ref(),
            box_state.nft_mint.as_ref(),
        ],
        bump,
        seeds::program = mpl_token_metadata::ID,
    )]
    pub metadata: UncheckedAccount<'info>,

    /// CHECK: Metaplex Token Metadata Program
    #[account(address = mpl_token_metadata::ID)]
    pub metadata_program: UncheckedAccount<'info>,

    /// Only box owner or authority can assign inventory
    #[account(mut)]
    pub signer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn assign_handler(
    ctx: Context<Assign>,
    inventory_id_hash: [u8; 32],
    merkle_proof: Vec<[u8; 32]>,
    _backend_signature: Option<[u8; 64]>, // Optional backend signature for additional verification
) -> Result<()> {
    // Check if program is paused
    require!(!ctx.accounts.global.paused, SkinVaultError::BuybackDisabled);
    
    // Validate inventory hash
    validate_inventory_hash(&inventory_id_hash)?;

    // Verify the signer is either the box owner or has authority
    let box_state = &ctx.accounts.box_state;
    require!(
        ctx.accounts.signer.key() == box_state.owner,
        SkinVaultError::NotBoxOwner
    );

    // Verify Merkle proof
    verify_merkle_proof(
        &inventory_id_hash,
        &ctx.accounts.batch.merkle_root,
        &merkle_proof,
    )?;

    // Initialize inventory assignment (prevents double-assignment)
    let assignment = &mut ctx.accounts.inventory_assignment;
    assignment.inventory_id_hash = inventory_id_hash;
    assignment.box_mint = box_state.nft_mint;
    assignment.batch_id = box_state.batch_id;
    assignment.assigned_at = Clock::get()?.unix_timestamp;
    assignment.bump = ctx.bumps.inventory_assignment;

    // Assign inventory to box
    let box_state = &mut ctx.accounts.box_state;
    box_state.assigned_inventory = inventory_id_hash;

    emit!(InventoryAssigned {
        nft_mint: box_state.nft_mint,
        inventory_id_hash,
        batch_id: box_state.batch_id,
    });

    msg!(
        "Inventory assigned to box {}: hash {}",
        box_state.nft_mint,
        hex::encode(inventory_id_hash)
    );

    Ok(())
}

/// Helper function to convert bytes to hex string for logging
mod hex {
    pub fn encode(bytes: [u8; 32]) -> String {
        bytes.iter()
            .map(|b| format!("{:02x}", b))
            .collect::<Vec<String>>()
            .join("")
    }
}
