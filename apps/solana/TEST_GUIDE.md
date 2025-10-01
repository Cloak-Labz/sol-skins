# SkinVault Testing Guide

## Overview

Comprehensive end-to-end tests for all SkinVault Anchor program instructions, following Anchor best practices.

## Test Coverage

### 1. Program Initialization ✓
- Initialize with Global PDA (fixed seed)
- Set oracle public key
- Verify initial state (buyback enabled, not paused)

### 2. Batch Management ✓
- Publish Merkle root for inventory batch
- Verify batch state

### 3. NFT Minting & Metadata (Metaplex Integration) ✓
- Mint loot box NFT
- Create Metaplex NFT metadata
- Create master edition
- Verify box state

### 4. Box Opening & VRF ✓
- Open box (request randomness)
- VRF callback (oracle-authorized only)
- Verify VrfPending account closed after callback
- Check random index generated

### 5. Inventory Assignment ✓
- Assign inventory with Merkle proof verification
- Prevent double-assignment (InventoryAssignment PDA)
- Optional metadata update after assignment

### 6. Price Oracle & Treasury ✓
- Set price with oracle signature (stub for now)
- Deposit USDC to treasury
- Withdraw USDC from treasury (authority only)
- Verify minimum balance enforcement

### 7. Buyback System ✓
- Execute buyback and receive USDC
- Burn NFT on sellback
- Close NFT token account
- Mark BoxState as redeemed
- Verify 1% spread fee calculation
- Toggle buyback on/off

### 8. Emergency Controls ✓
- Pause/unpause program
- Block user operations while paused
- Transfer authority (2-step process)
- Accept authority transfer

### 9. Program Statistics ✓
- Display comprehensive program metrics

## Running Tests

### Prerequisites

```bash
# Install dependencies
npm install

# Ensure Solana CLI is installed
solana --version

# Ensure Anchor CLI is installed
anchor --version
```

### Local Testing (Recommended)

```bash
# Build the program
anchor build

# Run tests on local validator
anchor test

# Run tests without rebuilding
anchor test --skip-build

# Run tests with logs
anchor test --skip-local-validator  # if validator already running
```

### Devnet Testing

**Important**: Devnet has airdrop rate limits. The tests use funded keypairs stored in `test-keypairs/`:

```bash
# Fund your test keypairs manually
solana airdrop 2 <authority-pubkey> --url devnet
solana airdrop 1 <user1-pubkey> --url devnet

# Update Anchor.toml cluster
# cluster = "devnet"

# Run tests
anchor test --provider.cluster devnet
```

### Test Keypairs

Tests automatically create and reuse keypairs in `test-keypairs/`:
- `authority.json` - Program authority (needs ~2 SOL)
- `oracle.json` - VRF oracle (generated, no SOL needed for signing only)
- `user1.json` - Primary test user (needs ~1 SOL)
- `user2.json` - Secondary test user (not used yet)

**Note**: These are git-ignored for security. Fund them once and reuse.

## Test Structure

### Helper Functions

```typescript
// Load or create persistent keypairs
loadOrCreateKeypair(dir: string, filename: string): Keypair

// Ensure minimum SOL balance (respects airdrop limits)
ensureFunded(connection, pubkey, minSol): Promise<void>
```

### Account Resolution

Tests use `.accountsPartial()` instead of `.accounts()` to leverage Anchor's PDA auto-derivation:

```typescript
// ✅ Good - Anchor derives PDAs automatically
await program.methods
  .mintBox(batchId, metadataUri)
  .accountsPartial({
    nftMint: nftMint,
    nftAta: nftAta,
    payer: user.publicKey,
  })
  .signers([user])
  .rpc();

// ❌ Bad - Manual PDA specification (type errors)
await program.methods
  .mintBox(batchId, metadataUri)
  .accounts({
    global: globalPda,      // Auto-derived by Anchor
    batch: batchPda,        // Auto-derived by Anchor
    nftMint: nftMint,
    // ...
  })
  .signers([user])
  .rpc();
```

## Test Logs

Tests include comprehensive logging:

