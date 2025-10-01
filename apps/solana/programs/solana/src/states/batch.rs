use anchor_lang::prelude::*;

/// Batch of inventory items with Merkle root for verification
#[account]
pub struct Batch {
    /// Unique batch identifier
    pub batch_id: u64,
    
    /// Merkle root of the inventory snapshot
    pub merkle_root: [u8; 32],
    
    /// Timestamp when the snapshot was taken
    pub snapshot_time: i64,
    
    /// Total items in this batch's inventory
    pub total_items: u64,
    
    /// Number of boxes minted for this batch
    pub boxes_minted: u64,
    
    /// Number of boxes opened for this batch
    pub boxes_opened: u64,
    
    /// Bump seed for PDA
    pub bump: u8,
}

impl Batch {
    pub const LEN: usize = 8 + // discriminator
        8 +  // batch_id
        32 + // merkle_root
        8 +  // snapshot_time
        8 +  // total_items
        8 +  // boxes_minted
        8 +  // boxes_opened
        1;   // bump
}

