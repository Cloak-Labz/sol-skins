use anchor_lang::prelude::*;

use crate::errors::SkinVaultError;
use crate::events::*;
use crate::states::*;
use crate::vrf::*;

#[derive(Accounts)]
pub struct OpenBox<'info> {
    #[account(
        seeds = [b"global"],
        bump = global.bump
    )]
    pub global: Account<'info, Global>,

    #[account(
        mut,
        seeds = [b"box", box_state.nft_mint.as_ref()],
        bump = box_state.bump,
        constraint = box_state.owner == owner.key() @ SkinVaultError::NotBoxOwner,
        constraint = !box_state.opened @ SkinVaultError::AlreadyOpened
    )]
    pub box_state: Account<'info, BoxState>,

    #[account(
        seeds = [b"batch", &box_state.batch_id.to_le_bytes()],
        bump = batch.bump
    )]
    pub batch: Account<'info, Batch>,

    #[account(
        init,
        payer = owner,
        seeds = [b"vrf_pending", box_state.nft_mint.as_ref()],
        bump,
        space = VrfPending::LEN
    )]
    pub vrf_pending: Account<'info, VrfPending>,

    #[account(mut)]
    pub owner: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn open_box_handler(
    ctx: Context<OpenBox>,
    pool_size: u64,
) -> Result<()> {
    // Check if program is paused
    require!(!ctx.accounts.global.paused, SkinVaultError::BuybackDisabled);
    
    require!(pool_size > 0, SkinVaultError::InvalidPoolSize);
    require!(
        pool_size <= ctx.accounts.batch.total_items,
        SkinVaultError::InvalidPoolSize
    );

    let current_time = Clock::get()?.unix_timestamp;
    let box_mint = ctx.accounts.box_state.nft_mint;
    
    // Create VRF seed
    let vrf_seed = create_vrf_seed(&box_mint, current_time);
    
    // Request VRF (using mock for now)
    let vrf_provider = MockVrf;
    let request_id = vrf_provider.request_randomness(&vrf_seed)?;

    // Store VRF request details
    let vrf_pending = &mut ctx.accounts.vrf_pending;
    vrf_pending.box_mint = box_mint;
    vrf_pending.request_id = request_id;
    vrf_pending.request_time = current_time;
    vrf_pending.pool_size = pool_size;
    vrf_pending.bump = ctx.bumps.vrf_pending;

    emit!(BoxOpenRequested {
        nft_mint: box_mint,
        owner: ctx.accounts.owner.key(),
        vrf_request_id: Some(request_id),
    });

    msg!(
        "Box open requested: {} by {} with VRF request ID: {}",
        box_mint,
        ctx.accounts.owner.key(),
        request_id
    );

    Ok(())
}
