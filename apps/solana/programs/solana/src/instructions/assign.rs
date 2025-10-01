use anchor_lang::prelude::*;

use crate::cpi::metaplex;
use crate::errors::SkinVaultError;
use crate::events::*;
use crate::merkle::*;
use crate::states::*;
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
    new_metadata: Option<SkinMetadata>, // Optional: Update NFT to show actual skin
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

    // Update NFT metadata if new metadata provided (transforms mystery box → actual skin)
    if let Some(metadata) = new_metadata {
        msg!("Updating NFT metadata to: {}", metadata.name);
        
        metaplex::update_nft_metadata(
            &ctx.accounts.metadata_program.to_account_info(),
            &ctx.accounts.metadata.to_account_info(),
            &ctx.accounts.signer.to_account_info(), // Box owner is update authority
            Some(metadata.name.clone()),
            metadata.symbol,
            Some(metadata.uri.clone()),
            None, // Keep existing creators
            metadata.seller_fee_basis_points,
            None, // User signs, not PDA
        )?;

        msg!("NFT metadata updated: {} -> {}", box_state.nft_mint, metadata.uri);
    } else {
        msg!("NFT metadata not updated (no new metadata provided)");
    }

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

/// Metadata for updating NFT after inventory assignment
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct SkinMetadata {
    /// New name (e.g., "AK-47 | Redline")
    pub name: String,
    
    /// New symbol (optional, defaults to "SVBOX")
    pub symbol: Option<String>,
    
    /// New metadata URI (e.g., "https://arweave.net/ak47-redline.json")
    pub uri: String,
    
    /// Seller fee basis points (optional, defaults to existing)
    pub seller_fee_basis_points: Option<u16>,
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
