use anchor_lang::prelude::*;

use crate::errors::SkinVaultError;
use crate::events::*;
use crate::states::*;
use crate::utils::*;
use crate::vrf::*;

#[derive(Accounts)]
pub struct VrfCallback<'info> {
    #[account(
        seeds = [b"global"],
        bump = global.bump
    )]
    pub global: Account<'info, Global>,

    #[account(
        mut,
        seeds = [b"batch", batch.batch_id.to_le_bytes().as_ref()],
        bump = batch.bump
    )]
    pub batch: Account<'info, Batch>,

    #[account(
        mut,
        seeds = [b"box", box_state.nft_mint.as_ref()],
        bump = box_state.bump,
        constraint = !box_state.opened @ SkinVaultError::AlreadyOpened
    )]
    pub box_state: Account<'info, BoxState>,

    #[account(
        mut,
        seeds = [b"vrf_pending", box_state.nft_mint.as_ref()],
        bump = vrf_pending.bump,
        constraint = vrf_pending.box_mint == box_state.nft_mint @ SkinVaultError::VrfNotFulfilled,
        close = box_owner
    )]
    pub vrf_pending: Account<'info, VrfPending>,

    /// Only oracle or authority can provide VRF results
    #[account(
        constraint = vrf_authority.key() == global.oracle_pubkey 
                  || vrf_authority.key() == global.authority
        @ SkinVaultError::Unauthorized
    )]
    pub vrf_authority: Signer<'info>,

    /// CHECK: Box owner who will receive the refunded rent
    #[account(
        mut,
        constraint = box_owner.key() == box_state.owner @ SkinVaultError::NotBoxOwner
    )]
    pub box_owner: AccountInfo<'info>,
}

pub fn vrf_callback_handler(
    ctx: Context<VrfCallback>,
    request_id: u64,
    randomness: [u8; 32],
) -> Result<()> {
    let current_time = Clock::get()?.unix_timestamp;

    // Verify this is the correct VRF request
    require!(
        ctx.accounts.vrf_pending.request_id == request_id,
        SkinVaultError::VrfNotFulfilled
    );

    // Validate randomness
    validate_vrf_randomness(&randomness)?;

    let box_state = &mut ctx.accounts.box_state;
    let batch = &mut ctx.accounts.batch;
    let vrf_pending = &ctx.accounts.vrf_pending;

    // Generate deterministic index from randomness
    let random_index = generate_random_index(
        &randomness,
        &box_state.nft_mint,
        box_state.batch_id,
        vrf_pending.pool_size,
    )?;

    // Update box state
    box_state.opened = true;
    box_state.open_time = current_time;
    box_state.random_index = random_index;

    // Update batch statistics
    batch.boxes_opened = batch
        .boxes_opened
        .checked_add(1)
        .ok_or(SkinVaultError::ArithmeticOverflow)?;

    emit!(BoxOpened {
        nft_mint: box_state.nft_mint,
        randomness,
        random_index,
        pool_size: vrf_pending.pool_size,
    });

    msg!(
        "Box opened: {} with random index: {} (pool size: {})",
        box_state.nft_mint,
        random_index,
        vrf_pending.pool_size
    );

    Ok(())
}
