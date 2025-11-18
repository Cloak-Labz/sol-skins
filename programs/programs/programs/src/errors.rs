use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Buyback is currently disabled")]
    BuybackDisabled,
    
    #[msg("Treasury has insufficient balance")]
    InsufficientTreasuryBalance,
    
    #[msg("Invalid buyback amount")]
    InvalidAmount,
    
    #[msg("Invalid treasury account")]
    InvalidTreasury,

    #[msg("Invalid treasury USDC token account")]
    InvalidTreasuryTokenAccount,

    #[msg("Invalid user USDC token account")]
    InvalidUserTokenAccount,
    
    #[msg("Invalid USDC mint provided")]
    InvalidUsdcMint,
    
    #[msg("Invalid collection mint")]
    InvalidCollectionMint,
    
    #[msg("User does not own the NFT")]
    InvalidNFTOwner,
    
    #[msg("Token account mint does not match NFT mint")]
    InvalidNFTMint,
    
    #[msg("Invalid NFT amount (must be 1)")]
    InvalidNFTAmount,
    
    #[msg("Math operation overflow")]
    MathOverflow,
    
    #[msg("Minimum treasury balance too high")]
    InvalidMinBalance,
    
    #[msg("Unauthorized: Only authority can perform this action")]
    Unauthorized,
}