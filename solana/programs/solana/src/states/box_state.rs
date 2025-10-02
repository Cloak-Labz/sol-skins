use anchor_lang::prelude::*;

/// State of an individual loot box NFT
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

    /// Whether the box has been redeemed (sold back)
    pub redeemed: bool,

    /// Timestamp when redeemed (zero if not redeemed)
    pub redeem_time: i64,

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
        1 +  // redeemed
        8 +  // redeem_time
        1; // bump
}
