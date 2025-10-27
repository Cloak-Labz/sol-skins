# Production Integration Guide: Candy Machine + Buyback System

## Overview

This guide documents the complete integration of a Solana Candy Machine with Hidden Settings and an Anchor-based NFT buyback program. The system allows users to mint mystery CS2 skin NFTs, automatically reveals them with rarity-based selection, and enables users to sell NFTs back to the platform.

---

## What We Built

### 1. **Anchor Buyback Program** (`programs/programs/programs/`)
- **Purpose**: On-chain program that burns user NFTs and transfers SOL back to users
- **Key Features**:
  - Configurable buyback system with PDA-based config
  - Atomic NFT burn + SOL transfer in single transaction
  - Treasury-based payment system with safety checks
  - Emergency pause functionality
  - Minimum treasury balance protection

### 2. **Candy Machine with Hidden Settings**
- **Purpose**: NFT minting with mystery box experience
- **Configuration**:
  - Hidden Settings: All NFTs mint with placeholder metadata
  - Candy Guards: `solPayment` (0.2 SOL) + `botTax` (0.02 SOL)
  - Items: 100 NFTs per machine
  - Collection-based structure

### 3. **Backend Services**
- **RevealService**: Rolls rarity, selects skin from database, updates NFT metadata
- **BuybackService**: Calculates buyback amount (85% of skin USD price), builds Anchor transactions
- **BuybackController**: Handles request/confirm flow for buyback transactions

### 4. **Frontend Integration**
- Test mint page with full flow demonstration
- Wallet authentication via Solana Wallet Adapter
- Transaction signing and submission
- Toast notifications for UX feedback

---

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    MINTING FLOW                              │
└─────────────────────────────────────────────────────────────┘

1. User clicks "Mint" → Frontend calls Candy Machine (mintV2)
2. Candy Machine mints NFT with placeholder metadata (Hidden Settings)
3. Frontend waits 12 seconds for metadata propagation
4. Frontend calls backend `/api/v1/reveal/:nftMint`
5. Backend:
   - Rolls rarity (50% Common, 25% Uncommon, 15% Rare, 7% Epic, 3% Legendary)
   - Selects random skin from SkinTemplate table matching rarity
   - Updates NFT metadata on-chain with actual skin name
   - Creates/updates UserSkin record in database
6. User sees revealed skin

┌─────────────────────────────────────────────────────────────┐
│                    BUYBACK FLOW                              │
└─────────────────────────────────────────────────────────────┘

1. User clicks "Buyback" → Frontend calls `/api/v1/buyback/calculate/:nftMint`
2. Backend:
   - Fetches skin from database
   - Calculates: (skinPriceUSD / solPriceUSD) * 0.85
   - Returns buyback amount in SOL
3. Frontend calls `/api/v1/buyback/request` with nftMint + walletAddress
4. Backend:
   - Builds Anchor transaction (executeBuyback instruction)
   - Admin wallet partially signs transaction
   - Returns base64-encoded transaction to frontend
5. User signs transaction in wallet
6. Frontend calls `/api/v1/buyback/confirm` with signedTransaction
7. Backend:
   - Submits transaction to Solana
   - Waits for confirmation
   - Marks NFT as burned in database
   - Creates BuybackRecord
8. NFT is burned, user receives SOL
```

---

## Production Deployment Checklist

### 🔐 Security Requirements

#### **CRITICAL - DO NOT SKIP**

1. **Environment Variables** (`.env` files)
   ```bash
   # NEVER commit these to git
   # NEVER log these values
   # NEVER expose in API responses
   
   ADMIN_WALLET_PRIVATE_KEY=[1,2,3...]  # Buyback treasury wallet (array format)
   ADMIN_PRIVATE_KEY=base58string        # Metadata update authority (base58)
   BUYBACK_PROGRAM_ID=<program-address>
   SOLANA_RPC_URL=<production-rpc>       # Use paid RPC (Helius/QuickNode)
   ```

2. **Database Credentials**
   ```bash
   DB_PASSWORD=<strong-password>
   DB_HOST=<production-host>
   JWT_SECRET=<cryptographically-random-string>
   ```

3. **Remove All Debug Logs**
   - ❌ NO `console.log` with transaction signatures
   - ❌ NO `console.log` with NFT mint addresses
   - ❌ NO `console.log` with wallet addresses
   - ❌ NO `console.log` with private keys or sensitive data
   - ✅ ONLY error logs for debugging

4. **CORS Configuration** (`src/server/middlewares/security.ts`)
   ```typescript
   // Update allowedOrigins to production domains ONLY
   const allowedOrigins = [
     'https://yourdomain.com',
     'https://www.yourdomain.com',
   ];
   // Remove localhost origins in production
   ```

5. **Rate Limiting**
   - Keep `generalLimiter` at 100 requests per 15 minutes
   - Keep `caseOpeningLimiter` at 5 per minute
   - Monitor and adjust based on abuse patterns

---

### 📦 Deployment Steps

#### **Step 0: Prerequisites**

```bash
# Install required tools
npm install -g @coral-xyz/anchor-cli
npm install -g @metaplex-foundation/sugar-cli
npm install -g tsx

