use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Burn};
use crate::state::BuyBackConfig;
use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct ExecuteBuyback<'info> {
    #[account(
        mut,
        seeds = [b"buyback_config"],
        bump = buyback_config.config_bump,
    )]
    pub buyback_config: Account<'info, BuyBackConfig>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    /// CHECK: Treasury wallet
    #[account(mut)]
    pub treasury: Signer<'info>,
    
    #[account(mut)]
    pub nft_mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub user_nft_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,

    pub system_program: Program<'info, System>,
}

impl<'info> ExecuteBuyback<'info> {
    
    pub fn execute(&mut self, buyback_amount: u64) -> Result<()> {
        
        // Check 1: Buyback enabled
        if !self.buyback_config.buyback_enable {
            return Err(ErrorCode::BuybackDisabled.into());
        }
        
        // Check 2: Correct treasury
        if self.treasury.key() != self.buyback_config.treasury {
            return Err(ErrorCode::InvalidTreasury.into());
        }
        
        // Check 3: User owns NFT
        if self.user_nft_account.owner != self.user.key() {
            return Err(ErrorCode::InvalidNFTOwner.into());
        }
        
        // Check 4: Correct mint
        if self.user_nft_account.mint != self.nft_mint.key() {
            return Err(ErrorCode::InvalidNFTMint.into());
        }
        
        // Check 5: Has 1 NFT
        if self.user_nft_account.amount != 1 {
            return Err(ErrorCode::InvalidNFTAmount.into());
        }
        
        // Check 6: Treasury has funds
        if self.treasury.lamports() < buyback_amount {
            return Err(ErrorCode::InsufficientTreasuryBalance.into());
        }
        
        // Burn NFT
        token::burn(
            CpiContext::new(
                self.token_program.to_account_info(),
                Burn {
                    mint: self.nft_mint.to_account_info(),
                    from: self.user_nft_account.to_account_info(),
                    authority: self.user.to_account_info(),
                },
            ),
            1,
        )?;
        
        // Transfer SOL from treasury to user using system program
        system_program::transfer(
            CpiContext::new(
                self.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: self.treasury.to_account_info(),
                    to: self.user.to_account_info(),
                },
            ),
            buyback_amount,
        )?;
     
        Ok(())
    }
}