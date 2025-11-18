use anchor_lang::prelude::*;

pub mod instructions;
pub mod state;
pub mod errors;

use instructions::*;

declare_id!("Gxe24iPJUAVuPCYye7qioNtk7UaJf9jVtQnfU2VzmjFJ");

#[program]
pub mod programs {
    use super::*;

    /// Initialize the buyback configuration (one-time setup)
    pub fn initialize_buyback(
        ctx: Context<Initialize>,
        collection_mint: Pubkey,
        min_treasury_balance: u64,
    ) -> Result<()> {
        ctx.accounts.init(collection_mint, min_treasury_balance, &ctx.bumps)
    }

    /// Execute a buyback: burn NFT and transfer USDC
    /// Backend calculates buyback_amount based on skin price
    pub fn execute_buyback(
        ctx: Context<ExecuteBuyback>,
        buyback_amount: u64,
    ) -> Result<()> {
        ctx.accounts.execute(buyback_amount)
    }

    /// Toggle buyback on/off (emergency pause)
    pub fn toggle_buyback(
        ctx: Context<ToggleBuyback>,
        enabled: bool,
    ) -> Result<()> {
        ctx.accounts.toggle(enabled)
    }
}