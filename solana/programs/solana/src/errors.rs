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

    #[msg("Treasury has insufficient funds")]
    TreasuryInsufficient,

    #[msg("Buyback is currently disabled")]
    BuybackDisabled,

    #[msg("Invalid pool size for randomness")]
    InvalidPoolSize,

    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,

    #[msg("Merkle proof depth exceeds maximum allowed")]
    MerkleProofTooDeep,

    #[msg("Inventory item already assigned")]
    InventoryAlreadyAssigned,

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

    #[msg("Invalid Core program ID")]
    InvalidCoreProgram,

    #[msg("CPI call failed")]
    CpiFailed,

    #[msg("Invalid payment amount")]
    InvalidPaymentAmount,
}
