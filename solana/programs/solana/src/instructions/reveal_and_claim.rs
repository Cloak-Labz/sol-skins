use crate::errors::SkinVaultError;
use crate::states::{Global, VrfPending};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{mint_to, Mint, MintTo, Token, TokenAccount},
};
use mpl_token_metadata::{
    accounts::Metadata as MetadataAccount,
    instructions::{CreateV1CpiBuilder, MintV1CpiBuilder},
    types::{Creator, PrintSupply, TokenStandard},
};

/// Reveal and Claim NFT - Direct Minting
///
/// After VRF randomness is fulfilled, user calls this to mint their NFT
/// directly using the VRF-determined skin metadata.
#[derive(Accounts)]
pub struct RevealAndClaim<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        seeds = [b"global"],
        bump,
    )]
    pub global_state: Account<'info, Global>,

    #[account(
        mut,
        seeds = [b"vrf_pending", user.key().as_ref(), vrf_pending.request_id.to_le_bytes().as_ref()],
        bump,
        close = user, // Close and refund rent after claiming
    )]
    pub vrf_pending: Account<'info, VrfPending>,

    /// Collection mint
    #[account(mut)]
    pub collection_mint: Account<'info, Mint>,

    /// Collection metadata
    /// CHECK: Derived from collection mint via Metaplex PDA
    #[account(mut)]
    pub collection_metadata: UncheckedAccount<'info>,

    /// NFT mint to create
    #[account(mut)]
    pub nft_mint: Signer<'info>,

    /// NFT metadata PDA
    /// CHECK: Derived and created by Token Metadata program
    #[account(mut)]
    pub nft_metadata: UncheckedAccount<'info>,

    /// NFT master edition PDA (for NFTs)
    /// CHECK: Derived and created by Token Metadata program
    #[account(mut)]
    pub nft_edition: UncheckedAccount<'info>,

    /// User's token account to receive the NFT
    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = nft_mint,
        associated_token::authority = user,
    )]
    pub nft_token_account: Account<'info, TokenAccount>,

    /// Token Metadata program
    /// CHECK: Metaplex Token Metadata Program ID
    pub token_metadata_program: UncheckedAccount<'info>,

    /// SPL Token program
    pub token_program: Program<'info, Token>,

    /// Associated Token program
    pub associated_token_program: Program<'info, AssociatedToken>,

    /// System program
    pub system_program: Program<'info, System>,

    /// Sysvar Instructions
    /// CHECK: Solana Sysvar Instructions account
    pub sysvar_instructions: UncheckedAccount<'info>,

    /// Rent sysvar
    pub rent: Sysvar<'info, Rent>,
}

/// Skin metadata URIs from Candy Machine upload
/// These were uploaded via Sugar CLI and stored permanently on Arweave
const SKIN_METADATA: [&str; 3] = [
    "https://gateway.irys.xyz/DZL844th8iuN8vdmGxp89utCDTS9YUbeNVqYnUrauUk", // AK-47 | Fire Serpent
    "https://gateway.irys.xyz/9WcjY4MehfSoppfG2UVhXNq4ByUS1WAm7pAX5fN49tE6", // AWP | Dragon Lore
    "https://gateway.irys.xyz/Abk2aS4x3uwPtXjskHq3DxfaF5rLMHC4cCTkK6aQEagL", // M4A4 | Howl
];

const SKIN_NAMES: [&str; 3] = [
    "AK-47 | Fire Serpent",
    "AWP | Dragon Lore",
    "M4A4 | Howl",
];