# Verify installations
anchor --version  # Should be 0.29.0 or higher
sugar --version   # Should be 2.0.0 or higher
solana --version  # Should be 1.18.0 or higher

# Setup Solana CLI for mainnet
solana config set --url https://api.mainnet-beta.solana.com
solana config set --keypair ~/.config/solana/id.json

# Verify wallet has sufficient SOL
solana balance
# You need:
# - ~2 SOL for program deployment
# - ~1 SOL for Candy Machine deployment
# - 100+ SOL for treasury (buyback payments)
```

#### **Step 1: Deploy Buyback Program**

```bash
# Navigate to program directory
cd /path/to/sol-skins/programs/programs/programs

# Build the program
anchor build

# Get the program ID from target/deploy/programs-keypair.json
cat target/deploy/programs-keypair.json
# Copy the array of numbers

# Update Anchor.toml with the program ID
# Edit programs/programs/programs/Anchor.toml
# [programs.mainnet]
# programs = "<PROGRAM_ID_FROM_KEYPAIR>"

# Deploy to mainnet
anchor deploy --provider.cluster mainnet --provider.wallet ~/.config/solana/id.json

# Expected output:
# Program Id: Bwx4dpTtC72nyzTwdCH3rRJVvFg1SatKqgrFNcqNFSAJ

# Save this program ID - you'll need it for .env
echo "BUYBACK_PROGRAM_ID=<your-program-id>" >> ../../src/server/.env
```

#### **Step 2: Initialize Buyback Config**

```bash
# Navigate to scripts directory
cd /path/to/sol-skins/programs/scripts

# Update init-buyback-on-chain.ts with production values
# Edit line 14: const collectionMint = new PublicKey("<YOUR_COLLECTION_MINT>");
# Edit line 17: const minTreasuryBalance = new anchor.BN(100_000_000_000); // 100 SOL

# Set environment variables for Anchor
export ANCHOR_PROVIDER_URL=https://api.mainnet-beta.solana.com
export ANCHOR_WALLET=~/.config/solana/id.json

# Run initialization script
tsx init-buyback-on-chain.ts

# Expected output:
# 🚀 Initializing Buyback Program...
# Program ID: Bwx4dpTtC72nyzTwdCH3rRJVvFg1SatKqgrFNcqNFSAJ
# Authority: <your-wallet>
# Treasury: <your-wallet>
# Collection Mint: <your-collection>
# Buyback Config PDA: <pda-address>
# ✅ Buyback config initialized!
# Transaction signature: <signature>

# Verify on Solana Explorer
# https://solscan.io/tx/<signature>
```

#### **Step 3: Deploy Candy Machine**

```bash
# Navigate to candy machine directory
cd /path/to/sol-skins/programs/candy-machine-random

# Create assets directory with placeholder JSON
mkdir -p assets
cat > assets/0.json << 'EOF'
{
  "name": "Mystery Skin",
  "symbol": "SKIN",
  "description": "A mystery CS2 skin NFT",
  "image": "https://arweave.net/placeholder.png",
  "attributes": [],
  "properties": {
    "files": [
      {
        "uri": "https://arweave.net/placeholder.png",
        "type": "image/png"
      }
    ],
    "category": "image"
  }
}
EOF

# Update config.json with production values
cat > config.json << 'EOF'
{
  "price": 0.2,
  "number": 10000,
  "gatekeeper": null,
  "solTreasuryAccount": "<YOUR_TREASURY_WALLET>",
  "splTokenAccount": null,
  "splToken": null,
  "goLiveDate": "01 Jan 2026 00:00:00 GMT",
  "endSettings": null,
  "whitelistMintSettings": null,
  "hiddenSettings": {
    "name": "Mystery Skin #$ID+1$",
    "uri": "https://arweave.net/placeholder",
    "hash": "Cvb455DfhAzScUoG6NotWovvmWNBKg1R"
  },
  "uploadMethod": "bundlr",
  "retainAuthority": true,
  "isMutable": true,
  "creators": [
    {
      "address": "<YOUR_WALLET>",
      "share": 100
    }
  ],
  "symbol": "SKIN",
  "sellerFeeBasisPoints": 500,
  "guards": {
    "default": {
      "solPayment": {
        "value": 0.2,
        "destination": "<YOUR_TREASURY_WALLET>"
      },
      "botTax": {
        "value": 0.02,
        "lastInstruction": true
      }
    }
  }
}
EOF

