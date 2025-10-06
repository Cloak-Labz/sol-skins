use anchor_lang::prelude::*;
use mpl_core::{
    instructions::{
        AddPluginV1CpiBuilder, BurnV1CpiBuilder, CreateV1CpiBuilder, RemovePluginV1CpiBuilder,
        UpdatePluginV1CpiBuilder,
    },
    types::{
        PermanentFreezeDelegate, Plugin, PluginAuthority, PluginAuthorityPair, TransferDelegate,
    },
    ID as MPL_CORE_ID,
};

use crate::errors::SkinVaultError;

/// Create a new Metaplex Core NFT asset with plugins
///
/// This creates a Core asset with:
/// - PERMANENT Freeze Delegate (locks the NFT, can NEVER be removed)
/// - REGULAR Transfer Delegate (for marketplace, can be added/removed later)
///
/// # Arguments
/// * `core_program` - Metaplex Core program account
/// * `asset` - Asset account to be created (signer)
/// * `collection` - Optional collection this asset belongs to
/// * `payer` - Account paying for the asset creation
/// * `owner` - Owner of the asset
/// * `update_authority` - Update authority (usually the program or collection)
/// * `system_program` - System program
/// * `name` - Name of the asset
/// * `uri` - Metadata URI
/// * `freeze_delegate_authority` - Authority that can freeze/thaw the asset
/// * `transfer_delegate_authority` - Authority that can manage transfers
pub fn create_core_asset<'info>(
    core_program: &AccountInfo<'info>,
    asset: &AccountInfo<'info>,
    collection: Option<&AccountInfo<'info>>,
    payer: &AccountInfo<'info>,
    owner: Option<&AccountInfo<'info>>,
    system_program: &AccountInfo<'info>,
    name: String,
    uri: String,
    freeze_delegate_authority: Pubkey,
    transfer_delegate_authority: Pubkey,
    signer_seeds: Option<&[&[&[u8]]]>,
) -> Result<()> {
    // Validate Core program ID
    require!(
        core_program.key() == MPL_CORE_ID,
        SkinVaultError::InvalidCoreProgram
    );

    // Build plugins for the asset
    let plugins = vec![
        // PERMANENT Freeze Delegate - locks the asset until platform decides to unlock
        // Permanent = can NEVER be removed
        PluginAuthorityPair {
            plugin: Plugin::PermanentFreezeDelegate(PermanentFreezeDelegate { frozen: true }),
            authority: Some(PluginAuthority::Address {
                address: freeze_delegate_authority,
            }),
        },
        // REGULAR Transfer Delegate - for future marketplace functionality
        // Non-permanent = can be added/removed later if needed
        PluginAuthorityPair {
            plugin: Plugin::TransferDelegate(TransferDelegate {}),
            authority: Some(PluginAuthority::Address {
                address: transfer_delegate_authority,
            }),
        },
    ];

    // Build the create instruction
    let mut create_builder = CreateV1CpiBuilder::new(core_program);
    create_builder
        .asset(asset)
        .payer(payer)
        .system_program(system_program)
        .name(name)
        .uri(uri);

    // Add collection if provided
    // Note: When using collection, we don't set update_authority separately
    if let Some(collection_account) = collection {
        create_builder.collection(Some(collection_account));
    }

    // Add owner if provided
    if let Some(owner_account) = owner {
        create_builder.owner(Some(owner_account));
    }

    // Add plugins
    create_builder.plugins(plugins);

    // Invoke with optional signer seeds
    if let Some(seeds) = signer_seeds {
        create_builder.invoke_signed(seeds).map_err(|e| {
            msg!("Error creating core asset: {:?}", e);
            anchor_lang::error::Error::from(e)
        })?;
    } else {
        create_builder.invoke().map_err(|e| {
            msg!("Error creating core asset: {:?}", e);
            anchor_lang::error::Error::from(e)
        })?;
    }

    msg!(
        "Core asset created: {} (frozen: true, transfer_delegate: enabled)",
        asset.key()
    );
    Ok(())
}

