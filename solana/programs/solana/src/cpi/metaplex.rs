use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke_signed;
use mpl_token_metadata::instructions::{
    CreateV1, CreateV1InstructionArgs, UpdateV1, UpdateV1InstructionArgs, VerifyCollectionV1,
};
use mpl_token_metadata::types::{
    Collection as MplCollection, Creator as MplCreator, PrintSupply, TokenStandard,
};

/// Create NFT metadata using Metaplex Token Metadata Program
/// This uses the CreateV1 instruction (latest Metaplex standard)
pub fn create_nft_metadata<'info>(
    metadata_program: &AccountInfo<'info>,
    metadata_account: &AccountInfo<'info>,
    master_edition: Option<&AccountInfo<'info>>,
    mint: &AccountInfo<'info>,
    mint_authority: &AccountInfo<'info>,
    payer: &AccountInfo<'info>,
    update_authority: &AccountInfo<'info>,
    system_program: &AccountInfo<'info>,
    sysvar_instructions: &AccountInfo<'info>,
    spl_token_program: &AccountInfo<'info>,
    name: String,
    symbol: String,
    uri: String,
    creators: Option<Vec<Creator>>,
    seller_fee_basis_points: u16,
    collection: Option<CollectionInfo>,
    is_mutable: bool,
    signer_seeds: Option<&[&[&[u8]]]>,
) -> Result<()> {
    // Convert our Creator type to Metaplex Creator type
    let mpl_creators = creators.map(|c| {
        c.into_iter()
            .map(|creator| MplCreator {
                address: creator.address,
                verified: creator.verified,
                share: creator.share,
            })
            .collect::<Vec<MplCreator>>()
    });

    // Convert collection info
    let mpl_collection = collection.map(|c| MplCollection {
        verified: c.verified,
        key: c.key,
    });

    // Build CreateV1 instruction
    let create_ix = CreateV1 {
        metadata: metadata_account.key(),
        master_edition: master_edition.map(|me| me.key()),
        mint: (mint.key(), false), // (pubkey, is_signer)
        authority: mint_authority.key(),
        payer: payer.key(),
        update_authority: (update_authority.key(), false),
        system_program: system_program.key(),
        sysvar_instructions: sysvar_instructions.key(),
        spl_token_program: Some(spl_token_program.key()),
    };

    let create_args = CreateV1InstructionArgs {
        name,
        symbol,
        uri,
        seller_fee_basis_points,
        creators: mpl_creators,
        primary_sale_happened: false,
        is_mutable,
        token_standard: TokenStandard::NonFungible,
        collection: mpl_collection,
        uses: None,
        collection_details: None,
        rule_set: None,
        decimals: Some(0),
        print_supply: Some(PrintSupply::Zero),
    };

    let create_instruction = create_ix.instruction(create_args);

    // Execute CPI call
    let account_infos = vec![
        metadata_account.clone(),
        master_edition
            .map(|me| me.clone())
            .unwrap_or(metadata_account.clone()),
        mint.clone(),
        mint_authority.clone(),
        payer.clone(),
        update_authority.clone(),
        system_program.clone(),
        sysvar_instructions.clone(),
        spl_token_program.clone(),
    ];

    if let Some(seeds) = signer_seeds {
        invoke_signed(&create_instruction, &account_infos, seeds)?;
    } else {
        anchor_lang::solana_program::program::invoke(&create_instruction, &account_infos)?;
    }

    msg!("NFT metadata created: {}", metadata_account.key());
    Ok(())
}

