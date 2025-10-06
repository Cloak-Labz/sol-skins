use anchor_lang::prelude::*;

/// Temporary state for pending VRF randomness requests
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

    /// VRF randomness result (0 if not yet fulfilled)
    pub randomness: u64,

    /// User who requested the VRF (for closing account)
    pub user: Pubkey,

    /// Bump seed for PDA
    pub bump: u8,
}

impl VrfPending {
    pub const LEN: usize = 8 + // discriminator
        32 + // box_mint
        8 +  // request_id
        8 +  // request_time
        8 +  // pool_size
        8 +  // randomness
        32 + // user
        1; // bump
}
