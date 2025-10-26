use anchor_lang::prelude::*;
use crate::state::BuyBackConfig;
use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = BuyBackConfig::LEN,
        seeds = [b"buyback_config"],
        bump,
    )]
    pub buyback_config: Account<'info, BuyBackConfig>,

    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK: Treasury wallet
    pub treasury: AccountInfo<'info>,

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

        if min_treasury_balance < 10_000_000_000 { // min 10 SOL
            msg!("Error: Min treasury balance too low");
            return Err(ErrorCode::InvalidMinBalance.into());
        }
        
        self.buyback_config.set_inner(BuyBackConfig {
            authority: self.authority.key(),
            treasury: self.treasury.key(),
            collection_mint,
            buyback_enable: true,
            min_treasury_balance,
            config_bump: bumps.buyback_config,
        });
         
        Ok(())
    }
}