/// Update NFT metadata (e.g., after inventory assignment)
pub fn update_nft_metadata<'info>(
    _metadata_program: &AccountInfo<'info>,
    metadata_account: &AccountInfo<'info>,
    update_authority: &AccountInfo<'info>,
    new_name: Option<String>,
    new_symbol: Option<String>,
    new_uri: Option<String>,
    new_creators: Option<Vec<Creator>>,
    new_seller_fee_basis_points: Option<u16>,
    signer_seeds: Option<&[&[&[u8]]]>,
) -> Result<()> {
    // Convert creators if provided
    let mpl_creators = new_creators.map(|c| {
        c.into_iter()
            .map(|creator| MplCreator {
                address: creator.address,
                verified: creator.verified,
                share: creator.share,
            })
            .collect::<Vec<MplCreator>>()
    });

    let update_ix = UpdateV1 {
        authority: update_authority.key(),
        delegate_record: None,
        token: None,
        mint: metadata_account.key(), // Using metadata as placeholder
        metadata: metadata_account.key(),
        edition: None,
        payer: update_authority.key(),
        system_program: anchor_lang::system_program::ID,
        sysvar_instructions: anchor_lang::solana_program::sysvar::instructions::ID,
        authorization_rules_program: None,
        authorization_rules: None,
    };

    let update_args = UpdateV1InstructionArgs {
        new_update_authority: None,
        data: Some(mpl_token_metadata::types::Data {
            name: new_name.unwrap_or_default(),
            symbol: new_symbol.unwrap_or_default(),
            uri: new_uri.unwrap_or_default(),
            seller_fee_basis_points: new_seller_fee_basis_points.unwrap_or(0),
            creators: mpl_creators,
        }),
        primary_sale_happened: None,
        is_mutable: None,
        collection: mpl_token_metadata::types::CollectionToggle::None,
        collection_details: mpl_token_metadata::types::CollectionDetailsToggle::None,
        uses: mpl_token_metadata::types::UsesToggle::None,
        rule_set: mpl_token_metadata::types::RuleSetToggle::None,
        authorization_data: None,
    };

    let update_instruction = update_ix.instruction(update_args);

    let account_infos = vec![metadata_account.clone(), update_authority.clone()];

    if let Some(seeds) = signer_seeds {
        invoke_signed(&update_instruction, &account_infos, seeds)?;
    } else {
        anchor_lang::solana_program::program::invoke(&update_instruction, &account_infos)?;
    }

    msg!("NFT metadata updated: {}", metadata_account.key());
    Ok(())
}

/// Verify NFT as part of a collection
pub fn verify_collection<'info>(
    _metadata_program: &AccountInfo<'info>,
    metadata: &AccountInfo<'info>,
    collection_authority: &AccountInfo<'info>,
    _payer: &AccountInfo<'info>,
    collection_mint: &AccountInfo<'info>,
    collection_metadata: &AccountInfo<'info>,
    collection_master_edition: &AccountInfo<'info>,
    system_program: &AccountInfo<'info>,
    sysvar_instructions: &AccountInfo<'info>,
    signer_seeds: Option<&[&[&[u8]]]>,
) -> Result<()> {
    let verify_ix = VerifyCollectionV1 {
        authority: collection_authority.key(),
        delegate_record: None,
        metadata: metadata.key(),
        collection_mint: collection_mint.key(),
        collection_metadata: Some(collection_metadata.key()),
        collection_master_edition: Some(collection_master_edition.key()),
        system_program: system_program.key(),
        sysvar_instructions: sysvar_instructions.key(),
    };

    let verify_instruction = verify_ix.instruction();

    let account_infos = vec![
        collection_authority.clone(),
        metadata.clone(),
        collection_mint.clone(),
        collection_metadata.clone(),
        collection_master_edition.clone(),
        system_program.clone(),
        sysvar_instructions.clone(),
    ];

    if let Some(seeds) = signer_seeds {
        invoke_signed(&verify_instruction, &account_infos, seeds)?;
    } else {
        anchor_lang::solana_program::program::invoke(&verify_instruction, &account_infos)?;
    }

    msg!("Collection verified for NFT: {}", metadata.key());
    Ok(())
}

// Helper structs

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct Creator {
    pub address: Pubkey,
    pub verified: bool,
    pub share: u8,
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct CollectionInfo {
    pub verified: bool,
    pub key: Pubkey,
}
