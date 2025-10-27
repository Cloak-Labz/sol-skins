# Irys/Arweave Metadata Integration

## Overview

This document describes the implementation of Irys/Arweave metadata storage for NFT metadata in the SolSkins application. Metadata is now permanently stored on Arweave blockchain via Irys, ensuring permanent, decentralized storage for NFT metadata.

## Implementation Summary

### Files Modified

1. **`src/client/lib/services/metadataService.ts`**
   - Updated `uploadMetadata()` method to use Irys server endpoint instead of placeholder
   - Now uploads metadata to Arweave via `POST /api/v1/irys/upload`

2. **`src/client/app/app-dashboard/packs/admin/inventory/page.tsx`**
   - Changed from saving metadata to local database to uploading to Irys
   - Now uses `irysService.uploadMetadata()` to upload before minting
   - Stores permanent Arweave URIs in the database

3. **`src/client/lib/services/irys.service.ts`**
   - Updated to properly handle server response structure
   - Returns formatted `IrysUploadResult` with `id`, `uri`, and `size`

4. **`src/server/routes/irys.ts`**
   - Added automatic devnet/mainnet detection
   - Uses devnet Irys (`https://devnet.irys.xyz`) for devnet Solana
   - Uses mainnet Irys (`https://node1.irys.xyz`) for mainnet Solana

5. **`src/server/.env.example`**
   - Added `IRYS_PRIVATE_KEY` environment variable documentation

## Architecture

### Metadata Upload Flow

```
┌─────────────────────────────────────────────────────────────┐
│              METADATA UPLOAD FLOW                            │
└─────────────────────────────────────────────────────────────┘

1. Client creates metadata object (NFTMetadata)
   ↓
2. Client calls MetadataService.uploadMetadata(metadata)
   ↓
3. HTTP POST to /api/v1/irys/upload
   {
     "metadata": {
       "name": "...",
       "description": "...",
       "image": "...",
       "attributes": [...]
     }
   }
   ↓
4. Server uses IRYS_PRIVATE_KEY to sign upload
   ↓
5. Irys SDK uploads to Arweave blockchain
   ↓
6. Returns Arweave transaction ID
   ↓
7. Server polls Arweave gateways for availability
   ↓
8. Returns permanent URI: https://arweave.net/{txId}
   ↓
9. Client uses URI for NFT minting
```

### NFT Minting Flow (Updated)

```
┌─────────────────────────────────────────────────────────────┐
│              ADMIN INVENTORY MINTING FLOW                    │
└─────────────────────────────────────────────────────────────┘

1. Admin fills form (name, image, rarity, etc.)
   ↓
2. Client constructs metadata object
   ↓
3. Upload to Irys → Get Arweave URI
   ↓
4. Mint Core NFT with Arweave URI
   ↓
5. Save to database with mint address and Arweave URI
   ↓
6. Done! NFT metadata is permanently stored on Arweave
```

## Configuration

### Required Environment Variables

#### Server (`.env`)

```bash
# Irys Private Key (base58 encoded)
IRYS_PRIVATE_KEY=your-base58-encoded-private-key-here

# Solana RPC URL (Irys will auto-detect devnet vs mainnet)
SOLANA_RPC_URL=https://api.devnet.solana.com
```

#### Generating an Irys Keypair

```bash
# Generate a new Solana keypair
solana-keygen new -o ~/.solana/irys-keypair.json

# Export the base58 private key
solana-keygen sign -o ~/.solana/irys-keypair.json message

# Or use this command to get the base58 string:
solana-keygen decode ~/.solana/irys-keypair.json -o base58
```

### Optional Client Environment Variables

If you want to override Irys node URLs:

```bash
NEXT_PUBLIC_IRYS_NODE=https://node1.irys.xyz
NEXT_PUBLIC_IRYS_TOKEN=SOL
```

## API Endpoints

### POST `/api/v1/irys/upload`

Uploads metadata to Arweave via Irys.

