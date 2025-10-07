use crate::constants::*;
use crate::errors::SkinVaultError;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::keccak;

/// Calculate spread fee for buyback
pub fn calculate_buyback_payout(price: u64) -> Result<u64> {
    let spread_fee = price
        .checked_mul(BUYBACK_SPREAD_BPS)
        .ok_or(ProgramError::ArithmeticOverflow)?
        .checked_div(10000)
        .ok_or(ProgramError::ArithmeticOverflow)?;

    price
        .checked_sub(spread_fee)
        .ok_or(ProgramError::ArithmeticOverflow.into())
}

/// Generate deterministic random index from randomness and context
pub fn generate_random_index(
    randomness: &[u8; 32],
    nft_mint: &Pubkey,
    batch_id: u64,
    pool_size: u64,
) -> Result<u64> {
    require!(pool_size > 0, SkinVaultError::InvalidPoolSize);

    let mut data = Vec::with_capacity(32 + 32 + 8);
    data.extend_from_slice(randomness);
    data.extend_from_slice(nft_mint.as_ref());
    data.extend_from_slice(&batch_id.to_le_bytes());

    let hash = keccak::hash(&data);
    let index = u64::from_le_bytes(hash.0[0..8].try_into().unwrap()) % pool_size;

    Ok(index)
}

/// Validate inventory ID hash format
pub fn validate_inventory_hash(hash: &[u8; 32]) -> Result<()> {
    // Check that it's not all zeros (invalid inventory)
    if hash.iter().all(|&b| b == 0) {
        return Err(SkinVaultError::InvalidBatchId.into());
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_buyback_payout() {
        // Test normal case: 1000 USDC with 1% spread
        let result = calculate_buyback_payout(1000 * 1_000_000).unwrap();
        assert_eq!(result, 990 * 1_000_000);

        // Test edge case: very small amount
        let result = calculate_buyback_payout(1000).unwrap();
        assert_eq!(result, 990);
    }

    #[test]
    fn test_generate_random_index() {
        let randomness = [1u8; 32];
        let mint = Pubkey::new_unique();
        let batch_id = 123u64;
        let pool_size = 1000u64;

        let index = generate_random_index(&randomness, &mint, batch_id, pool_size).unwrap();
        assert!(index < pool_size);

        // Same inputs should produce same result
        let index2 = generate_random_index(&randomness, &mint, batch_id, pool_size).unwrap();
        assert_eq!(index, index2);
    }
}
