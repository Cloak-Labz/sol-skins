use anchor_lang::prelude::*;

/// Tracks which inventory items have been assigned to prevent double-assignment
#[account]
pub struct InventoryAssignment {
    /// Hash of the assigned inventory
    pub inventory_id_hash: [u8; 32],
    
    /// Box mint that owns this inventory
    pub box_mint: Pubkey,
    
    /// Batch this inventory came from
    pub batch_id: u64,
    
    /// Timestamp of assignment
    pub assigned_at: i64,
    
    /// Bump seed for PDA
    pub bump: u8,
}

impl InventoryAssignment {
    pub const LEN: usize = 8 + // discriminator
        32 + // inventory_id_hash
        32 + // box_mint
        8 +  // batch_id
        8 +  // assigned_at
        1;   // bump
}

