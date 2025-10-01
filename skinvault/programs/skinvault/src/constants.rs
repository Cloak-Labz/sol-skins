pub const TREASURY_SEED: &[u8] = b"treasury";
pub const GLOBAL_SEED: &[u8] = b"skinvault";
pub const BATCH_SEED: &[u8] = b"batch";
pub const BOX_SEED: &[u8] = b"box";
pub const PRICE_SEED: &[u8] = b"price";
pub const VRF_PENDING_SEED: &[u8] = b"vrf_pending";

// USDC has 6 decimal places
pub const USDC_DECIMALS: u8 = 6;

// Maximum age for price data (5 minutes)
pub const MAX_PRICE_AGE_SECONDS: i64 = 300;

// Minimum treasury balance (in USDC base units)
pub const DEFAULT_MIN_TREASURY_BALANCE: u64 = 1000 * 1_000_000; // 1000 USDC

// Buyback spread fee (basis points, 100 = 1%)
pub const BUYBACK_SPREAD_BPS: u64 = 100;

// Maximum merkle proof depth
pub const MAX_MERKLE_PROOF_DEPTH: usize = 20;
