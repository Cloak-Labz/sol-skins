use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Burn, Transfer};
use crate::state::BuyBackConfig;
use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct ExecuteBuyback<'info> {
    #[account(
        mut,
        seeds = [b"buyback_config_v4"],
        bump = buyback_config.config_bump,
    )]
    pub buyback_config: Account<'info, BuyBackConfig>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(mut)]
    pub treasury: Signer<'info>,

    #[account(
        mut,
        constraint = treasury_usdc_account.owner == treasury.key() @ ErrorCode::InvalidTreasuryTokenAccount,
        constraint = treasury_usdc_account.mint == usdc_mint.key() @ ErrorCode::InvalidUsdcMint,
        constraint = treasury_usdc_account.key() == buyback_config.treasury_token_account @ ErrorCode::InvalidTreasuryTokenAccount,
    )]
    pub treasury_usdc_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = user_usdc_account.owner == user.key() @ ErrorCode::InvalidUserTokenAccount,
        constraint = user_usdc_account.mint == usdc_mint.key() @ ErrorCode::InvalidUserTokenAccount,
    )]
    pub user_usdc_account: Account<'info, TokenAccount>,

    #[account(
        constraint = usdc_mint.key() == buyback_config.usdc_mint @ ErrorCode::InvalidUsdcMint,
    )]
    pub usdc_mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub nft_mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub user_nft_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
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
        if self.treasury_usdc_account.amount < buyback_amount {
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
        
        // Transfer USDC from treasury token account to user token account
        token::transfer(
            CpiContext::new(
                self.token_program.to_account_info(),
                Transfer {
                    from: self.treasury_usdc_account.to_account_info(),
                    to: self.user_usdc_account.to_account_info(),
                    authority: self.treasury.to_account_info(),
                },
            ),
            buyback_amount,
        )?;
     
        Ok(())
    }
}