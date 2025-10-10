# Simple Solana Setup Guide

This document explains the simplified Solana integration where NFTs are owned by an admin wallet and distributed via simple transfers.

## Architecture Overview

### How It Works

1. **Admin Mints NFTs** → NFTs live in admin wallet with price metadata
2. **Admin Creates Packages** → Backend selects NFTs to compose packages
3. **User Pays** → User sends SOL directly to admin wallet pubkey
4. **Backend Randomizes** → Off-chain random selection determines which NFT user won
5. **User Chooses**:
   - **Claim (Option 2)**: NFT is transferred from admin wallet to user wallet
   - **Buyback (Option 1)**: SOL is sent from admin wallet to user (85% of NFT value)

### No Complex Programs Needed!

- ❌ No VRF oracles
- ❌ No complex Anchor programs
- ❌ No Candy Machines for randomization
- ✅ Just simple SOL and NFT transfers
- ✅ Off-chain randomization (provably fair)
- ✅ Direct wallet-to-wallet transfers

## Environment Configuration

Add these to `src/server/.env`:

```bash
# Solana Configuration
SOLANA_RPC_URL=https://api.devnet.solana.com
ADMIN_PRIVATE_KEY=<base58_encoded_private_key>
ADMIN_WALLET=<admin_wallet_pubkey>

# Randomization
RANDOMIZATION_SECRET=<long_random_string>

# Buyback
BUYBACK_PERCENTAGE=85
MIN_BUYBACK_AMOUNT=0.01
```

### Getting Admin Wallet Credentials

#### Option 1: Generate New Wallet

```bash
cd src/server
node -e "const {Keypair} = require('@solana/web3.js'); const bs58 = require('bs58'); const kp = Keypair.generate(); console.log('Public Key:', kp.publicKey.toBase58()); console.log('Private Key (base58):', bs58.encode(kp.secretKey));"
```

#### Option 2: Use Existing Wallet

```bash
# If you have a Solana CLI wallet
solana-keygen pubkey ~/.config/solana/id.json

# Convert to base58 for ADMIN_PRIVATE_KEY
node -e "const fs = require('fs'); const bs58 = require('bs58'); const key = JSON.parse(fs.readFileSync(process.env.HOME + '/.config/solana/id.json')); console.log(bs58.encode(Buffer.from(key)));"
```

#### Fund Admin Wallet (Devnet)

```bash
solana airdrop 2 <ADMIN_WALLET> --url devnet
```

## Flow Diagrams

### Package Opening Flow

```
User                    Backend                 Blockchain
  |                        |                         |
  |--1. Pay Package------> |                         |
  |    (SOL transfer)      |                         |
  |                        |--2. Verify Payment----> |
  |                        |<--Payment Confirmed-----|
  |                        |                         |
  |                        |--3. Randomize NFT----   |
  |                        |   (off-chain)        |  |
  |                        |<---------------------   |
  |                        |                         |
  |<--4. Show Result-------|                         |
  |    (NFT details)       |                         |
  |                        |                         |
  |--5. Choose Option----> |                         |
  |                        |                         |
```

### Option 1: Buyback (85%)

```
User                    Backend                 Blockchain
  |                        |                         |
  |--Choose Buyback------> |                         |
  |                        |--Send SOL (85%)-------> |
  |                        |   (admin -> user)       |
  |<-----------------------|<--Tx Confirmed----------|
  |   Credited 85%         |                         |
  |                        |                         |
```

### Option 2: Claim NFT

```
User                    Backend                 Blockchain
  |                        |                         |
  |--Choose Claim--------> |                         |
  |                        |--Transfer NFT---------> |
  |                        |   (admin -> user)       |
  |<-----------------------|<--Tx Confirmed----------|
  |   NFT in Wallet        |                         |
  |                        |                         |
```

## Backend Services

### SimpleSolanaService

Located at `src/server/services/simpleSolana.service.ts`