/// Burn (destroy) a Metaplex Core asset
///
/// This permanently destroys the asset account and refunds rent to a recipient.
/// The asset must be unfrozen before burning (thaw first if needed).
///
/// # Arguments
/// * `core_program` - Metaplex Core program account
/// * `asset` - Asset account to burn
/// * `collection` - Optional collection the asset belongs to
/// * `payer` - Account that will receive the rent refund
/// * `system_program` - System program
pub fn burn_core_asset<'info>(
    core_program: &AccountInfo<'info>,
    asset: &AccountInfo<'info>,
    collection: Option<&AccountInfo<'info>>,
    payer: &AccountInfo<'info>,
    system_program: &AccountInfo<'info>,
    signer_seeds: Option<&[&[&[u8]]]>,
) -> Result<()> {
    // Validate Core program ID
    require!(
        core_program.key() == MPL_CORE_ID,
        SkinVaultError::InvalidCoreProgram
    );

    // Build the burn instruction
    let mut burn_builder = BurnV1CpiBuilder::new(core_program);
    burn_builder
        .asset(asset)
        .payer(payer)
        .system_program(Some(system_program));

    // Add collection if provided
    if let Some(collection_account) = collection {
        burn_builder.collection(Some(collection_account));
    }

    // Invoke with optional signer seeds
    if let Some(seeds) = signer_seeds {
        burn_builder.invoke_signed(seeds).map_err(|e| {
            msg!("Error burning core asset: {:?}", e);
            anchor_lang::error::Error::from(e)
        })?;
    } else {
        burn_builder.invoke().map_err(|e| {
            msg!("Error burning core asset: {:?}", e);
            anchor_lang::error::Error::from(e)
        })?;
    }

    msg!("Core asset burned: {}", asset.key());
    Ok(())
}

/// Update the Permanent Freeze Delegate plugin to freeze/thaw an asset
///
/// # Arguments
/// * `core_program` - Metaplex Core program account
/// * `asset` - Asset account to update
/// * `collection` - Optional collection the asset belongs to
/// * `payer` - Account paying for transaction
/// * `authority` - Current authority of the plugin
/// * `system_program` - System program
/// * `frozen` - True to freeze, false to unfreeze
pub fn update_freeze_delegate<'info>(
    core_program: &AccountInfo<'info>,
    asset: &AccountInfo<'info>,
    collection: Option<&AccountInfo<'info>>,
    payer: &AccountInfo<'info>,
    authority: &AccountInfo<'info>,
    system_program: &AccountInfo<'info>,
    frozen: bool,
    signer_seeds: Option<&[&[&[u8]]]>,
) -> Result<()> {
    // Validate Core program ID
    require!(
        core_program.key() == MPL_CORE_ID,
        SkinVaultError::InvalidCoreProgram
    );

    // Build the update plugin instruction
    let mut update_builder = UpdatePluginV1CpiBuilder::new(core_program);
    update_builder
        .asset(asset)
        .payer(payer)
        .authority(Some(authority))
        .system_program(system_program)
        .plugin(Plugin::PermanentFreezeDelegate(PermanentFreezeDelegate {
            frozen,
        }));

    // Add collection if provided
    if let Some(collection_account) = collection {
        update_builder.collection(Some(collection_account));
    }

    // Invoke with optional signer seeds
    if let Some(seeds) = signer_seeds {
        update_builder.invoke_signed(seeds).map_err(|e| {
            msg!("Error updating freeze delegate: {:?}", e);
            anchor_lang::error::Error::from(e)
        })?;
    } else {
        update_builder.invoke().map_err(|e| {
            msg!("Error updating freeze delegate: {:?}", e);
            anchor_lang::error::Error::from(e)
        })?;
    }

    msg!(
        "Asset {} freeze status updated: frozen={}",
        asset.key(),
        frozen
    );
    Ok(())
}

