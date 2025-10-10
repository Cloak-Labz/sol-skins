# Setup Checklist - Simple Solana Integration

## ✅ What You Need to Complete

### 1. ⚠️ **MISSING: Admin Private Key in `.env`**

**Current Status:** ❌ Not configured
```bash
# src/server/.env currently has:
ADMIN_PRIVATE_KEY=your-base58-encoded-private-key-here  # ❌ Placeholder
```

**Action Required:**
```bash
# Run the setup script:
cd src/server
node scripts/setup-admin-wallet.js

# Then copy the generated ADMIN_PRIVATE_KEY to .env
```

**Or manually:**
```bash
# Generate wallet
node -e "const {Keypair} = require('@solana/web3.js'); const bs58 = require('bs58'); const kp = Keypair.generate(); console.log('Public:', kp.publicKey.toBase58()); console.log('Private:', bs58.encode(kp.secretKey));"

# Add to src/server/.env:
ADMIN_PRIVATE_KEY=<generated_private_key>
ADMIN_WALLETS=<generated_public_key>
```

---

### 2. ⚠️ **MISSING: Fund Admin Wallet**

**Current Status:** ❌ New wallet has 0 SOL

**Action Required:**
```bash
# After generating wallet, fund it on devnet
solana airdrop 5 <ADMIN_WALLET_PUBKEY> --url devnet

# Verify balance
solana balance <ADMIN_WALLET_PUBKEY> --url devnet
```

---

### 3. ⚠️ **MISSING: Update Frontend `.env.local`**

**Current Status:** ⚠️ Has old wallet address
```bash
# src/client/.env.local currently has:
NEXT_PUBLIC_ADMIN_WALLET=mgfSqUe1qaaUjeEzuLUyDUx5Rk4fkgePB5NtLnS3Vxa  # Old address
```

**Action Required:**
```bash
# Update src/client/.env.local with new admin wallet:
NEXT_PUBLIC_ADMIN_WALLET=<NEW_ADMIN_WALLET_PUBKEY>
```

---

### 4. ⚠️ **MISSING: Randomization Secret**

**Current Status:** ✅ Already added to `.env` (auto-generated)
```bash
RANDOMIZATION_SECRET=$(openssl rand -base64 32)
```

**Verify:**
```bash
grep RANDOMIZATION_SECRET src/server/.env
```

---

### 5. ⚠️ **MISSING: Update CaseOpeningService**

**Current Status:** ❌ Still using `mockSolanaService`
```typescript
// src/server/services/CaseOpeningService.ts
import { mockSolanaService } from './mockSolana.service';  // ❌ Mock
```

**Action Required:**
```typescript
// Change to:
import { simpleSolanaService } from './simpleSolana.service';  // ✅ Real

// Update all mockSolanaService calls to simpleSolanaService
```

---

### 6. ⚠️ **MISSING: Update InventoryService**

**Current Status:** ❌ Still using `mockSolanaService`

**Action Required:**
```typescript
// src/server/services/InventoryService.ts
import { simpleSolanaService } from './simpleSolana.service';

// Update buyback to use real transfers
```

---

### 7. ⚠️ **MISSING: Add Payment Verification**

**Current Status:** ❌ Not checking if user actually paid

**Action Required:**
Add to `CaseOpeningService.openCase()`:
```typescript
// Verify user paid before revealing NFT
const paymentVerified = await simpleSolanaService.verifyPayment({
  userWallet: user.walletAddress,
  expectedAmount: lootBox.priceSol,
  timeWindow: 120 // 2 minutes
});

if (!paymentVerified.verified) {
  throw new AppError('Payment not found', 402, 'PAYMENT_REQUIRED');
}
```

---

### 8. ✅ **COMPLETED: Services Created**

- ✅ `SimpleSolanaService` - Real Solana integration
- ✅ `RandomizationService` - Provably fair randomization
- ✅ `MockSolanaService` - For testing (keep for dev)

---

### 9. ✅ **COMPLETED: Documentation**

- ✅ `docs/SIMPLE_SOLANA_SETUP.md` - Complete setup guide
- ✅ `docs/OFF_CHAIN_ARCHITECTURE.md` - Architecture overview
- ✅ `scripts/setup-admin-wallet.js` - Automated setup

