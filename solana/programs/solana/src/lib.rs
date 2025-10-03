use anchor_lang::prelude::*;

pub mod constants;
pub mod cpi;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod merkle;
pub mod states;
pub mod utils;
pub mod vrf;

pub use constants::*;
pub use errors::*;
pub use events::*;
pub use instructions::*;
pub use states::*;

declare_id!("4zbVYaEgUHfAb4ojYXYs2T7US9qkiDLaG1uzEWy2cDjZ");

#[program]
pub mod skinvault {
    use super::*;

    /// Initialize the SkinVault claw machine
    pub fn initialize(ctx: Context<Initialize>, oracle_pubkey: Pubkey) -> Result<()> {
        instructions::admin::initialize_handler(ctx, oracle_pubkey)
    }

    /// Step 1: Open a mystery box (request VRF randomness)
    pub fn open_box(ctx: Context<OpenBox>, pool_size: u64) -> Result<()> {
        instructions::open_box::open_box_handler(ctx, pool_size)
    }

    /// Step 2: VRF oracle provides randomness (oracle-only)
    pub fn vrf_callback(
        ctx: Context<VrfCallback>,
        request_id: u64,
        randomness: [u8; 32],
    ) -> Result<()> {
        instructions::vrf_callback::vrf_callback_handler(ctx, request_id, randomness)
    }

    /// Step 3: Reveal and mint Core NFT with determined skin
    pub fn reveal_and_claim(ctx: Context<RevealAndClaim>) -> Result<()> {
        instructions::reveal_and_claim::reveal_and_claim_handler(ctx)
    }

    /// Step 4: Sell back NFT for USDC (Steam redemption)
    pub fn sell_back(ctx: Context<SellBack>, min_price: u64) -> Result<()> {
        instructions::sell_back::sell_back_handler(ctx, min_price)
    }

    /// Set price for a skin (oracle-signed, for buyback calculation)
    pub fn set_price_signed(
        ctx: Context<SetPriceSigned>,
        inventory_id_hash: [u8; 32],
        price: u64,
        timestamp: i64,
        signature: [u8; 64],
    ) -> Result<()> {
        instructions::set_price::set_price_signed_handler(
            ctx,
            inventory_id_hash,
            price,
            timestamp,
            signature,
        )
    }

    // --------------------
    // ADMIN FUNCTIONS
    // --------------------

    /// Set a new oracle public key
    pub fn set_oracle(ctx: Context<SetOracle>, new_oracle_pubkey: Pubkey) -> Result<()> {
        instructions::admin::set_oracle_handler(ctx, new_oracle_pubkey)
    }

    /// Toggle buyback functionality on/off
    pub fn toggle_buyback(ctx: Context<ToggleBuyback>, enabled: bool) -> Result<()> {
        instructions::admin::toggle_buyback_handler(ctx, enabled)
    }

    /// Set minimum treasury balance for circuit breaker
    pub fn set_min_treasury_balance(
        ctx: Context<SetMinTreasuryBalance>,
        amount: u64,
    ) -> Result<()> {
        instructions::admin::set_min_treasury_balance_handler(ctx, amount)
    }

    /// Deposit USDC into the treasury
    pub fn deposit_treasury(ctx: Context<DepositTreasury>, amount: u64) -> Result<()> {
        instructions::admin::deposit_treasury_handler(ctx, amount)
    }

    /// Withdraw USDC from the treasury (authority only)
    pub fn withdraw_treasury(ctx: Context<WithdrawTreasury>, amount: u64) -> Result<()> {
        instructions::admin::withdraw_treasury_handler(ctx, amount)
    }

    /// Emergency pause/unpause all user operations
    pub fn emergency_pause(ctx: Context<EmergencyPause>, paused: bool) -> Result<()> {
        instructions::admin::emergency_pause_handler(ctx, paused)
    }

    /// Initiate authority transfer (step 1 of 2)
    pub fn initiate_authority_transfer(
        ctx: Context<EmergencyPause>,
        new_authority: Pubkey,
    ) -> Result<()> {
        instructions::admin::initiate_authority_transfer_handler(ctx, new_authority)
    }

    /// Accept authority transfer (step 2 of 2)
    pub fn accept_authority(ctx: Context<AcceptAuthority>) -> Result<()> {
        instructions::admin::accept_authority_handler(ctx)
    }
}
