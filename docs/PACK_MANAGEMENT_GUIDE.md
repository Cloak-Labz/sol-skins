# Pack Management Guide

## Modern Approach (Current Implementation)

The pack management system now follows the modern Candy Machine pattern from the integration tests. Here's how it works:

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                  Pack Management Flow                        │
└─────────────────────────────────────────────────────────────┘

1. Create Pack (Draft)
   └─> Admin defines pack name, description

2. Add Skins to Pack
   └─> Select from minted Core NFT inventory
   └─> Each skin has metadata already uploaded to Walrus

3. Deploy Pack
   ├─> Upload metadata batch to Walrus
   ├─> Deploy Candy Machine using Umi
   ├─> Add items to Candy Machine
   └─> Link to SkinVault program (optional)

4. Users Open Packs
   └─> Mint random NFT from Candy Machine
```

### Key Components

#### 1. **Pack Management** (`page.tsx:972-1256`)
- ✅ Uses Umi Candy Machine Client
- ✅ One Candy Machine per pack
- ✅ Uploads metadata to Walrus
- ✅ No special permissions required

#### 2. **Inventory Management** (`inventory/page.tsx`)
- ✅ Mints individual Core NFTs
- ✅ Stores metadata in Walrus
- ✅ Saves to database for later use in packs

### Implementation Details

#### Creating a Pack

```typescript
// 1. Create pack object
const newPack: Pack = {
  id: `pack_${Date.now()}`,
  name: packName,
  description: packDescription,
  status: "draft",
  skins: [],
};

// 2. Save to backend
await fetch(`${base}/api/v1/admin/packs`, {
  method: "POST",
  body: JSON.stringify(newPack),
});
```

#### Deploying a Pack

```typescript
// 1. Upload metadata to Walrus
const metadataArray = pack.skins.map((skin, index) =>
  walrusClient.createSkinMetadata({
    name: skin.name,
    weapon: skin.weapon,
    rarity: skin.rarity,
    imageUrl: skin.imageUrl,
    packId: pack.id,
    index: index + 1,
  })
);

const metadataUris = await walrusClient.uploadJsonBatch(metadataArray);

// 2. Deploy Candy Machine
const candyMachineConfig = umiCandyMachineClient.createDefaultConfig(
  pack.id,
  `${pack.name} Collection`,
  collectionUri,
  pack.skins.length,
  wallet.publicKey
);

const deployedCM = await umiCandyMachineClient.createCandyMachineForPack(
  candyMachineConfig
);

// 3. Add items to Candy Machine
const items = pack.skins.map((skin, index) => ({
  name: `${pack.id} #${index + 1}`,
  uri: metadataUris[index],
}));

await umiCandyMachineClient.addItemsToCandyMachine(
  deployedCM.candyMachine,
  items
);
```

#### User Opens Pack (Future Implementation)

```typescript
// When user opens a pack:
// 1. Call Candy Machine to mint random NFT
// 2. Transfer NFT to user wallet
// 3. Update database with ownership
// 4. Show reveal animation
```

## Comparison: Legacy vs Modern

### ❌ Legacy Batch Management (REMOVED)

```typescript
// Required special admin authority
await publishBatch({
  program,
  authority: wallet.publicKey, // Must be mgfSqUe1qaaUjeEzuLUyDUx5Rk4fkgePB5NtLnS3Vxa
  batchId: batchIdNum,
  candyMachine: new PublicKey(candyMachine),
  metadataUris: uris,
  merkleRoot,
});
```

**Problems:**
- ❌ Requires hardcoded admin authority
- ❌ Tightly coupled to SkinVault program
- ❌ Manual Merkle root computation
- ❌ No standard tooling support

### ✅ Modern Pack Management (CURRENT)

```typescript
// Uses standard Metaplex Candy Machine
const deployedCM = await umiCandyMachineClient.createCandyMachineForPack(config);
```

**Benefits:**
- ✅ Works with any wallet
- ✅ Uses standard Metaplex tooling
- ✅ One Candy Machine per pack (isolation)
- ✅ Automatic PDA management
- ✅ Standard NFT minting flow

## File Structure

```
src/client/app/app-dashboard/packs/admin/
├── page.tsx                    # Main admin panel
│   ├── Pack Management         # Create and deploy packs
│   ├── Candy Machine List      # View all created CMs
│   └── Published Batches       # Legacy batch viewer (read-only)
│
└── inventory/
    └── page.tsx                # Mint individual Core NFTs
        └── Inventory List      # View all minted NFTs
```

## Integration with SkinVault Program

### Current State
- ✅ Candy Machines deployed independently
- ⏳ SkinVault integration pending

### Future Integration (Optional)
```typescript
// After deploying CM, optionally link to SkinVault:
await program.methods
  .publishMerkleRoot(
    batchId,
    deployedCM.candyMachine,
    [hiddenUri], // Single URI for hidden settings
    merkleRoot,
    snapshotTime
  )
  .rpc();
```

This allows the SkinVault program to track which Candy Machines are "official" packs.

## Testing

Refer to `solana/tests/integration-flow.test.ts` for the complete flow:

1. **Initialize** (lines 55-72)
2. **Create Collection** (lines 74-120)
3. **Upload Metadata to Walrus** (lines 122-184)
4. **Deploy Candy Machine** (lines 192-230)
5. **Add Items** (lines 305-328)
6. **Mint NFTs** (lines 330-386)

## Migration Notes

### What Was Removed
- ❌ Legacy batch management UI (lines 1258-1401)
- ❌ `handlePublishBatch()` function
- ❌ `toggleSelect()` function
- ❌ `loadCandyMachine()` function
- ❌ Legacy state variables (`batchId`, `candyMachine`, `metadataUris`, `publishing`, `selectedIds`)

### What Remains
- ✅ Pack Management (modern approach)
- ✅ Candy Machine creation
- ✅ Inventory management
- ✅ Published batches viewer (read-only, for historical data)

## Best Practices

1. **Always use Umi for Candy Machine operations**
   - Don't manually construct instructions
   - Let Umi handle PDAs and accounts

2. **Upload metadata to Walrus first**
   - Store the URIs before deploying CM
   - Metadata must be accessible before minting

3. **One Candy Machine per pack**
   - Don't reuse CMs across packs
   - Easier to manage and track

4. **Save everything to the database**
   - Pack definitions
   - Candy Machine addresses
   - Minted NFT records

5. **Test on devnet first**
   - Use devnet for all testing
   - Only deploy to mainnet after thorough testing

## Troubleshooting

### Issue: Candy Machine deployment fails
**Solution**: Check that wallet has enough SOL for rent

### Issue: Metadata upload fails
**Solution**: Verify Walrus testnet is accessible and imageUrls are valid

### Issue: Can't add items to Candy Machine
**Solution**: Ensure metadataUris are valid and accessible

## References

- [Metaplex Candy Machine Docs](https://developers.metaplex.com/candy-machine)
- [Solana Program Integration Test](../../solana/tests/integration-flow.test.ts)
- [Umi Candy Machine Client](../../src/client/lib/umi-candy-machine-client.ts)
- [Walrus Client](../../src/client/lib/walrus-client.ts)
