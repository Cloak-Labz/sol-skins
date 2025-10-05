use crate::errors::SkinVaultError;
use anchor_lang::prelude::*;

/// VRF trait for different randomness providers
pub trait VrfProvider {
    fn request_randomness(&self, seed: &[u8]) -> Result<u64>;
    fn verify_and_consume_randomness(&self, request_id: u64) -> Result<[u8; 32]>;
}

/// Mock VRF for testing and development
pub struct MockVrf;

impl VrfProvider for MockVrf {
    fn request_randomness(&self, seed: &[u8]) -> Result<u64> {
        // In a real implementation, this would interact with the VRF service
        // For now, we'll use a simple hash of the seed as a request ID
        use anchor_lang::solana_program::keccak;
        let hash = keccak::hash(seed);
        Ok(u64::from_le_bytes(hash.0[0..8].try_into().unwrap()))
    }

    fn verify_and_consume_randomness(&self, request_id: u64) -> Result<[u8; 32]> {
        // Mock implementation: generate deterministic "randomness" from request ID
        // WARNING: This is NOT secure randomness! Only for testing!
        use anchor_lang::solana_program::keccak;
        let seed = request_id.to_le_bytes();
        Ok(keccak::hash(&seed).0)
    }
}

/// Switchboard VRF implementation (placeholder for future integration)
#[cfg(feature = "vrf_switchboard")]
pub struct SwitchboardVrf;

#[cfg(feature = "vrf_switchboard")]
impl SwitchboardVrf {
    /// Request randomness from Switchboard VRF
    /// This is a placeholder implementation that will be replaced with actual Switchboard integration
    pub fn request_randomness<'info>(
        _ctx: &Context<'_, VrfRequestRandomness<'info>>,
        _params: VrfRequestRandomnessParams,
    ) -> Result<()> {
        // TODO: Implement actual Switchboard VRF integration
        // This would involve creating a VRF request account and calling the Switchboard program
        Err(SkinVaultError::VrfNotFulfilled.into())
    }

    /// Set callback for VRF fulfillment
    pub fn set_callback<'info>(
        _ctx: &Context<'_, VrfSetCallback<'info>>,
        _params: VrfSetCallbackParams,
    ) -> Result<()> {
        // TODO: Implement actual Switchboard callback setting
        Err(SkinVaultError::VrfNotFulfilled.into())
    }

    /// Verify VRF proof and consume randomness
    pub fn prove_and_verify<'info>(
        _ctx: &Context<'_, VrfProveAndVerify<'info>>,
        _params: VrfProveAndVerifyParams,
    ) -> Result<()> {
        // TODO: Implement actual Switchboard VRF verification
        Err(SkinVaultError::VrfNotFulfilled.into())
    }

    /// Extract randomness from VRF account
    pub fn get_randomness(_vrf_account: &AccountInfo) -> Result<[u8; 32]> {
        // TODO: Implement actual Switchboard randomness extraction
        Err(SkinVaultError::VrfNotFulfilled.into())
    }
}

#[cfg(feature = "vrf_switchboard")]
impl VrfProvider for SwitchboardVrf {
    fn request_randomness(&self, _seed: &[u8]) -> Result<u64> {
        // This is now handled by the instruction context
        // Return a placeholder request ID
        Ok(0)
    }

    fn verify_and_consume_randomness(&self, _request_id: u64) -> Result<[u8; 32]> {
        // This is now handled by the instruction context
        // Return placeholder randomness
        Ok([0u8; 32])
    }
}

/// Create a VRF seed from box mint and timestamp
pub fn create_vrf_seed(box_mint: &Pubkey, timestamp: i64) -> Vec<u8> {
    let mut seed = Vec::with_capacity(32 + 8);
    seed.extend_from_slice(box_mint.as_ref());
    seed.extend_from_slice(&timestamp.to_le_bytes());
    seed
}

/// Validate VRF randomness (basic sanity checks)
pub fn validate_vrf_randomness(randomness: &[u8; 32]) -> Result<()> {
    // Check that randomness is not all zeros (invalid)
    if randomness.iter().all(|&b| b == 0) {
        return Err(SkinVaultError::VrfNotFulfilled.into());
    }

    // Check that randomness is not all 0xFF (suspicious)
    if randomness.iter().all(|&b| b == 0xFF) {
        return Err(SkinVaultError::VrfNotFulfilled.into());
    }

    Ok(())
}

/// Get the default VRF provider based on features
pub fn get_default_vrf_provider() -> Box<dyn VrfProvider> {
    #[cfg(feature = "vrf_switchboard")]
    {
        Box::new(SwitchboardVrf)
    }

    #[cfg(not(feature = "vrf_switchboard"))]
    {
        Box::new(MockVrf)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mock_vrf() {
        let vrf = MockVrf;
        let seed = b"test_seed";

        // Request should return a deterministic ID
        let request_id = vrf.request_randomness(seed).unwrap();
        assert!(request_id > 0);

        // Same seed should produce same request ID
        let request_id2 = vrf.request_randomness(seed).unwrap();
        assert_eq!(request_id, request_id2);
    }

    #[test]
    fn test_vrf_seed_creation() {
        let mint = Pubkey::new_unique();
        let timestamp = 1234567890i64;

        let seed = create_vrf_seed(&mint, timestamp);
        assert_eq!(seed.len(), 40); // 32 bytes mint + 8 bytes timestamp

        // Same inputs should produce same seed
        let seed2 = create_vrf_seed(&mint, timestamp);
        assert_eq!(seed, seed2);
    }

    #[test]
    fn test_validate_vrf_randomness() {
        // Valid randomness
        let valid_randomness = [42u8; 32];
        assert!(validate_vrf_randomness(&valid_randomness).is_ok());

        // Invalid: all zeros
        let zero_randomness = [0u8; 32];
        assert!(validate_vrf_randomness(&zero_randomness).is_err());

        // Invalid: all 0xFF
        let max_randomness = [0xFFu8; 32];
        assert!(validate_vrf_randomness(&max_randomness).is_err());
    }
}