# Validate config
sugar validate

# Upload assets to Arweave (if not using hidden settings for all)
# Skip this if using hidden settings
# sugar upload --keypair ~/.config/solana/id.json --rpc-url https://api.mainnet-beta.solana.com

# Deploy Candy Machine
sugar deploy --keypair ~/.config/solana/id.json --rpc-url https://api.mainnet-beta.solana.com

# Expected output:
# [1/4] 🗂  Loading assets
# [2/4] 🖥  Initializing upload
# [3/4] 📤 Uploading metadata files
# [4/4] 📝 Writing config lines
# ✅ Command successful.
# Candy machine ID: 5WDRNFjb3KNfNdXyiikUhU7pZWR2Gq9AYZQ8vFcATt1h
# Collection mint: BBwtV8CDpp4t8KjKMgNuGiz4Hqpsv1fWbayPPLLSFfFh

# Add Candy Guard
sugar guard add --keypair ~/.config/solana/id.json --rpc-url https://api.mainnet-beta.solana.com

# Expected output:
# ✅ Guard added successfully
# Candy Guard: <guard-address>

# Verify deployment
sugar show --candy-machine 5WDRNFjb3KNfNdXyiikUhU7pZWR2Gq9AYZQ8vFcATt1h

# Save these values for frontend .env
echo "NEXT_PUBLIC_CANDY_MACHINE_ID=5WDRNFjb3KNfNdXyiikUhU7pZWR2Gq9AYZQ8vFcATt1h" >> ../../src/client/.env.production
echo "NEXT_PUBLIC_COLLECTION_MINT=BBwtV8CDpp4t8KjKMgNuGiz4Hqpsv1fWbayPPLLSFfFh" >> ../../src/client/.env.production
```

#### **Step 4: Database Setup**

```bash
# Option A: Local Docker (Development/Staging)
cd /path/to/sol-skins/deployment
docker compose up -d

# Wait for PostgreSQL to be ready
docker compose logs -f postgres
# Wait for: "database system is ready to accept connections"

# Option B: Production Database (AWS RDS, DigitalOcean, etc.)
# Ensure your production database is accessible
# Update connection details in .env

# Navigate to server directory
cd /path/to/sol-skins/src/server

# Install dependencies
npm install
# or
yarn install

# Create .env file with production values
cat > .env << 'EOF'
# Server
NODE_ENV=production
PORT=4000
API_PREFIX=/api/v1

# Database
DB_HOST=your-production-db.amazonaws.com
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=<strong-password>
DB_DATABASE=loot
DB_SYNCHRONIZE=false
DB_LOGGING=false

# Redis
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=<redis-password>

# JWT
JWT_SECRET=<generate-with: openssl rand -base64 32>
JWT_EXPIRE=24h
JWT_REFRESH_EXPIRE=7d

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Solana
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=<your-key>
SOLANA_WS_URL=wss://mainnet.helius-rpc.com/?api-key=<your-key>
PROGRAM_ID=EyqcQ4n3Pr7BoqycXQj6hmyqmxZzwFzpFasQq55GEGkR

# Buyback
BUYBACK_PROGRAM_ID=Bwx4dpTtC72nyzTwdCH3rRJVvFg1SatKqgrFNcqNFSAJ
ADMIN_WALLET_PRIVATE_KEY=[1,2,3,...]  # Get from: solana-keygen pubkey --outfile /dev/stdout ~/.config/solana/id.json | base64 -d | od -An -tu1 -v | tr -d ' \n' | sed 's/^/[/;s/$/]/;s/\([0-9]\+\)/\1,/g;s/,$//'
ADMIN_PRIVATE_KEY=<base58-private-key>  # Get from: cat ~/.config/solana/id.json | jq -r '.[0:32] | @base64'
BUYBACK_RATE=0.85

# External APIs (optional)
STEAM_API_KEY=
CSGOFLOAT_API_KEY=
DMARKET_API_KEY=

