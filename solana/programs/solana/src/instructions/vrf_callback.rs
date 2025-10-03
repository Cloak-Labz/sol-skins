use anchor_lang::prelude::*;

use crate::errors::ProgramError;
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
        seeds = [b"vrf_pending", vrf_pending.user.as_ref()],
        bump = vrf_pending.bump
    )]
    pub vrf_pending: Account<'info, VrfPending>,

    /// Only oracle can provide VRF results
    #[account(
        constraint = vrf_authority.key() == global.oracle_pubkey
        @ ProgramError::Unauthorized
    )]
    pub vrf_authority: Signer<'info>,
}

pub fn vrf_callback_handler(
    ctx: Context<VrfCallback>,
    request_id: u64,
    randomness: [u8; 32],
) -> Result<()> {
    // Validate randomness
    validate_vrf_randomness(&randomness)?;

    let vrf_pending = &mut ctx.accounts.vrf_pending;

    // Verify request ID matches
    require!(
        vrf_pending.request_id == request_id,
        ProgramError::VrfNotFulfilled
    );

    // Convert randomness bytes to u64 for storage
    let randomness_u64 = u64::from_le_bytes([
        randomness[0],
        randomness[1],
        randomness[2],
        randomness[3],
        randomness[4],
        randomness[5],
        randomness[6],
        randomness[7],
    ]);

    // Store randomness in VRF pending for later claim
    vrf_pending.randomness = randomness_u64;

    // Generate deterministic index from randomness
    let random_index = generate_random_index(
        &randomness,
        &vrf_pending.user,
        0, // No batch_id needed
        vrf_pending.pool_size,
    )?;

    emit!(BoxOpened {
        nft_mint: vrf_pending.user,
        randomness,
        random_index,
        pool_size: vrf_pending.pool_size,
    });

    Ok(())
}
