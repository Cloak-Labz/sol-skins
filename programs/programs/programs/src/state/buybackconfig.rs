use anchor_lang::prelude::*;

#[account]
#[derive(Debug, Default)]
pub struct BuyBackConfig {
    pub authority: Pubkey,              // Admin who can update config
    pub treasury: Pubkey,                // Wallet that pays buybacks
    pub treasury_token_account: Pubkey,  // USDC token account owned by treasury
    pub usdc_mint: Pubkey,               // USDC mint used for payouts
    pub collection_mint: Pubkey,         // Your NFT collection mint
    pub buyback_enable: bool,            // Emergency pause switch
    pub min_treasury_balance: u64,       // Safety reserve (in USDC smallest units)
    pub config_bump: u8,                 // PDA bump
}

impl BuyBackConfig {
    pub const LEN: usize = 8 // discriminator
    + 32 // authority
    + 32 // treasury
    + 32 // treasury token account
    + 32 // usdc mint
    + 32 // collection mint
    + 1 // buyback enable
    + 8 // min treasury balance
    + 1; // config bump
}