# Discord (optional)
DISCORD_BOT_TOKEN=
DISCORD_TICKET_CHANNEL_ID=
DISCORD_GUILD_ID=

# Monitoring
LOG_LEVEL=info
LOG_FORMAT=combined
EOF

# Run database migrations
npm run typeorm migration:run

# Expected output:
# query: SELECT * FROM "information_schema"."tables" WHERE "table_schema" = current_schema() AND "table_name" = 'migrations'
# query: CREATE TABLE "migrations" ...
# Migration <timestamp>-AddSupplyFields has been executed successfully.
# Migration <timestamp>-AddTradeUrlToUser has been executed successfully.

# Seed production skin templates
# First, update src/server/scripts/seed-test-skins.ts with REAL data
# Replace test data with actual CS2 skins from Steam Market API

# Run seeding script
tsx scripts/seed-test-skins.ts

# Expected output:
# 🌱 Seeding test skin templates...
# ✅ Database connected
# 🗑️  Cleared existing skin templates
# 🎉 Successfully seeded 11 skin templates!
```

#### **Step 5: Backend Deployment**

```bash
# Navigate to server directory
cd /path/to/sol-skins/src/server

# Ensure .env is configured (from Step 4)
cat .env | grep -E "NODE_ENV|SOLANA_RPC_URL|DB_HOST"

# Install production dependencies
npm ci --production
# or
yarn install --production

# Build TypeScript
npm run build

# Expected output:
# tsc -b
# ✓ Compiled successfully

# Test the build
node dist/index.js

# Expected output:
# 🚀 Server running on port 4000
# ✅ Database connected
# ✅ Redis connected

# For production deployment:

# Option A: PM2 (Recommended)
npm install -g pm2
pm2 start dist/index.js --name sol-skins-api
pm2 save
pm2 startup  # Follow instructions to enable auto-start

# Option B: Docker
docker build -t sol-skins-api .
docker run -d -p 4000:4000 --env-file .env sol-skins-api

# Option C: Systemd service
sudo cat > /etc/systemd/system/sol-skins-api.service << 'EOF'
[Unit]
Description=Sol Skins API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/sol-skins/src/server
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable sol-skins-api
sudo systemctl start sol-skins-api
sudo systemctl status sol-skins-api

# Verify API is running
curl http://localhost:4000/api/v1/buyback/status

# Expected response:
# {"success":true,"data":{"buybackEnable":true,"minTreasuryBalance":"100000000000",...}}
```

#### **Step 6: Frontend Deployment**

```bash
# Navigate to client directory
cd /path/to/sol-skins/src/client

# Create .env.production file
cat > .env.production << 'EOF'
NEXT_PUBLIC_SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=<your-key>
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_CANDY_MACHINE_ID=5WDRNFjb3KNfNdXyiikUhU7pZWR2Gq9AYZQ8vFcATt1h
NEXT_PUBLIC_COLLECTION_MINT=BBwtV8CDpp4t8KjKMgNuGiz4Hqpsv1fWbayPPLLSFfFh
NEXT_PUBLIC_TREASURY_ADDRESS=<your-treasury-wallet>
EOF

# Install dependencies
npm ci
# or
yarn install

# Build for production
npm run build

# Expected output:
# ✓ Creating an optimized production build
# ✓ Compiled successfully
# ✓ Collecting page data
# ✓ Generating static pages
# ✓ Finalizing page optimization

# Test production build locally
npm run start

# Visit http://localhost:3000 to verify

# Deploy to Vercel (Recommended)
npm install -g vercel
vercel login
vercel --prod

# Or deploy to Netlify
npm install -g netlify-cli
netlify login
netlify deploy --prod

# Or deploy to custom server
# Copy .next directory and run:
# node .next/standalone/server.js

# Verify deployment
curl https://yourdomain.com
# Should return HTML of your app
```

#### **Step 7: Post-Deployment Verification**

```bash
# Test full flow end-to-end

# 1. Check backend health
curl https://api.yourdomain.com/api/v1/buyback/status
# Expected: {"success":true,"data":{"buybackEnable":true,...}}

# 2. Check Candy Machine
sugar show --candy-machine 5WDRNFjb3KNfNdXyiikUhU7pZWR2Gq9AYZQ8vFcATt1h
# Expected: Shows candy machine details, items available, etc.

# 3. Check buyback program
solana account <BUYBACK_CONFIG_PDA> --output json
# Expected: Shows account data

# 4. Monitor logs
# Backend logs
pm2 logs sol-skins-api
# or
tail -f /var/log/sol-skins-api.log