/// Add a plugin to an existing Core asset
///
/// This is useful for adding plugins after initial creation
///
/// # Arguments
/// * `core_program` - Metaplex Core program account
/// * `asset` - Asset account to update
/// * `collection` - Optional collection the asset belongs to
/// * `payer` - Account paying for transaction
/// * `authority` - Authority that can add plugins
/// * `system_program` - System program
/// * `plugin` - Plugin to add
pub fn add_plugin_to_asset<'info>(
    core_program: &AccountInfo<'info>,
    asset: &AccountInfo<'info>,
    collection: Option<&AccountInfo<'info>>,
    payer: &AccountInfo<'info>,
    authority: &AccountInfo<'info>,
    system_program: &AccountInfo<'info>,
    plugin: Plugin,
    init_authority: Option<PluginAuthority>,
    signer_seeds: Option<&[&[&[u8]]]>,
) -> Result<()> {
    // Validate Core program ID
    require!(
        core_program.key() == MPL_CORE_ID,
        SkinVaultError::InvalidCoreProgram
    );

    // Build the add plugin instruction
    let mut add_builder = AddPluginV1CpiBuilder::new(core_program);
    add_builder
        .asset(asset)
        .payer(payer)
        .authority(Some(authority))
        .system_program(system_program)
        .plugin(plugin);

    // Add collection if provided
    if let Some(collection_account) = collection {
        add_builder.collection(Some(collection_account));
    }

    // Set init authority if provided
    if let Some(authority) = init_authority {
        add_builder.init_authority(authority);
    }

    // Invoke with optional signer seeds
    if let Some(seeds) = signer_seeds {
        add_builder.invoke_signed(seeds).map_err(|e| {
            msg!("Error adding plugin to asset: {:?}", e);
            anchor_lang::error::Error::from(e)
        })?;
    } else {
        add_builder.invoke().map_err(|e| {
            msg!("Error adding plugin to asset: {:?}", e);
            anchor_lang::error::Error::from(e)
        })?;
    }

    msg!("Plugin added to asset: {}", asset.key());
    Ok(())
}

/// Remove a plugin from a Core asset
///
/// # Arguments
/// * `core_program` - Metaplex Core program account
/// * `asset` - Asset account to update
/// * `collection` - Optional collection the asset belongs to
/// * `payer` - Account paying for transaction
/// * `authority` - Authority that can remove plugins
/// * `system_program` - System program
/// * `plugin_type` - Type of plugin to remove
pub fn remove_plugin_from_asset<'info>(
    core_program: &AccountInfo<'info>,
    asset: &AccountInfo<'info>,
    collection: Option<&AccountInfo<'info>>,
    payer: &AccountInfo<'info>,
    authority: &AccountInfo<'info>,
    system_program: &AccountInfo<'info>,
    plugin: Plugin,
    signer_seeds: Option<&[&[&[u8]]]>,
) -> Result<()> {
    // Validate Core program ID
    require!(
        core_program.key() == MPL_CORE_ID,
        SkinVaultError::InvalidCoreProgram
    );

    // Build the remove plugin instruction
    let mut remove_builder = RemovePluginV1CpiBuilder::new(core_program);
    remove_builder
        .asset(asset)
        .payer(payer)
        .authority(Some(authority))
        .system_program(system_program)
        .plugin_type((&plugin).into());

    // Add collection if provided
    if let Some(collection_account) = collection {
        remove_builder.collection(Some(collection_account));
    }

    // Invoke with optional signer seeds
    if let Some(seeds) = signer_seeds {
        remove_builder.invoke_signed(seeds).map_err(|e| {
            msg!("Error removing plugin from asset: {:?}", e);
            anchor_lang::error::Error::from(e)
        })?;
    } else {
        remove_builder.invoke().map_err(|e| {
            msg!("Error removing plugin from asset: {:?}", e);
            anchor_lang::error::Error::from(e)
        })?;
    }

    msg!("Plugin removed from asset: {}", asset.key());
    Ok(())
}
