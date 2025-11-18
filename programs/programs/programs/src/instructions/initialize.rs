use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, TokenAccount};
use crate::state::BuyBackConfig;
use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = BuyBackConfig::LEN,
        seeds = [b"buyback_config_v4"],
        bump,
    )]
    pub buyback_config: Account<'info, BuyBackConfig>,

    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK: Treasury wallet
    pub treasury: AccountInfo<'info>,

    pub usdc_mint: Account<'info, Mint>,

    #[account(mut)]
    pub treasury_usdc_account: Account<'info, TokenAccount>,

    /// CHECK: Collection mint
    pub collection_mint: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

impl<'info> Initialize<'info> {
    pub fn init(
        &mut self,
        collection_mint: Pubkey,
        min_treasury_balance: u64,
        bumps: &InitializeBumps,
    ) -> Result<()> {

        // require at least 10 USDC (6 decimals)
        require!(
            min_treasury_balance >= 10_000_000,
            ErrorCode::InvalidMinBalance
        );

        // Treasury USDC account must be owned by the treasury authority
        require!(
            self.treasury_usdc_account.owner == self.treasury.key(),
            ErrorCode::InvalidTreasuryTokenAccount
        );

        // Treasury USDC account must use the provided mint
        require!(
            self.treasury_usdc_account.mint == self.usdc_mint.key(),
            ErrorCode::InvalidUsdcMint
        );

        // Ensure treasury USDC account currently meets reserve
        require!(
            self.treasury_usdc_account.amount >= min_treasury_balance,
            ErrorCode::InsufficientTreasuryBalance
        );
        
        self.buyback_config.set_inner(BuyBackConfig {
            authority: self.authority.key(),
            treasury: self.treasury.key(),
            treasury_token_account: self.treasury_usdc_account.key(),
            usdc_mint: self.usdc_mint.key(),
            collection_mint,
            buyback_enable: true,
            min_treasury_balance,
            config_bump: bumps.buyback_config,
        });
         
        Ok(())
    }
}