# 5. Test mint from frontend
# Visit https://yourdomain.com/app-dashboard/test-mint
# Connect wallet, mint NFT, verify reveal works

# 6. Test buyback
# After minting, try to buyback the NFT
# Verify SOL is transferred and NFT is burned

# 7. Monitor treasury balance
solana balance <TREASURY_WALLET>
# Set up alerts if balance drops below 50 SOL
```

---

## Integration Points

### Frontend → Candy Machine

**Location**: `src/client/app/app-dashboard/test-mint/page.tsx`

```typescript
// Key integration points:
1. Import Umi and Candy Machine SDK
2. Fetch Candy Machine state
3. Call mintV2 with:
   - candyGuard address (from candyMachine.mintAuthority)
   - mintArgs with solPayment destination
   - Compute budget (800,000 units)
4. Wait 12 seconds after mint
5. Call reveal endpoint
```

**What to change for production**:
- Remove test page, integrate into main app flow
- Add loading states and error handling
- Store minted NFTs in user's inventory
- Add transaction confirmation UI
- Handle wallet disconnection gracefully

### Frontend → Backend (Reveal)

**Endpoint**: `POST /api/v1/reveal/:nftMint`

**Request**:
```json
{
  "boxId": "box-type-id"  // Your loot box type identifier
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "nftMint": "...",
    "skinName": "AK-47 | Redline",
    "skinRarity": "Common",
    "metadataUri": "https://arweave.net/...",
    "txSignature": "..."
  }
}
```

**Integration**:
- Call immediately after mint (with 12s delay)
- Display revealed skin to user
- Update user's inventory UI
- Handle errors (retry logic recommended)

### Frontend → Backend (Buyback)

**Step 1: Calculate**
```typescript
GET /api/v1/buyback/calculate/:nftMint

Response:
{
  "nftMint": "...",
  "skinPrice": 0.0625,      // SOL
  "buybackAmount": 0.053125, // SOL (85%)
  "buybackAmountLamports": "53125000"
}
```

**Step 2: Request Transaction**
```typescript
POST /api/v1/buyback/request
Body: {
  "nftMint": "...",
  "walletAddress": "..."  // REQUIRED in body, not header
}

Response:
{
  "transaction": "base64-encoded-tx",
  "buybackAmount": 0.053125,
  ...
}
```

**Step 3: Sign & Confirm**
```typescript
// User signs transaction in wallet
const signedTx = await wallet.signTransaction(transaction);

POST /api/v1/buyback/confirm
Body: {
  "nftMint": "...",
  "walletAddress": "...",
  "signedTransaction": "base64-encoded-signed-tx"
}

