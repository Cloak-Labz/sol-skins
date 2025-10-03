use anchor_lang::prelude::*;

use crate::errors::ProgramError;
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
        init,
        payer = owner,
        seeds = [b"vrf_pending", owner.key().as_ref()],
        bump,
        space = VrfPending::LEN
    )]
    pub vrf_pending: Account<'info, VrfPending>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn open_box_handler(ctx: Context<OpenBox>, pool_size: u64) -> Result<()> {
    // Check if program is paused
    require!(!ctx.accounts.global.paused, ProgramError::BuybackDisabled);

    require!(pool_size > 0, ProgramError::InvalidPoolSize);
    require!(pool_size <= 100, ProgramError::InvalidPoolSize); // Max 100 skins in pool

    let current_time = Clock::get()?.unix_timestamp;
    let user_pubkey = ctx.accounts.owner.key();

    // Create VRF seed from user + timestamp
    let vrf_seed = create_vrf_seed(&user_pubkey, current_time);

    // Request VRF randomness
    let vrf_provider = MockVrf;
    let request_id = vrf_provider.request_randomness(&vrf_seed)?;

    // Store VRF request details
    ctx.accounts.vrf_pending.set_inner(VrfPending {
        box_mint: user_pubkey, // Use user pubkey as identifier
        request_id,
        request_time: current_time,
        pool_size,
        randomness: 0, // Will be set by oracle in vrf_callback()
        user: user_pubkey,
        bump: ctx.bumps.vrf_pending,
    });

    emit!(BoxOpenRequested {
        nft_mint: user_pubkey,
        owner: user_pubkey,
        vrf_request_id: Some(request_id),
    });

    msg!(
        "🎰 Mystery box opened by {} - VRF request ID: {}",
        user_pubkey,
        request_id
    );
    msg!("⏳ Waiting for oracle to provide randomness...");

    Ok(())
}
