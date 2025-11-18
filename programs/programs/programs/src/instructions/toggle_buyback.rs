use anchor_lang::prelude::*;
use crate::state::BuyBackConfig;
use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct ToggleBuyback<'info> {
    #[account(
        mut,
        seeds = [b"buyback_config_v4"],
        bump = buyback_config.config_bump,
    )]
    pub buyback_config: Account<'info, BuyBackConfig>,
    
    pub authority: Signer<'info>,
}

impl<'info> ToggleBuyback<'info> {
    pub fn toggle(&mut self, enabled: bool) -> Result<()> {
        
        if self.authority.key() != self.buyback_config.authority { 
            return Err(ErrorCode::Unauthorized.into());
        }
        
        self.buyback_config.buyback_enable = enabled;
        
        msg!("✅ Buyback {}", if enabled { "enabled" } else { "disabled" });
        
        Ok(())
    }
}