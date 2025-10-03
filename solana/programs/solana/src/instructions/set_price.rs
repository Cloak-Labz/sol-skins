use anchor_lang::prelude::*;

use crate::errors::ProgramError;
use crate::events::*;
use crate::states::*;
use crate::utils::*;

#[derive(Accounts)]
#[instruction(inventory_id_hash: [u8; 32])]
pub struct SetPriceSigned<'info> {
    #[account(
        seeds = [b"global"],
        bump = global.bump
    )]
    pub global: Account<'info, Global>,

    #[account(
        init_if_needed,
        payer = payer,
        seeds = [b"price", inventory_id_hash.as_ref()],
        bump,
        space = PriceStore::LEN
    )]
    pub price_store: Account<'info, PriceStore>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn set_price_signed_handler(
    ctx: Context<SetPriceSigned>,
    inventory_id_hash: [u8; 32],
    price: u64,
    timestamp: i64,
    signature: [u8; 64],
) -> Result<()> {
    let current_time = Clock::get()?.unix_timestamp;

    // Validate inventory hash
    validate_inventory_hash(&inventory_id_hash)?;

    // Validate timestamp (not too old, not in future)
    require!(
        timestamp > 0 && timestamp <= current_time && !is_price_stale(timestamp, current_time),
        ProgramError::PriceStale
    );

    // Validate price
    require!(price > 0, ProgramError::InvalidTimestamp);

    // Validate oracle is set
    let global = &ctx.accounts.global;
    require!(
        global.oracle_pubkey != Pubkey::default(),
        ProgramError::OracleNotSet
    );

    // Create message for signature verification
    let _message = create_price_message(&inventory_id_hash, price, timestamp);

    // TODO: Implement actual signature verification
    // For now, we'll do a basic check that signature is not all zeros
    require!(signature != [0u8; 64], ProgramError::InvalidSignature);

    // In production, verify signature using ed25519_verify syscall or similar
    // verify_oracle_signature(&message, &signature, &global.oracle_pubkey)?;

    let price_store = &mut ctx.accounts.price_store;
    let is_new_price = price_store.inventory_id_hash == [0u8; 32];

    price_store.inventory_id_hash = inventory_id_hash;
    price_store.price = price;
    price_store.timestamp = timestamp;
    price_store.oracle = global.oracle_pubkey;
    price_store.update_count = if is_new_price {
        1
    } else {
        price_store
            .update_count
            .checked_add(1)
            .ok_or(ProgramError::ArithmeticOverflow)?
    };
    price_store.bump = ctx.bumps.price_store;

    emit!(PriceSet {
        inventory_id_hash,
        price,
        timestamp,
        oracle: global.oracle_pubkey,
    });

    msg!(
        "Price set for inventory {}: {} USDC at timestamp {} (update #{})",
        hex::encode(inventory_id_hash),
        price,
        timestamp,
        price_store.update_count
    );

    Ok(())
}

// TODO: Implement actual signature verification
#[allow(dead_code)]
fn verify_oracle_signature(
    _message: &[u8; 32],
    _signature: &[u8; 64],
    _oracle_pubkey: &Pubkey,
) -> Result<()> {
    // This would use ed25519_verify syscall in production
    // For now, just return OK for development
    Ok(())
}

/// Helper function to convert bytes to hex string for logging
mod hex {
    pub fn encode(bytes: [u8; 32]) -> String {
        bytes
            .iter()
            .map(|b| format!("{:02x}", b))
            .collect::<Vec<String>>()
            .join("")
    }
}
