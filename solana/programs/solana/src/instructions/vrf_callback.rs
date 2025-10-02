use anchor_lang::prelude::*;

use crate::errors::SkinVaultError;
use crate::events::*;
use crate::states::*;
use crate::utils::*;
use crate::vrf::*;

// Switchboard VRF integration will be added when dependencies are resolved

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

    /// Only oracle can provide VRF results (Switchboard)
    #[account(
        constraint = vrf_authority.key() == global.oracle_pubkey
        @ SkinVaultError::Unauthorized
    )]
    pub vrf_authority: Signer<'info>,

    // Switchboard VRF account will be added when dependencies are resolved
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

    // Get randomness from provided parameter (Switchboard integration will be added later)
    let final_randomness = randomness;

    // Validate randomness
    validate_vrf_randomness(&final_randomness)?;

    let box_state = &mut ctx.accounts.box_state;
    let batch = &mut ctx.accounts.batch;
    let vrf_pending = &mut ctx.accounts.vrf_pending;

    // Convert randomness bytes to u64 for storage
    let randomness_u64 = u64::from_le_bytes([
        final_randomness[0],
        final_randomness[1],
        final_randomness[2],
        final_randomness[3],
        final_randomness[4],
        final_randomness[5],
        final_randomness[6],
        final_randomness[7],
    ]);

    // Store randomness in VRF pending for later claim
    vrf_pending.randomness = randomness_u64;

    // Generate deterministic index from randomness
    let random_index = generate_random_index(
        &final_randomness,
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
        randomness: final_randomness,
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
