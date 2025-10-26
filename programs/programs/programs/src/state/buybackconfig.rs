use anchor_lang::prelude::*;

#[account]
#[derive(Debug, Default)]
pub struct BuyBackConfig {
    pub authority: Pubkey,              // Admin who can update config
    pub treasury: Pubkey,                // Wallet that pays buybacks
    pub collection_mint: Pubkey,         // Your NFT collection mint
    pub buyback_enable: bool,            // Emergency pause switch
    pub min_treasury_balance: u64,       // Safety reserve (e.g., 1 SOL)
    pub config_bump: u8,                 // PDA bump
}

impl BuyBackConfig {
    pub const LEN: usize = 8 // discriminator
    + 32 // authority
    + 32 // treasury
    + 32 // collection mint
    + 1 // buyback enable
    + 8 // min treasury balance
    + 1; // config bump
}