Response:
{
  "message": "Buyback completed successfully",
  "txSignature": "...",
  "amountPaid": 0.053125
}
```

---

## Configuration Reference

### Buyback Rate

**Location**: `src/server/config/env.ts`

```typescript
buyback: {
  buybackRate: 0.85,  // 85% of skin value
}
```

**To change**: Update this value (0.0 to 1.0)

### SOL Price Oracle

**Location**: `src/server/services/BuybackService.ts:78`

```typescript
const solPriceUsd = 200;  // HARDCODED - UPDATE FOR PRODUCTION
```

**Production TODO**: 
- Integrate real-time price feed (Pyth, Switchboard, or CoinGecko API)
- Update every 5-10 minutes
- Add fallback price if oracle fails

### Rarity Probabilities

**Location**: `src/server/services/RevealService.ts:30`

```typescript
private rollRarity(boxId: string): string {
  const rand = Math.random();
  if (rand < 0.50) return 'Common';      // 50%
  if (rand < 0.75) return 'Uncommon';    // 25%
  if (rand < 0.90) return 'Rare';        // 15%
  if (rand < 0.97) return 'Epic';        // 7%
  return 'Legendary';                     // 3%
}
```

**To customize**: Adjust thresholds per box type

---

## Database Schema

### Key Tables

**`skin_templates`**: Master skin catalog
- `weapon`, `skinName`, `condition`, `rarity`
- `basePriceUsd`: Used for buyback calculation
- `imageUrl`: Steam CDN URL

**`user_skins`**: User-owned NFTs
- `nftMintAddress`: Unique NFT identifier
- `skinTemplateId`: Links to skin_templates
- `userId`: Owner (nullable during mint, set on claim)
- `isBurnedBack`: Buyback status
- `buybackTxSignature`: Transaction proof

**`buyback_records`**: Audit trail
- `nftMint`, `userWallet`, `amountPaid`
- `txSignature`: On-chain proof

---

## Testing Checklist

### Pre-Production Testing

- [ ] Deploy to devnet first
- [ ] Test full mint → reveal → buyback flow
- [ ] Test with multiple wallets
- [ ] Test error cases (insufficient funds, invalid NFT, etc.)
- [ ] Load test reveal endpoint (concurrent requests)
- [ ] Verify treasury balance decreases correctly
- [ ] Verify NFTs are actually burned on-chain
- [ ] Test Candy Machine exhaustion (all items minted)
- [ ] Test with different wallet adapters (Phantom, Solflare, etc.)

### Post-Deployment Monitoring

- [ ] Monitor treasury balance (alert if below minimum)
- [ ] Monitor RPC rate limits
- [ ] Monitor database connections
- [ ] Track failed reveals (retry mechanism)
- [ ] Track failed buybacks (refund mechanism)
- [ ] Monitor for suspicious patterns (bot activity)

---

## Common Issues & Solutions

### Issue: "Metadata account not found"
**Cause**: NFT metadata not propagated yet  
**Solution**: Increase wait time in reveal (currently 10s, try 15-20s on mainnet)

### Issue: "Computational budget exceeded"
**Cause**: Transaction too complex  
**Solution**: Already handled with `setComputeUnitLimit(800_000)`

### Issue: "MissingRemainingAccount" (Candy Guard)
**Cause**: solPayment guard requires destination in mintArgs  
**Solution**: Already handled in `mintV2` call

### Issue: "URI too long"
**Cause**: Metadata URI > 200 characters  
**Solution**: Already handled with shortened placeholder URI

### Issue: "Treasury has insufficient balance"
**Cause**: Not enough SOL for buyback + min reserve  
**Solution**: Monitor treasury, add SOL when below threshold

### Issue: "NFT not found in user inventory"
**Cause**: Reveal failed or database not synced  
**Solution**: Check reveal logs, implement retry mechanism

---

## Security Best Practices

### ✅ DO

1. Use environment variables for all secrets
2. Use paid RPC endpoints with high rate limits (Helius, QuickNode)
3. Validate all user inputs on backend
4. Use wallet authentication for sensitive endpoints
5. Keep admin wallet private keys in secure vault (AWS Secrets Manager, etc.)
6. Enable database backups (daily minimum)
7. Use HTTPS only in production
8. Implement rate limiting on all endpoints
9. Log all buyback transactions for audit
10. Monitor treasury balance 24/7

### ❌ DON'T

1. Commit `.env` files to git
2. Log private keys, signatures, or sensitive data
3. Use devnet RPC in production
4. Allow unlimited minting per user
5. Trust client-side calculations (always verify on backend)
6. Use `DB_SYNCHRONIZE=true` in production
7. Expose admin endpoints publicly
8. Skip input validation
9. Use weak JWT secrets
10. Ignore error logs

---

## Production Differences from Test Setup

| Aspect | Test/Dev | Production |
|--------|----------|------------|
| Network | Devnet | Mainnet |
| RPC | Free public RPC | Paid RPC (Helius/QuickNode) |
| Candy Machine | 10-100 items | 10,000+ items |
| Treasury | Test wallet | Secure multi-sig wallet |
| Database | Local PostgreSQL | Managed DB (AWS RDS, etc.) |
| SOL Price | Hardcoded $200 | Real-time oracle |
| Metadata | Placeholder URIs | Real Arweave uploads |
| Monitoring | Console logs | APM (Datadog, New Relic) |
| Error Handling | Basic | Comprehensive + alerts |
| Wallet Auth | Optional | Required for all actions |

---

## Support & Maintenance

### Regular Tasks

- **Daily**: Check treasury balance, monitor error logs
- **Weekly**: Review buyback records, check for anomalies
- **Monthly**: Update SOL price oracle, review rarity distribution
- **Quarterly**: Audit smart contract security, review access controls

### Upgrade Path

When updating the buyback program:
1. Deploy new program version
2. Initialize new config PDA
3. Migrate treasury funds
4. Update backend `BUYBACK_PROGRAM_ID`
5. Test on devnet first
6. Gradual rollout (feature flag)

---

## Contact & Resources

- **Anchor Docs**: https://www.anchor-lang.com/
- **Metaplex Docs**: https://developers.metaplex.com/
- **Sugar CLI**: https://developers.metaplex.com/candy-machine/sugar
- **Solana Cookbook**: https://solanacookbook.com/

---