**Key Methods:**

```typescript
// Verify user paid for package
await simpleSolanaService.verifyPayment({
  userWallet: '...',
  expectedAmount: 0.1, // SOL
  timeWindow: 60 // seconds
});

// Transfer NFT to user (claim)
await simpleSolanaService.transferNFT({
  nftMint: '...',
  toWallet: userWallet
});

// Send SOL to user (buyback)
await simpleSolanaService.sendSOL({
  toWallet: userWallet,
  amount: 0.085 // 85% buyback
});

// Execute full buyback (SOL to user, NFT back to admin)
await simpleSolanaService.executeBuyback({
  userWallet: '...',
  nftMint: '...',
  buybackPrice: 0.085
});
```

### RandomizationService

Located at `src/server/services/randomization.service.ts`

**Provably Fair Random Selection:**

```typescript
// Generate random value
const random = randomizationService.generateRandom(
  `${userId}_${packageId}_${timestamp}`
);

// Select NFT from weighted pool
const { item, probability } = randomizationService.selectFromWeightedPool(
  random.value,
  nftPool
);
```

## API Endpoints

### 1. Open Package

```http
POST /api/v1/cases/open
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "lootBoxTypeId": "uuid",
  "paymentMethod": "SOL"
}
```

**Response:**
```json
{
  "caseOpeningId": "uuid",
  "nftMintAddress": "...",
  "transaction": "...",
  "skinResult": {
    "id": "uuid",
    "weapon": "AK-47",
    "skinName": "Redline",
    "rarity": "Classified",
    "currentPriceUsd": 10.50,
    "imageUrl": "..."
  },
  "randomization": {
    "seed": "user_pack_timestamp",
    "value": 0.742...,
    "hash": "sha256_hash",
    "probability": 0.15
  }
}
```

### 2. Make Decision

```http
POST /api/v1/cases/:id/decision
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "decision": "keep" | "buyback"
}
```

**Response (Keep):**
```json
{
  "decision": "keep",
  "nftMintAddress": "...",
  "transaction": "...",
  "message": "NFT transferred to your wallet"
}
```

**Response (Buyback):**
```json
{
  "decision": "buyback",
  "buybackPrice": 8.925,
  "transaction": "...",
  "message": "Buyback executed - SOL sent to your wallet"
}
```

## Frontend Integration

### Payment Flow

```typescript
// 1. User sees package price
const packagePrice = 0.1; // SOL
const adminWallet = "2WvsSYZVwkes2UZegMQPrPTjbYJ48tgSnqwQDGNfrKrg";

// 2. User sends SOL to admin wallet
const transaction = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: wallet.publicKey,
    toPubkey: new PublicKey(adminWallet),
    lamports: packagePrice * LAMPORTS_PER_SOL,
  })
);

const signature = await wallet.sendTransaction(transaction, connection);
await connection.confirmTransaction(signature);

// 3. Call backend to open package
const response = await fetch('/api/v1/cases/open', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    lootBoxTypeId: packageId,
    paymentMethod: 'SOL',
    paymentTransaction: signature // Include for verification
  })
});

const result = await response.json();
// Immediately show NFT result (no polling needed!)
```

### Claim Flow

```typescript
// User chooses to claim NFT
const response = await fetch(`/api/v1/cases/${caseOpeningId}/decision`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    decision: 'keep'
  })
});

const result = await response.json();
// NFT is now in user's wallet!
// result.transaction contains the transfer signature
```

### Buyback Flow

```typescript
// User chooses buyback
const response = await fetch(`/api/v1/cases/${caseOpeningId}/decision`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    decision: 'buyback'
  })
});

const result = await response.json();
// User receives 85% SOL in their wallet!
// result.buybackPrice shows amount
// result.transaction contains the transfer signature
```

## Security Considerations

### Payment Verification

The backend **MUST** verify payment before revealing NFT:

```typescript
// Before revealing NFT result
const paymentVerified = await simpleSolanaService.verifyPayment({
  userWallet: user.walletAddress,
  expectedAmount: packagePrice,
  timeWindow: 60 // Only check last 60 seconds
});

if (!paymentVerified.verified) {
  throw new Error('Payment not found or invalid');
}
```

### Admin Wallet Security

- ⚠️ **Never expose private key** in client-side code
- ✅ Store `ADMIN_PRIVATE_KEY` in secure environment variables
- ✅ Use separate wallets for dev/staging/production
- ✅ Regularly rotate admin wallet if compromised
- ✅ Monitor admin wallet balance and transactions

### Randomization Security

- ✅ Use `RANDOMIZATION_SECRET` to prevent manipulation
- ✅ Include timestamp in seed to prevent replay
- ✅ Log all randomization results for auditing
- ✅ Make random hash verifiable by users

## Testing

### 1. Test Payment Verification

```bash
# Terminal 1: Start server
cd src/server
npm run dev

# Terminal 2: Send test payment
solana transfer <ADMIN_WALLET> 0.1 --url devnet --allow-unfunded-recipient

# Terminal 3: Test API
curl -X POST http://localhost:3002/api/v1/cases/open \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"lootBoxTypeId": "uuid", "paymentMethod": "SOL"}'
```

### 2. Test NFT Transfer

```bash
# Check admin NFT balance
spl-token accounts --owner <ADMIN_WALLET>

# Open package and claim
curl -X POST http://localhost:3002/api/v1/cases/<id>/decision \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"decision": "keep"}'

# Verify NFT in user wallet
spl-token accounts --owner <USER_WALLET>
```

### 3. Test Buyback

```bash
# Check admin SOL balance before
solana balance <ADMIN_WALLET>

# Execute buyback
curl -X POST http://localhost:3002/api/v1/cases/<id>/decision \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"decision": "buyback"}'

# Check balances after
solana balance <ADMIN_WALLET>
solana balance <USER_WALLET>
```

## Advantages of This Approach

✅ **Simple**: Just basic SOL and NFT transfers
✅ **Fast**: No waiting for VRF or complex on-chain operations
✅ **Cheap**: Only transfer fees, no program fees
✅ **Testable**: Easy to test with devnet
✅ **Flexible**: Easy to adjust buyback percentage
✅ **Transparent**: All transactions visible on-chain
✅ **Scalable**: Backend handles randomization

## Future Enhancements

### Phase 2: Add Instant Transfer Confirmation

Currently requires manual verification. Could add webhooks or websockets for instant confirmation.

### Phase 3: Support Multiple Payment Methods

- SOL (current)
- USDC
- Credit card (via third-party processor)

### Phase 4: Add Admin Dashboard

- View all NFTs in admin wallet
- Set prices for each NFT
- Create/manage packages
- View transaction history
- Monitor buyback volume

### Phase 5: On-Chain Program (Optional)

If needed for trustlessness, could move to on-chain program while keeping same UX.

## Troubleshooting

### "Payment not found"

- Check user wallet has sufficient SOL
- Verify payment was sent to correct admin wallet
- Check timeWindow is long enough (increase to 120 seconds)
- Confirm transaction on Solscan

### "Failed to transfer NFT"

- Verify NFT exists in admin wallet
- Check user has associated token account (auto-created)
- Ensure admin wallet has enough SOL for transaction fees
- Verify NFT mint address is correct

### "Insufficient admin balance"

- Admin wallet needs SOL for:
  - Transaction fees (~0.000005 SOL per tx)
  - Buyback payments (85% of NFT values)
- Fund admin wallet with: `solana airdrop 5 <ADMIN_WALLET> --url devnet`

## Support

For issues or questions:
- Check server logs: `tail -f src/server/logs/combined.log`
- Enable debug logging: `LOG_LEVEL=debug` in `.env`
- Verify environment variables are set correctly
- Test on devnet before production

