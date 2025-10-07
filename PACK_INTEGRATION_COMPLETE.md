# 🎮 Pack System Integration - Complete

## ✅ Integration Complete!

The full onchain pack/loot box system has been integrated into your app with:
- User-facing pack opening page with VRF-powered randomness
- Admin panel for batch management
- Complete instruction utilities for all operations

---

## 📦 What Was Built

### 1. **Instruction Utilities** (`src/client/lib/solana/instructions/`)

All operations needed for the pack system:

- ✅ `initialize.ts` - Initialize the SkinVault program (one-time admin setup)
- ✅ `create-box.ts` - Create a new loot box tied to a batch
- ✅ `open-box.ts` - Open a box and request VRF randomness
- ✅ `reveal-and-claim.ts` - Reveal the result and mint the NFT
- ✅ `publish-batch.ts` - Publish a new batch (admin only)

### 2. **User Pack Page** (`/app-dashboard/packs`)

Full pack opening flow:
- Browse available batches loaded from on-chain
- Select and open packs
- VRF-powered randomness with visual feedback
- Roulette-style reveal animation
- NFT minting on reveal

### 3. **Admin Panel** (`/app-dashboard/packs/admin`)

Gated admin interface for:
- Program initialization (one-time setup)
- Publishing new batches with metadata URIs
- Viewing all published batches
- Monitoring batch statistics (minted, opened, etc.)

---

## 🚀 Setup Instructions

### Step 1: Environment Variables

Create `src/client/.env.local`:

```bash
# Solana Configuration
NEXT_PUBLIC_SOLANA_CLUSTER=devnet

# Admin Wallet (get from Phantom/Solflare wallet)
NEXT_PUBLIC_ADMIN_WALLET=YourAdminWalletPublicKeyHere

# Optional: Custom RPC (if needed)
# NEXT_PUBLIC_RPC_ENDPOINT=https://api.devnet.solana.com
```

**To get your admin wallet address:**
1. Open Phantom or Solflare
2. Click on your wallet name/settings
3. Copy the public key (starts with uppercase letters/numbers)
4. Paste into `NEXT_PUBLIC_ADMIN_WALLET`

### Step 2: Get Devnet SOL

Your admin wallet needs SOL for transactions:

```bash
# Using Solana CLI
solana airdrop 2 <YOUR_ADMIN_WALLET> --url devnet

# Or use Solana faucet
# https://faucet.solana.com
```

### Step 3: Initialize the Program

1. Start the dev server:
   ```bash
   cd src/client
   pnpm dev
   ```

2. Open your browser:
   ```
   http://localhost:3000/app-dashboard/packs/admin
   ```

3. Connect your admin wallet (Phantom/Solflare)

4. **Initialize Program:**
   - Enter an oracle public key (can use your admin wallet for testing)
   - Click "Initialize Program"
   - Approve the transaction

5. **Publish First Batch:**
   - Batch ID: `0` (start from 0)
   - Candy Machine: Any valid pubkey (can use a placeholder like `11111111111111111111111111111111`)
   - Metadata URIs: One URI per line, e.g.:
     ```
     https://arweave.net/skin1.json
     https://arweave.net/skin2.json
     https://arweave.net/skin3.json
     ```
   - Click "Publish Batch"

---

## 🎮 User Flow (Opening Packs)

### Step 1: User Opens Pack Page

Navigate to: `http://localhost:3000/app-dashboard/packs`

### Step 2: User Selects Pack

- View available batches (loaded from on-chain)
- See pack details: items count, price in SOL
- See drop rates/odds

### Step 3: User Opens Pack

1. Click "Open Pack"
2. Transaction flow:
   - **Phase 1 (Creating):** Box PDA is created on-chain
   - **Phase 2 (Waiting):** VRF randomness is requested
   - **Phase 3 (Spinning):** Waiting for VRF fulfillment (backend oracle)
   - **Phase 4 (Revealing):** Roulette animation shows result

### Step 4: User Claims NFT

- Modal shows the won skin
- Click "Mint NFT" to trigger `reveal_and_claim`
- NFT is minted to user's wallet (Metaplex Core)

---

## 🔧 Backend VRF Service

**Important:** The VRF oracle service must be running to fulfill randomness requests.

Your backend needs to:
1. Listen for `VrfPending` accounts
2. Generate randomness (or use external VRF)
3. Call `vrf_callback` instruction with the randomness

See: `src/server/services/VrfService.ts` (already created in your backend)

---

## 📊 Admin Operations

### Initialize Program (One-Time)

```typescript
import { initializeProgram, getUSDCMint } from '@/lib/solana';

const result = await initializeProgram({
  program,
  authority: adminWallet,
  oraclePubkey: oracleWallet,
  usdcMint: getUSDCMint('devnet'),
});
```

### Publish Batch

