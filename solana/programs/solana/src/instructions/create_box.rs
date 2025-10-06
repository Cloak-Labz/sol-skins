use anchor_lang::prelude::*;

use crate::errors::SkinVaultError;
use crate::states::*;

#[derive(Accounts)]
pub struct CreateBox<'info> {
    #[account(
        seeds = [b"global"],
        bump = global.bump
    )]
    pub global: Account<'info, Global>,

    #[account(
        init,
        payer = owner,
        seeds = [b"box", box_asset.key().as_ref()],
        bump,
        space = BoxState::LEN
    )]
    pub box_state: Account<'info, BoxState>,

    #[account(mut)]
    pub owner: Signer<'info>,

    /// CHECK: This is the box asset address (Core NFT)
    pub box_asset: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn create_box_handler(ctx: Context<CreateBox>, batch_id: u64) -> Result<()> {
    let box_state = &mut ctx.accounts.box_state;
    let current_time = Clock::get()?.unix_timestamp;

    // Initialize box state
    box_state.owner = ctx.accounts.owner.key();
    box_state.batch_id = batch_id;
    box_state.opened = false;
    box_state.assigned_inventory = [0u8; 32];
    box_state.asset = ctx.accounts.box_asset.key();
    box_state.mint_time = current_time;
    box_state.open_time = 0;
    box_state.random_index = 0;
    box_state.redeemed = false;
    box_state.redeem_time = 0;
    box_state.bump = ctx.bumps.box_state;

    msg!(
        "Box created: {} for owner: {}",
        box_state.asset,
        box_state.owner
    );

    Ok(())
}
