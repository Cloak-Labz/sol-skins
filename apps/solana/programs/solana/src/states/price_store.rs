use anchor_lang::prelude::*;

/// Oracle-signed price for an inventory item
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

