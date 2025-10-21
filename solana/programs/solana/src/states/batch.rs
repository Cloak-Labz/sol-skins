use anchor_lang::prelude::*;

/// Batch of inventory items with Merkle root for verification
///
/// Each batch stores dynamic metadata URIs that can be updated by admin.
/// This allows flexible package management without program redeployment.
#[account]
pub struct Batch {
    /// Unique batch identifier
    pub batch_id: u64,

    /// Candy Machine reference (optional, for verification)
    /// Admin can link to external CM or leave as default
    pub candy_machine: Pubkey,

    /// Merkle root of the inventory snapshot (for verification)
    pub merkle_root: [u8; 32],

    /// Timestamp when the snapshot was taken
    pub snapshot_time: i64,

    /// Total items in this batch's inventory
    pub total_items: u64,

    /// Number of boxes minted for this batch
    pub boxes_minted: u64,

    /// Number of boxes opened for this batch
    pub boxes_opened: u64,

    /// Price in lamports (SOL) to open a box from this batch
    pub price_sol: u64,

    /// Bump seed for PDA
    pub bump: u8,

    /// Dynamic metadata URIs for all skins in this batch
    /// Admin can update this list to add/remove skins
    /// Each URI should be max 200 characters (Arweave/IPFS links)
    pub metadata_uris: Vec<String>,
}

impl Batch {
    /// Calculate space needed for batch with given number of items
    /// Each URI is max 200 chars + 4 bytes for string length
    pub fn space(num_items: usize) -> usize {
        8 +   // discriminator
        8 +   // batch_id
        32 +  // candy_machine
        32 +  // merkle_root
        8 +   // snapshot_time
        8 +   // total_items
        8 +   // boxes_minted
        8 +   // boxes_opened
        8 +   // price_sol
        1 +   // bump
        4 +   // vec length
        (num_items * 204) // 200 chars + 4 length per URI
    }

    /// Legacy LEN for backwards compatibility (will be removed)
    pub const LEN: usize = 113; // Old fixed size
}