/// Handler for reveal_and_claim instruction
///
/// Flow:
/// 1. Validate VRF pending account has randomness
/// 2. Calculate skin index from randomness (randomness % num_skins)
/// 3. Mint NFT directly with Token Metadata CPI
/// 4. Mint 1 token to user's account
/// 5. Close VRF pending account (refund rent)
pub fn reveal_and_claim_handler(ctx: Context<RevealAndClaim>) -> Result<()> {
    let vrf_pending = &ctx.accounts.vrf_pending;
    let user = &ctx.accounts.user;

    // Validate randomness is fulfilled
    require!(vrf_pending.randomness != 0, SkinVaultError::VrfNotFulfilled);

    // Calculate deterministic skin index from VRF randomness
    let num_skins = SKIN_METADATA.len() as u64;
    let skin_index = (vrf_pending.randomness % num_skins) as usize;

    msg!("🎲 Revealing skin from VRF randomness: {}", vrf_pending.randomness);
    msg!("🎯 Determined skin index: {}", skin_index);
    msg!("🎨 Minting: {}", SKIN_NAMES[skin_index]);

    // Validate Token Metadata program ID
    let metadata_program_id = *ctx.accounts.token_metadata_program.key;
    require!(
        metadata_program_id == mpl_token_metadata::ID,
        SkinVaultError::InvalidMetadataProgram
    );

    // Get skin metadata
    let name = SKIN_NAMES[skin_index].to_string();
    let uri = SKIN_METADATA[skin_index].to_string();

    // Create NFT Metadata using Metaplex Token Metadata Program
    // Using CreateV1 instruction (latest Metaplex standard)
    msg!("📝 Creating NFT metadata...");

    CreateV1CpiBuilder::new(&ctx.accounts.token_metadata_program.to_account_info())
        .metadata(&ctx.accounts.nft_metadata.to_account_info())
        .master_edition(Some(&ctx.accounts.nft_edition.to_account_info()))
        .mint(&ctx.accounts.nft_mint.to_account_info(), true)
        .authority(&ctx.accounts.user.to_account_info())
        .payer(&ctx.accounts.user.to_account_info())
        .update_authority(&ctx.accounts.user.to_account_info(), true)
        .system_program(&ctx.accounts.system_program.to_account_info())
        .sysvar_instructions(&ctx.accounts.sysvar_instructions.to_account_info())
        .spl_token_program(Some(&ctx.accounts.token_program.to_account_info()))
        .name(name.clone())
        .symbol("SKIN".to_string())
        .uri(uri.clone())
        .seller_fee_basis_points(500) // 5% royalty
        .token_standard(TokenStandard::NonFungible)
        .is_mutable(true)
        .primary_sale_happened(false)
        .print_supply(PrintSupply::Zero)
        .creators(vec![Creator {
            address: user.key(),
            verified: true,
            share: 100,
        }])
        .invoke()?;

    msg!("✅ Metadata created successfully");

    // Mint 1 token to user's account
    msg!("🪙 Minting NFT to user's token account...");

    MintV1CpiBuilder::new(&ctx.accounts.token_metadata_program.to_account_info())
        .token(&ctx.accounts.nft_token_account.to_account_info())
        .token_owner(Some(&ctx.accounts.user.to_account_info()))
        .metadata(&ctx.accounts.nft_metadata.to_account_info())
        .master_edition(Some(&ctx.accounts.nft_edition.to_account_info()))
        .mint(&ctx.accounts.nft_mint.to_account_info())
        .authority(&ctx.accounts.user.to_account_info())
        .payer(&ctx.accounts.user.to_account_info())
        .system_program(&ctx.accounts.system_program.to_account_info())
        .sysvar_instructions(&ctx.accounts.sysvar_instructions.to_account_info())
        .spl_token_program(&ctx.accounts.token_program.to_account_info())
        .spl_ata_program(&ctx.accounts.associated_token_program.to_account_info())
        .amount(1)
        .invoke()?;

    msg!("✅ NFT minted successfully");

    msg!("🎉 Skin '{}' revealed!", name);
    msg!("💎 NFT mint: {}", ctx.accounts.nft_mint.key());
    msg!("📦 NFT in wallet: {}", ctx.accounts.nft_token_account.key());
    msg!("🔗 Metadata: {}", uri);

    // VrfPending account will be automatically closed (refunding rent to user)
    // due to the `close = user` constraint

    Ok(())
}
