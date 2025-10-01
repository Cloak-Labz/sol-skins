use anchor_lang::prelude::*;

pub mod constants;
pub mod cpi;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod merkle;
pub mod state;
pub mod utils;
pub mod vrf;

pub use constants::*;
pub use errors::*;
pub use events::*;
pub use instructions::*;
pub use state::*;

declare_id!("FuXM6BsXE54CAXaJLYRL91io2bgUMBFMWVDxTHkbaP9F");

#[program]
pub mod skinvault {
    use super::*;

    /// Initialize the SkinVault program
    pub fn initialize(ctx: Context<Initialize>, oracle_pubkey: Pubkey) -> Result<()> {
        instructions::admin::initialize_handler(ctx, oracle_pubkey)
    }

    /// Publish a Merkle root for a new batch of inventory
    pub fn publish_merkle_root(
        ctx: Context<PublishMerkleRoot>,
        batch_id: u64,
        merkle_root: [u8; 32],
        snapshot_time: i64,
        total_items: u64,
    ) -> Result<()> {
        instructions::publish_root::publish_merkle_root_handler(
            ctx,
            batch_id,
            merkle_root,
            snapshot_time,
            total_items,
        )
    }

    /// Mint a new loot box NFT
    pub fn mint_box(ctx: Context<MintBox>, batch_id: u64, metadata_uri: String) -> Result<()> {
        instructions::mint_box::mint_box_handler(ctx, batch_id, metadata_uri)
    }

    /// Open a loot box and request VRF
    pub fn open_box(ctx: Context<OpenBox>, pool_size: u64) -> Result<()> {
        instructions::open_box::open_box_handler(ctx, pool_size)
    }

    /// VRF callback to provide randomness for box opening
    pub fn vrf_callback(
        ctx: Context<VrfCallback>,
        request_id: u64,
        randomness: [u8; 32],
    ) -> Result<()> {
        instructions::vrf_callback::vrf_callback_handler(ctx, request_id, randomness)
    }

    /// Assign an inventory item to an opened box
    pub fn assign(
        ctx: Context<Assign>,
        inventory_id_hash: [u8; 32],
        merkle_proof: Vec<[u8; 32]>,
        backend_signature: Option<[u8; 64]>,
    ) -> Result<()> {
        instructions::assign::assign_handler(
            ctx,
            inventory_id_hash,
            merkle_proof,
            backend_signature,
        )
    }

    /// Set price for an inventory item (oracle signed)
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

    /// Sell back an assigned item for USDC
    pub fn sell_back(ctx: Context<SellBack>, min_price: u64) -> Result<()> {
        instructions::sell_back::sell_back_handler(ctx, min_price)
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
}
