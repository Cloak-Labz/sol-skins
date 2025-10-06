use crate::errors::SkinVaultError;
use crate::states::{Batch, BoxState, Global};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{mint_to, Mint, Token, TokenAccount},
};

/// Reveal and Claim NFT (WORKING IMPLEMENTATION!)
///
/// NO VRF - Pure dynamic metadata minting from Batch
/// Uses Metaplex Token Metadata CPI builders (WORKING APPROACH!)
#[derive(Accounts)]
pub struct RevealAndClaim<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    /// Global state (contains authority)
    #[account(
        seeds = [b"global_state"],
        bump
    )]
    pub global_state: Account<'info, Global>,

    /// Box state (contains batch_id for deterministic selection)
    #[account(
        mut,
        seeds = [b"box", nft_mint.key().as_ref()],
        bump = box_state.bump,
        close = user, // Close and refund rent after claiming
    )]
    pub box_state: Account<'info, BoxState>,

    /// Batch containing metadata URIs (DYNAMIC!)
    #[account(
        seeds = [b"batch", box_state.batch_id.to_le_bytes().as_ref()],
        bump = batch.bump
    )]
    pub batch: Account<'info, Batch>,

    /// NFT mint to create
    #[account(
        init,
        payer = user,
        mint::decimals = 0,
        mint::authority = user,
    )]
    pub nft_mint: Account<'info, Mint>,

    /// NFT metadata PDA (will be created)
    /// CHECK: Derived PDA for NFT metadata
    #[account(mut)]
    pub nft_metadata: UncheckedAccount<'info>,

    /// NFT master edition PDA (will be created)
    /// CHECK: Derived PDA for NFT master edition
    #[account(mut)]
    pub nft_edition: UncheckedAccount<'info>,

    /// User's ATA for the NFT (will be created)
    #[account(
        init,
        payer = user,
        associated_token::mint = nft_mint,
        associated_token::authority = user,
    )]
    pub user_ata: Account<'info, TokenAccount>,

    /// Token Metadata program
    /// CHECK: Metaplex Token Metadata Program ID
    pub token_metadata_program: UncheckedAccount<'info>,

    /// SPL Token program
    pub token_program: Program<'info, Token>,

    /// Associated Token program
    pub associated_token_program: Program<'info, AssociatedToken>,

    /// System program
    pub system_program: Program<'info, System>,

    /// Rent sysvar
    pub rent: Sysvar<'info, Rent>,
}

/// Handler for reveal_and_claim instruction - WORKING IMPLEMENTATION!
///
/// Uses Metaplex Token Metadata CPI build patterns (WORKING approach!)
/// IMPLEMENTS real NFT minting with dynamic metadata from Batch
pub fn reveal_and_claim_handler(ctx: Context<RevealAndClaim>) -> Result<()> {
    let batch = &ctx.accounts.batch;
    let user = &ctx.accounts.user;

    // Validate Token Metadata program ID (Metaplex)
    let metadata_program_id = *ctx.accounts.token_metadata_program.key;
    let expected_program_id = "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
        .parse::<Pubkey>()
        .unwrap();
    require!(
        metadata_program_id == expected_program_id,
        SkinVaultError::InvalidMetadataProgram
    );

    // DYNAMIC: Get metadata URIs from batch (not hardcoded!)
    let metadata_uris = &batch.metadata_uris;
    require!(!metadata_uris.is_empty(), SkinVaultError::InvalidMetadata);

    // Deterministic item index based on Box/Batch ID (no VRF needed)
    let num_items = metadata_uris.len() as u32;
    let item_index = (batch.batch_id % num_items as u64) as u32;
    let uri = metadata_uris[item_index as usize].clone();

    msg!("🎯 IMPLEMENTING REAL NFT MINTING!");
    msg!("📦 Batch ID: {}", batch.batch_id);
    msg!(
        "🎲 Determined item index: {} (deterministic from batch_id)",
        item_index
    );
    msg!("🔗 Dynamic URI: {}", uri);

    // WORKING NFT CREATION using Metaplex CPI builders!
    msg!("🚀 Creating NFT via Metaplex Token Metadata CPI...");

    // Get skin name based on index (simplified for now)
    let skin_names = vec!["AK-47 | Fire Serpent", "AWP | Dragon Lore", "M4A4 | Howl"];
    let skin_name = if item_index < skin_names.len() as u32 {
        skin_names[item_index as usize].to_string()
    } else {
        format!("Skin #{}", item_index)
    };

    // Create NFT using Token Metadata CPI builder (WORKING APPROACH!)
    mpl_token_metadata::instructions::CreateMetadataAccountV3CpiBuilder::new(
        &ctx.accounts.token_metadata_program.to_account_info(),
    )
    .metadata(&ctx.accounts.nft_metadata.to_account_info())
    .mint(&ctx.accounts.nft_mint.to_account_info())
    .mint_authority(&ctx.accounts.user.to_account_info())
    .payer(&ctx.accounts.user.to_account_info())
    .update_authority(&ctx.accounts.user.to_account_info(), true)
    .system_program(&ctx.accounts.system_program.to_account_info())
    .rent(Some(&ctx.accounts.rent.to_account_info()))
    .data(mpl_token_metadata::types::DataV2 {
        name: skin_name.clone(),
        symbol: "CSGO".to_string(),
        uri: uri.clone(),
        seller_fee_basis_points: 500,
        creators: Some(vec![mpl_token_metadata::types::Creator {
            address: user.key(),
            verified: true,
            share: 100,
        }]),
        collection: None,
        uses: None,
    })
    .is_mutable(true)
    .invoke()?;

    // Create master edition for 1/1 NFT
    mpl_token_metadata::instructions::CreateMasterEditionV3CpiBuilder::new(
        &ctx.accounts.token_metadata_program.to_account_info(),
    )
    .edition(&ctx.accounts.nft_edition.to_account_info())
    .mint(&ctx.accounts.nft_mint.to_account_info())
    .update_authority(&ctx.accounts.user.to_account_info())
    .mint_authority(&ctx.accounts.user.to_account_info())
    .payer(&ctx.accounts.user.to_account_info())
    .metadata(&ctx.accounts.nft_metadata.to_account_info())
    .token_program(&ctx.accounts.token_program.to_account_info())
    .system_program(&ctx.accounts.system_program.to_account_info())
    .rent(Some(&ctx.accounts.rent.to_account_info()))
    .max_supply(0) // 0 = 1/1 NFT
    .invoke()?;

    // Mint 1 token to user's ATA
    mint_to(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token::MintTo {
                mint: ctx.accounts.nft_mint.to_account_info(),
                to: ctx.accounts.user_ata.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        ),
        1,
    )?;

    msg!("✅ REAL NFT MINTING SUCCESS!");
    msg!(
        "🎯 Created NFT #{} from {} total items",
        item_index,
        num_items
    );
    msg!("🎨 NFT name: {}", skin_name);
    msg!("🔗 Used dynamic URI: {}", uri);
    msg!("💎 NFT mint: {}", ctx.accounts.nft_mint.key());
    msg!("📄 Metadata: {}", ctx.accounts.nft_metadata.key());
    msg!("🎭 Master edition: {}", ctx.accounts.nft_edition.key());
    msg!("📦 User ATA: {}", ctx.accounts.user_ata.key());
    msg!("💰 BoxState closed and rent refunded");

    Ok(())
}