```typescript
import { publishBatch } from '@/lib/solana';

const result = await publishBatch({
  program,
  authority: adminWallet,
  batchId: 0,
  candyMachine: collectionPubkey,
  metadataUris: [
    'https://arweave.net/skin1.json',
    'https://arweave.net/skin2.json',
    // ...
  ],
});
```

---

## 🎯 User Operations (Client-Side)

### Create Box

```typescript
import { createBox } from '@/lib/solana';

const { boxAsset, signature } = await createBox({
  program,
  batchId: 0,
  owner: userWallet,
});
```

### Open Box

```typescript
import { openBox, waitForVrf } from '@/lib/solana';

// Request VRF
const { signature } = await openBox({
  program,
  boxAsset,
  owner: userWallet,
  poolSize: batch.totalItems,
});

// Wait for fulfillment
const fulfilled = await waitForVrf(program, boxAsset);
```

### Reveal and Claim NFT

```typescript
import { revealAndClaim } from '@/lib/solana';

const result = await revealAndClaim({
  program,
  boxAsset,
  owner: userWallet,
});

console.log('Random index:', result.randomIndex);
console.log('Assigned inventory:', result.assignedInventory);
```

---

## 🗂️ File Structure

```
src/client/
├── app/app-dashboard/
│   └── packs/
│       ├── page.tsx              # User pack opening page
│       └── admin/
│           └── page.tsx          # Admin panel
├── lib/solana/
│   ├── config/
│   │   └── anchor-client.ts      # Anchor program setup
│   ├── utils/
│   │   └── pda.ts                # PDA derivation helpers
│   ├── accounts/
│   │   └── fetch.ts              # Account fetching
│   ├── instructions/
│   │   ├── initialize.ts         # Initialize program
│   │   ├── create-box.ts         # Create loot box
│   │   ├── open-box.ts           # Open box + VRF
│   │   ├── reveal-and-claim.ts   # Reveal and mint NFT
│   │   └── publish-batch.ts      # Publish batch (admin)
│   └── index.ts                  # Exports
└── .env.example                  # Environment template
```

---

## 🔐 Security & Access Control

### Admin Panel Access

- Only the wallet specified in `NEXT_PUBLIC_ADMIN_WALLET` can access `/packs/admin`
- Non-admin wallets see "Access Denied" screen
- Admin operations (initialize, publish batch) are restricted on-chain by program authority

### User Operations

- Any connected wallet can:
  - View batches
  - Create boxes (if they pay the required SOL)
  - Open their own boxes
  - Reveal and claim their NFTs

---

## 📈 What's On-Chain

### Box Lifecycle

```
1. [Empty] → Create Box (BoxState PDA)
   ↓
2. [Created] → Open Box (VrfPending PDA)
   ↓
3. [VRF Pending] → VRF Callback (randomness fulfilled)
   ↓
4. [Opened] → Reveal & Claim (NFT minted)
   ↓
5. [Revealed] → Optionally: Sell Back (burn NFT, get USDC)
```

### Data Stored

- **Global:** Authority, oracle, USDC mint, buyback settings
- **Batch:** Metadata URIs, merkle root, item count, statistics
- **BoxState:** Owner, batch ID, random index, assigned inventory, timestamps
- **VrfPending:** Temporary account for VRF requests

---

## 🧪 Testing Checklist

- [ ] Environment variables configured
- [ ] Admin wallet has devnet SOL
- [ ] Program initialized via admin panel
- [ ] At least one batch published
- [ ] VRF service running (backend)
- [ ] User can view packs
- [ ] User can open pack (creates box on-chain)
- [ ] VRF fulfills (check backend logs)
- [ ] User sees reveal animation
- [ ] User can mint NFT

---

## 🐛 Troubleshooting

### "Admin Access Required"
→ Check `NEXT_PUBLIC_ADMIN_WALLET` matches your connected wallet exactly

### "Failed to load packs from blockchain"
→ Program may not be initialized yet, go to admin panel first

### "VRF timeout"
→ Backend VRF service is not running or not fulfilling requests

### "Account not found"
→ Batch doesn't exist, publish a batch from admin panel

### "Simulation failed"
→ Check wallet has enough SOL, or check on-chain program state

---

## 📚 Additional Resources

- **Onchain Interactions Guide:** `ONCHAIN_INTERACTIONS.md`
- **VRF Guide:** `VRF_GUIDE.md`
- **Solana Admin API:** `SOLANA_ADMIN_API.md`

---

## ✅ Status

- **User Pack Page:** ✅ Complete
- **Admin Panel:** ✅ Complete
- **Instruction Utilities:** ✅ Complete
- **Environment Config:** ✅ Ready
- **Documentation:** ✅ Ready

**Next Steps:**
1. Set `NEXT_PUBLIC_ADMIN_WALLET` in `.env.local`
2. Initialize program via admin panel
3. Publish batches
4. Start VRF backend service
5. Test pack opening!

---

🎉 **Your onchain pack system is ready to use!**

