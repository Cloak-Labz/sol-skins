use anchor_lang::prelude::*;

use crate::errors::SkinVaultError;
use crate::events::*;
use crate::merkle::*;
use crate::state::*;
use crate::utils::*;

#[derive(Accounts)]
pub struct Assign<'info> {
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

    /// Only box owner or authority can assign inventory
    pub signer: Signer<'info>,
}

pub fn assign_handler(
    ctx: Context<Assign>,
    inventory_id_hash: [u8; 32],
    merkle_proof: Vec<[u8; 32]>,
    _backend_signature: Option<[u8; 64]>, // Optional backend signature for additional verification
) -> Result<()> {
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
