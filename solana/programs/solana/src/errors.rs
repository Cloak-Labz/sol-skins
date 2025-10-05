use anchor_lang::prelude::*;

#[error_code]
pub enum SkinVaultError {
    #[msg("Unauthorized access")]
    Unauthorized,

    #[msg("Invalid Merkle proof provided")]
    InvalidMerkleProof,

    #[msg("VRF request not fulfilled or invalid")]
    VrfNotFulfilled,

    #[msg("Box has not been opened yet")]
    NotOpenedYet,

    #[msg("Box has already been opened")]
    AlreadyOpened,

    #[msg("Price data is stale or missing")]
    PriceStale,

    #[msg("Treasury has insufficient funds")]
    TreasuryInsufficient,

    #[msg("Buyback is currently disabled")]
    BuybackDisabled,

    #[msg("Oracle public key not set")]
    OracleNotSet,

    #[msg("Invalid pool size for randomness")]
    InvalidPoolSize,

    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,

    #[msg("Invalid signature format")]
    InvalidSignature,

    #[msg("Merkle proof depth exceeds maximum allowed")]
    MerkleProofTooDeep,

    #[msg("Inventory item already assigned")]
    InventoryAlreadyAssigned,

    #[msg("Invalid timestamp")]
    InvalidTimestamp,

    #[msg("Price oracle signature verification failed")]
    OracleSignatureInvalid,

    #[msg("Box is not owned by the caller")]
    NotBoxOwner,

    #[msg("Invalid batch ID")]
    InvalidBatchId,

    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,

    #[msg("Invalid Candy Machine program ID")]
    InvalidCandyMachineProgram,

    #[msg("Invalid Token Metadata program ID")]
    InvalidMetadataProgram,

    #[msg("Invalid Candy Machine address")]
    InvalidCandyMachine,

    #[msg("Invalid metadata URI or index")]
    InvalidMetadata,
}
