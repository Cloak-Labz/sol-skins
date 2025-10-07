use anchor_lang::prelude::*;

/// Global program state - singleton PDA with fixed seed "global"
#[account]
pub struct Global {
    /// Authority that can perform admin operations
    pub authority: Pubkey,

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

    /// Emergency pause flag (stops all user operations)
    pub paused: bool,

    /// Pending authority for 2-step transfer
    pub pending_authority: Option<Pubkey>,

    /// Bump seed for PDA
    pub bump: u8,
}

impl Global {
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        32 + // usdc_mint
        1 +  // buyback_enabled
        8 +  // min_treasury_balance
        8 +  // current_batch
        8 +  // total_boxes_minted
        8 +  // total_buybacks
        8 +  // total_buyback_volume
        1 +  // paused
        33 + // pending_authority (Option<Pubkey>)
        1; // bump
}
