use anchor_lang::prelude::*;

#[event]
pub struct MerklePublished {
    pub batch_id: u64,
    pub merkle_root: [u8; 32],
    pub snapshot_time: i64,
}

#[event]
pub struct BoxMinted {
    pub nft_mint: Pubkey,
    pub batch_id: u64,
    pub owner: Pubkey,
    pub metadata_uri: String,
}

#[event]
pub struct BoxOpenRequested {
    pub nft_mint: Pubkey,
    pub owner: Pubkey,
    pub vrf_request_id: Option<u64>,
}

#[event]
pub struct BoxOpened {
    pub nft_mint: Pubkey,
    pub randomness: [u8; 32],
    pub random_index: u64,
    pub pool_size: u64,
}

#[event]
pub struct InventoryAssigned {
    pub nft_mint: Pubkey,
    pub inventory_id_hash: [u8; 32],
    pub batch_id: u64,
}

#[event]
pub struct PriceSet {
    pub inventory_id_hash: [u8; 32],
    pub price: u64,
    pub timestamp: i64,
    pub oracle: Pubkey,
}

#[event]
pub struct BuybackExecuted {
    pub nft_mint: Pubkey,
    pub inventory_id_hash: [u8; 32],
    pub price: u64,
    pub spread_fee: u64,
    pub payout: u64,
    pub buyer: Pubkey,
}

#[event]
pub struct TreasuryDeposit {
    pub amount: u64,
    pub depositor: Pubkey,
    pub new_balance: u64,
}

#[event]
pub struct BuybackToggled {
    pub enabled: bool,
    pub authority: Pubkey,
}

#[event]
pub struct OracleUpdated {
    pub old_oracle: Pubkey,
    pub new_oracle: Pubkey,
    pub authority: Pubkey,
}
