use anchor_lang::prelude::*;

#[account]
pub struct Global {
    /// Authority that can perform admin operations
    pub authority: Pubkey,
    
    /// Oracle public key for price signature verification
    pub oracle_pubkey: Pubkey,
    
    /// USDC mint address
    pub usdc_mint: Pubkey,
    
    /// Whether buyback is currently enabled
    pub buyback_enabled: bool,
    
    /// Minimum treasury balance required for buybacks
    pub min_treasury_balance: u64,
    
    /// Current batch counter
    pub current_batch: u64,
    
    /// Total boxes minted across all batches
    pub total_boxes_minted: u64,
    
    /// Total successful buybacks
    pub total_buybacks: u64,
    
    /// Total USDC volume from buybacks
    pub total_buyback_volume: u64,
    
    /// Bump seed for PDA
    pub bump: u8,
}

impl Global {
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        32 + // oracle_pubkey
        32 + // usdc_mint
        1 +  // buyback_enabled
        8 +  // min_treasury_balance
        8 +  // current_batch
        8 +  // total_boxes_minted
        8 +  // total_buybacks
        8 +  // total_buyback_volume
        1;   // bump
}

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

#[account]
pub struct BoxState {
    /// Owner of the box NFT
    pub owner: Pubkey,
    
    /// Batch this box belongs to
    pub batch_id: u64,
    
    /// Whether the box has been opened
    pub opened: bool,
    
    /// Hash of the assigned inventory item (zero if not assigned)
    pub assigned_inventory: [u8; 32],
    
    /// NFT mint address
    pub nft_mint: Pubkey,
    
    /// Timestamp when box was minted
    pub mint_time: i64,
    
    /// Timestamp when box was opened (zero if not opened)
    pub open_time: i64,
    
    /// Random index generated during opening
    pub random_index: u64,
    
    /// Bump seed for PDA
    pub bump: u8,
}

impl BoxState {
    pub const LEN: usize = 8 + // discriminator
        32 + // owner
        8 +  // batch_id
        1 +  // opened
        32 + // assigned_inventory
        32 + // nft_mint
        8 +  // mint_time
        8 +  // open_time
        8 +  // random_index
        1;   // bump
}

#[account]
pub struct PriceStore {
    /// Hash of the inventory item ID
    pub inventory_id_hash: [u8; 32],
    
    /// Price in USDC (6 decimal places)
    pub price: u64,
    
    /// Timestamp when price was set
    pub timestamp: i64,
    
    /// Oracle that signed this price
    pub oracle: Pubkey,
    
    /// Number of times this price has been updated
    pub update_count: u64,
    
    /// Bump seed for PDA
    pub bump: u8,
}

impl PriceStore {
    pub const LEN: usize = 8 + // discriminator
        32 + // inventory_id_hash
        8 +  // price
        8 +  // timestamp
        32 + // oracle
        8 +  // update_count
        1;   // bump
}

#[account]
pub struct VrfPending {
    /// Box mint that requested VRF
    pub box_mint: Pubkey,
    
    /// VRF request ID (if using external VRF service)
    pub request_id: u64,
    
    /// Timestamp when VRF was requested
    pub request_time: i64,
    
    /// Pool size for random index calculation
    pub pool_size: u64,
    
    /// Bump seed for PDA
    pub bump: u8,
}

impl VrfPending {
    pub const LEN: usize = 8 + // discriminator
        32 + // box_mint
        8 +  // request_id
        8 +  // request_time
        8 +  // pool_size
        1;   // bump
}