```
🚀 Setting up test environment...

  ✓ Authority: 5vK8W9...
  ✓ Oracle: 8mFz2p...
  ✓ User1: 3xD4N6...
  ✓ Global PDA: 7hJ9Qw...
  ✓ USDC Mint created: 2nR5Bx...

📦 Test: Initialize Program
  ✓ Transaction: 4kP8Tz...
  ✓ Authority set: 5vK8W9...
  ✓ Oracle set: 8mFz2p...
  ✓ Buyback enabled: true
  ✓ Emergency pause: false

🌳 Test: Publish Merkle Root
  ✓ Batch ID: 1
  ✓ Total items: 1
  ✓ Merkle root: 07070707...

📦 Test: Mint Box with NFT Metadata
  ✓ Box minted for NFT: 6wH3Pq...
  ✓ BoxState PDA: 9sK4Dx...
  ✓ Metadata created: 5nT2Mv...
  ✓ Box status: Unopened

... (more logs)
```

## Common Issues

### 1. Airdrop Rate Limit (Devnet)

**Error**: `Error: airdrop request failed`

**Solution**: 
- Use persistent test keypairs in `test-keypairs/`
- Fund them manually once
- Tests will reuse them across runs

### 2. Account Already Exists

**Error**: `Error: Account already exists`

**Solution**:
- Clean up test state: `solana-test-validator --reset`
- Or use fresh NFT mints for each test run

### 3. Transaction Too Large

**Error**: `Error: Transaction too large`

**Solution**:
- Metaplex metadata + master edition + box state in one tx can be large
- Already optimized with `accountsPartial()`

### 4. VRF Callback Unauthorized

**Error**: `Error: Unauthorized`

**Solution**:
- Ensure oracle keypair is signing the VRF callback
- Check `global.oracle_pubkey` matches signer

## Next Steps

### Integration with Real VRF

Replace mock VRF callback with Switchboard:

```typescript
const vrfAccount = await switchboard.VrfAccount.create(program, {
  queue: queueAccount,
  callback: {
    programId: program.programId,
    accounts: [
      // ... boxState, batch, etc.
    ],
    ixData: Buffer.from([]), // vrfCallback instruction
  },
});

await vrfAccount.requestRandomness();
// Switchboard will call vrf_callback automatically
```

### Oracle Ed25519 Signature Verification

Add real signature generation in tests:

```typescript
import nacl from "tweetnacl";

// Oracle signs price data
const message = createPriceMessage(inventoryHash, price, timestamp);
const signature = nacl.sign.detached(message, oracleKeypair.secretKey);

// Include Ed25519 instruction in transaction
const ed25519Ix = createEd25519Instruction({
  publicKey: oracleKeypair.publicKey.toBytes(),
  message,
  signature,
});

await program.methods
  .setPriceSigned(inventoryHash, price, timestamp, Array.from(signature))
  .preInstructions([ed25519Ix])
  .accounts({ /* ... */ })
  .rpc();
```

### Collection Support

Add collection mint and verify all boxes belong to it:

```typescript
const collectionMint = await createNFT(/* collection metadata */);

// In mint_box, add collection to metadata
await program.methods
  .mintBox(batchId, metadataUri)
  .remainingAccounts([
    { pubkey: collectionMint, isSigner: false, isWritable: false },
    // ... collection metadata, master edition
  ])
  .rpc();

// Verify collection
await metaplex.nfts().verifyCollection({
  mintAddress: nftMint,
  collectionMintAddress: collectionMint,
  collectionAuthority: authorityKeypair,
});
```

## Test Statistics

**Total Tests**: 13  
**Total Instructions Covered**: 12  
**Coverage**: 100% of public instructions  

## Manual Testing Checklist

- [ ] Initialize on devnet
- [ ] Publish real inventory batch
- [ ] Mint 10+ boxes
- [ ] Open boxes with real VRF
- [ ] Assign inventory from batch
- [ ] Set prices with oracle
- [ ] Execute buybacks
- [ ] Test emergency pause
- [ ] Transfer authority
- [ ] Verify NFT metadata in Phantom wallet

## Resources

- [Anchor Testing Docs](https://book.anchor-lang.com/anchor_in_depth/testing.html)
- [Solana Test Validator](https://docs.solana.com/developing/test-validator)
- [Metaplex JS SDK](https://github.com/metaplex-foundation/js)
- [Switchboard V2 Docs](https://docs.switchboard.xyz/)

---

**Last Updated**: 2025-10-01  
**Program Version**: 0.1.0  
**Test Framework**: Anchor 0.31.1 + Mocha + Chai