**Request:**
```json
{
  "metadata": {
    "name": "AK-47 Redline",
    "description": "A beautiful AK-47 skin",
    "image": "https://example.com/image.jpg",
    "attributes": [
      { "trait_type": "Rarity", "value": "Legendary" },
      { "trait_type": "Weapon", "value": "AK-47" }
    ]
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "arweave-transaction-id",
    "uri": "https://arweave.net/arweave-transaction-id",
    "size": 1024
  }
}
```

## Usage Examples

### Uploading Metadata (Client-Side)

```typescript
import { MetadataService } from '@/lib/services/metadataService';

// Create metadata
const metadata = MetadataService.createNFTMetadata({
  name: "AK-47 Redline",
  description: "A legendary AK-47 skin",
  image: "https://example.com/image.jpg",
  rarity: "Legendary",
  skinType: "AK-47",
  condition: "Factory New"
});

// Upload to Irys/Arweave
const uri = await MetadataService.uploadMetadata(metadata);
console.log("Metadata URI:", uri);
// Returns: https://arweave.net/{transaction-id}
```

### Minting with Irys Metadata (Admin Inventory Page)

The admin inventory page now automatically uploads to Irys before minting:

```typescript
// In handleMintNFT()
const irysResult = await irysService.uploadMetadata(metadata);
const result = await mintCoreNft({
  name: nftName,
  uri: irysResult.uri, // Uses Arweave URI
  walletAdapter: walletCtx,
  connection,
});
```

## Benefits

1. **Permanence**: Metadata stored permanently on Arweave blockchain
2. **Decentralization**: No single point of failure
3. **Immutability**: Once uploaded, metadata cannot be changed
4. **Cost-Effective**: One-time payment for permanent storage
5. **Standard Compliance**: Follows Metaplex Token Metadata standard

## Integration Points

### ✅ Completed

1. **Admin Inventory Page** - Uses Irys for individual NFT metadata uploads
2. **Candy Machine Service** - Uses updated `uploadMetadata()` for collection metadata
3. **Batch Upload Support** - `createBatchMetadata()` uses Irys for collections
4. **Server-Side Upload** - Server endpoint handles keypair management

### 🔄 Existing Integration

The following locations were already using Irys:

1. **Admin Pack Deployment** (`src/client/app/app-dashboard/packs/admin/page.tsx`)
   - Uses `uploadJsonBatchToIrys()` for batch metadata uploads
   - Client-side wallet signing for uploads

## Testing

### Local Development

1. Set up environment variables:
   ```bash
   cd src/server
   cp .env.example .env
   # Edit .env and add IRYS_PRIVATE_KEY
   ```

2. Start the server:
   ```bash
   npm run dev
   ```

3. Upload test metadata:
   ```bash
   curl -X POST http://localhost:4000/api/v1/irys/upload \
     -H "Content-Type: application/json" \
     -d '{
       "metadata": {
         "name": "Test NFT",
         "description": "Test metadata",
         "image": "https://example.com/image.jpg"
       }
     }'
   ```

### Production Checklist

- [ ] Generate production Irys keypair
- [ ] Fund Irys wallet with SOL (mainnet) or SOL (devnet)
- [ ] Set `IRYS_PRIVATE_KEY` in production environment
- [ ] Update `SOLANA_RPC_URL` to mainnet RPC
- [ ] Test metadata uploads on mainnet
- [ ] Verify Arweave URIs are accessible

## Troubleshooting

### "IRYS_PRIVATE_KEY not configured"

Add the key to your `.env` file:
```bash
IRYS_PRIVATE_KEY=your-base58-encoded-key-here
```

### "Failed to upload to Irys"

1. Check if the keypair has sufficient SOL balance
2. Verify the private key format (must be base58)
3. Check server logs for detailed error messages

### Gateway URI not accessible

The server automatically tries to resolve accessible Arweave gateways:
- `https://arweave.net`
- `https://ar-io.net`

If neither is accessible after 30 seconds, the transaction ID is returned as a URI.

## References

- [Metaplex Token Metadata Guide](https://developers.metaplex.com/token-metadata/guides/javascript/create-an-nft)
- [Irys Documentation](https://docs.irys.xyz)
- [Arweave Documentation](https://docs.arweave.org)