---

## 📋 Complete Setup Flow

### Step 1: Generate Admin Wallet

```bash
cd src/server
node scripts/setup-admin-wallet.js
# Follow the prompts and save credentials
```

### Step 2: Update Environment Variables

**Backend (`src/server/.env`):**
```bash
# Add the generated credentials:
ADMIN_PRIVATE_KEY=<from_setup_script>
ADMIN_WALLETS=<from_setup_script>
BUYBACK_PERCENTAGE=85
MIN_BUYBACK_AMOUNT=0.01
```

**Frontend (`src/client/.env.local`):**
```bash
NEXT_PUBLIC_ADMIN_WALLET=<same_as_ADMIN_WALLETS>
```

### Step 3: Fund Admin Wallet

```bash
solana airdrop 5 <ADMIN_WALLET> --url devnet
solana balance <ADMIN_WALLET> --url devnet
```

### Step 4: Update Services

**File: `src/server/services/CaseOpeningService.ts`**

```typescript
// Line 11: Change import
- import { mockSolanaService } from './mockSolana.service';
+ import { simpleSolanaService } from './simpleSolana.service';

// In openCase() method, add payment verification:
async openCase(userId: string, data: {
  lootBoxTypeId: string;
  paymentMethod: 'SOL' | 'USDC';
}) {
  const lootBox = await this.lootBoxRepository.findById(data.lootBoxTypeId);
  // ... existing validation ...

  // ✅ ADD THIS: Verify payment
  const paymentVerified = await simpleSolanaService.verifyPayment({
    userWallet: user.walletAddress,
    expectedAmount: lootBox.priceSol,
    timeWindow: 120
  });

  if (!paymentVerified.verified) {
    throw new AppError(
      'Payment not found. Please ensure you sent the correct amount to the admin wallet.',
      402,
      'PAYMENT_REQUIRED'
    );
  }

  // Store payment transaction
  const paymentTx = paymentVerified.transaction;

  // ... rest of existing code ...
  
  // Change mockSolanaService to simpleSolanaService
- const nftResult = await mockSolanaService.mintNFT({...});
+ const nftResult = await simpleSolanaService.transferNFT({
+   nftMint: selectedSkin.nftMintAddress, // Assume NFT already minted
+   toWallet: user.walletAddress
+ });
}

// In makeDecision() method:
async makeDecision(caseOpeningId: string, decision: 'keep' | 'buyback') {
  // ... existing code ...
  
  if (decision === 'buyback') {
    const buybackPrice = currentPrice * 0.85;
    
    // Change mockSolanaService to simpleSolanaService
-   const buybackResult = await mockSolanaService.executeBuyback({...});
+   const buybackResult = await simpleSolanaService.executeBuyback({
+     userWallet: user.walletAddress,
+     nftMint: userSkin.nftMintAddress!,
+     buybackPrice
+   });
  } else {
    // 'keep' - NFT already transferred during openCase
    userSkin.claimed = true;
  }
  
  // ... rest of code ...
}
```

**File: `src/server/services/InventoryService.ts`**

```typescript
// Add import
+ import { simpleSolanaService } from './simpleSolana.service';

// Update sellSkin method
async sellSkin(userId: string, skinId: string) {
  // ... existing code ...
  
  // Change mockSolanaService to simpleSolanaService
- const buybackResult = await mockSolanaService.executeBuyback({...});
+ const buybackResult = await simpleSolanaService.executeBuyback({
+   userWallet: user.walletAddress,
+   nftMint: userSkin.nftMintAddress!,
+   buybackPrice
+ });
  
  // ... rest of code ...
}
```

### Step 5: Update Frontend Payment Flow

**File: `src/client/app/app-dashboard/open/[id]/page.tsx`**

Add payment step before opening case:

```typescript
const openCase = async () => {
  try {
    setIsOpening(true);
    
    // ✅ STEP 1: Send payment to admin wallet
    const adminWallet = process.env.NEXT_PUBLIC_ADMIN_WALLET;
    if (!adminWallet) {
      throw new Error('Admin wallet not configured');
    }

    toast.loading('Sending payment...', { id: 'payment' });
    
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey!,
        toPubkey: new PublicKey(adminWallet),
        lamports: lootBox.priceSol * LAMPORTS_PER_SOL,
      })
    );

    const signature = await wallet.sendTransaction(transaction, connection);
    await connection.confirmTransaction(signature);
    
    toast.success('Payment confirmed!', { id: 'payment' });

    // ✅ STEP 2: Open case (backend will verify payment)
    toast.loading('Opening case...', { id: 'opening' });
    
    const response = await casesService.openCase({
      lootBoxTypeId: lootBox.id,
      paymentMethod: "SOL",
      paymentTransaction: signature, // Send for verification
    });

    // ... rest of existing code ...
  } catch (err) {
    if (err.message.includes('PAYMENT_REQUIRED')) {
      toast.error('Payment not verified. Please try again.');
    } else {
      toast.error('Failed to open case: ' + err.message);
    }
  }
};
```

### Step 6: Test Everything

```bash
# Terminal 1: Start backend
cd src/server
npm run dev

# Terminal 2: Start frontend
cd src/client
npm run dev

# Terminal 3: Test payment
solana transfer <ADMIN_WALLET> 0.1 --url devnet --allow-unfunded-recipient

# Terminal 4: Check logs
tail -f src/server/logs/combined.log
```

---

## 🔍 Verification Checklist

After setup, verify:

- [ ] Admin wallet has balance: `solana balance <ADMIN_WALLET> --url devnet`
- [ ] Backend starts without errors: Check `npm run dev` output
- [ ] SimpleSolanaService initialized: Check logs for "SimpleSolanaService initialized"
- [ ] Frontend shows correct admin wallet
- [ ] Can send test payment to admin wallet
- [ ] Backend detects payment in `verifyPayment()`
- [ ] NFT transfer works (claim option)
- [ ] SOL transfer works (buyback option)

---

## 🚨 Common Issues

### Issue 1: "ADMIN_PRIVATE_KEY not set"
**Solution:** Run `node scripts/setup-admin-wallet.js` and add to `.env`

### Issue 2: "Payment not found"
**Solution:** 
- Check user sent SOL to correct admin wallet
- Increase `timeWindow` to 180 seconds
- Verify transaction on Solscan devnet

### Issue 3: "Failed to transfer NFT"
**Solution:**
- Ensure NFT exists in admin wallet
- Check admin wallet has SOL for tx fees
- Verify NFT mint address is correct

### Issue 4: "Insufficient admin balance"
**Solution:**
```bash
solana airdrop 5 <ADMIN_WALLET> --url devnet
```

---

## 📊 Current Status Summary

| Component | Status | Action Needed |
|-----------|--------|---------------|
| SimpleSolanaService | ✅ Created | None |
| RandomizationService | ✅ Created | None |
| Documentation | ✅ Complete | None |
| Setup Script | ✅ Created | Run it |
| Admin Wallet | ⚠️ Generated | Fund it |
| Environment Vars | ⚠️ Partial | Update ADMIN_PRIVATE_KEY |
| CaseOpeningService | ❌ Using Mock | Update to SimpleSolana |
| InventoryService | ❌ Using Mock | Update to SimpleSolana |
| Payment Verification | ❌ Missing | Add to openCase() |
| Frontend Payment | ❌ Missing | Add transfer step |

---

## 🎯 Next Steps (Priority Order)

1. **CRITICAL:** Run `node scripts/setup-admin-wallet.js`
2. **CRITICAL:** Update `.env` with generated credentials
3. **CRITICAL:** Fund admin wallet with `solana airdrop`
4. **HIGH:** Update CaseOpeningService to use SimpleSolana
5. **HIGH:** Add payment verification to openCase()
6. **MEDIUM:** Update frontend payment flow
7. **MEDIUM:** Update InventoryService buyback
8. **LOW:** Test complete flow end-to-end

---

## 📞 Support

If you encounter issues:
1. Check `src/server/logs/combined.log`
2. Verify all environment variables are set
3. Test admin wallet has balance
4. Review `docs/SIMPLE_SOLANA_SETUP.md` for detailed guide

