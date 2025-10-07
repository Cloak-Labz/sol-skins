# 🚀 Quick Start - Pack System

## Setup (2 minutes)

### 1. Create `.env.local` in `src/client/`

```bash
NEXT_PUBLIC_SOLANA_CLUSTER=devnet
NEXT_PUBLIC_ADMIN_WALLET=YourWalletPublicKeyHere
```

**Get your wallet address:** Open Phantom → Settings → Copy public key

### 2. Get Devnet SOL

```bash
solana airdrop 2 <YOUR_WALLET> --url devnet
```

Or use: https://faucet.solana.com

---

## First Time Setup (Admin)

### 1. Start Dev Server

```bash
cd src/client
pnpm dev
```

### 2. Initialize Program

Go to: `http://localhost:3000/app-dashboard/packs/admin`

- Connect wallet
- Enter oracle pubkey (can use your wallet for testing)
- Click "Initialize Program"

### 3. Publish First Batch

Still on admin page:

- **Batch ID:** `0`
- **Candy Machine:** `11111111111111111111111111111111` (placeholder)
- **Metadata URIs:** (one per line)
  ```
  https://arweave.net/example1.json
  https://arweave.net/example2.json
  https://arweave.net/example3.json
  ```
- Click "Publish Batch"

---

## Open Packs (Users)

Go to: `http://localhost:3000/app-dashboard/packs`

1. Connect wallet
2. Select a pack
3. Click "Open Pack"
4. Wait for VRF (needs backend service running)
5. Click "Mint NFT" when revealed

---

## Backend VRF Service

**Important:** For packs to work, run the VRF service:

```bash
cd src/server
npm run vrf
```

This listens for VRF requests and fulfills them with randomness.

---

## Pages

- **User Pack Opening:** `/app-dashboard/packs`
- **Admin Panel:** `/app-dashboard/packs/admin` (gated by wallet)

---

## What Was Built

✅ Full onchain pack system  
✅ VRF-powered randomness  
✅ User pack opening page with animations  
✅ Admin panel for batch management  
✅ All instruction utilities (create, open, reveal, publish)  
✅ Environment variable setup  

---

## Need Help?

See `PACK_INTEGRATION_COMPLETE.md` for detailed documentation.

---

**Status:** ✅ Ready to use!

