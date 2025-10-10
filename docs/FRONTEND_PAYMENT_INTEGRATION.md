# Frontend Payment Integration Guide

## Overview

This guide explains how to integrate SOL payment in the frontend before opening cases.

## Flow

```
1. User clicks "Open Case"
   ↓
2. Frontend sends SOL to admin wallet
   ↓
3. Wait for transaction confirmation
   ↓
4. Backend API call to open case
   ↓
5. Backend verifies payment on-chain
   ↓
6. Backend reveals NFT result
```

## Implementation

### Step 1: Update `.env.local`

```bash
# src/client/.env.local
NEXT_PUBLIC_ADMIN_WALLET=<your_admin_wallet_pubkey>
NEXT_PUBLIC_SOLANA_CLUSTER=devnet
```

### Step 2: Update Case Opening Page

**File**: `src/client/app/app-dashboard/open/[id]/page.tsx`

```typescript
import {
  Transaction,
  SystemProgram,
  PublicKey,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";

// ... existing imports ...

export default function OpenCasePage() {
  const { connection } = useConnection();
  const wallet = useWallet();
  
  // ... existing state ...

  const openCase = async () => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      toast.error("Please connect your wallet");
      return;
    }

    try {
      setIsOpening(true);
      setAnimationPhase("spinning");

      // ═══════════════════════════════════════════════════════════
      // STEP 1: Send Payment to Admin Wallet
      // ═══════════════════════════════════════════════════════════

      const adminWallet = process.env.NEXT_PUBLIC_ADMIN_WALLET;
      if (!adminWallet) {
        throw new Error("Admin wallet not configured");
      }

      const packagePrice = lootBox.priceSol; // e.g., 0.1 SOL

      console.log(`💳 [PAYMENT] Sending ${packagePrice} SOL to admin wallet`);
      console.log(`   Admin: ${adminWallet}`);
      console.log(`   From: ${wallet.publicKey.toBase58()}`);

      toast.loading("Sending payment...", { id: "payment" });

      // Create payment transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: new PublicKey(adminWallet),
          lamports: Math.floor(packagePrice * LAMPORTS_PER_SOL),
        })
      );

      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = wallet.publicKey;

      // Send and confirm transaction
      const signature = await wallet.sendTransaction(transaction, connection);
      console.log(`📝 [PAYMENT] Transaction sent: ${signature}`);

      toast.loading("Confirming payment...", { id: "payment" });

      await connection.confirmTransaction(
        {
          signature,
          blockhash,
          lastValidBlockHeight,
        },
        "confirmed"
      );

      console.log(`✅ [PAYMENT] Confirmed!`);
      toast.success("Payment confirmed!", { id: "payment" });

      // ═══════════════════════════════════════════════════════════
      // STEP 2: Open Case (Backend will verify payment)
      // ═══════════════════════════════════════════════════════════

      toast.loading("Opening case...", { id: "opening" });

      const response = await casesService.openCase({
        lootBoxTypeId: lootBox.id,
        paymentMethod: "SOL",
        paymentTransaction: signature, // Optional: for tracking
      });

      // Backend returns complete result immediately!
      const skinResult = response.data.skinResult;
      const randomization = response.data.randomization;

      const newOpening: CaseOpening = {
        id: response.data.caseOpeningId,
        status: "completed",
        nftMintAddress: response.data.nftMintAddress,
        skinResult: skinResult,
        randomSeed: randomization.seed,
        randomValue: randomization.value,
        randomHash: randomization.hash,
        openedAt: new Date().toISOString(),
      } as any;

      setCaseOpening(newOpening);
      toast.success("Case opened!", { id: "opening" });

      console.log("🎉 [CASE OPENED] Result:", skinResult);

      // Show reveal animation (purely visual)
      setTimeout(() => setAnimationPhase("slowing"), 1500);
      setTimeout(() => {
        setRevealedSkin(skinResult);
        setAnimationPhase("revealed");
        setShowResult(true);
        setIsOpening(false);
      }, 3500);
    } catch (err: any) {
      console.error("Error opening case:", err);
      setIsOpening(false);

      // Handle specific errors
      if (err.message?.includes("PAYMENT_REQUIRED")) {
        toast.error(
          "Payment not verified. Please try again or contact support.",
          { id: "opening" }
        );
      } else if (err.message?.includes("User rejected")) {
        toast.error("Transaction cancelled", { id: "payment" });
      } else {
        toast.error(`Failed to open case: ${err.message}`, { id: "opening" });
      }
    }
  };

  // ... rest of existing code ...
}
```

### Step 3: Update API Service (Optional)

**File**: `src/client/lib/api/cases.service.ts`

Add `paymentTransaction` to the request:

```typescript
async openCase(data: {
  lootBoxTypeId: string;
  paymentMethod: "SOL" | "USDC";
  paymentTransaction?: string; // Optional tracking
}): Promise<any> {
  const response = await this.request({
    method: "POST",
    url: "/cases/open",
    data,
  });
  return response;
}
```

## Error Handling

### Common Errors

#### 1. "Admin wallet not configured"
**Solution**: Add `NEXT_PUBLIC_ADMIN_WALLET` to `.env.local`

#### 2. "Payment not verified"
**Causes**:
- User sent wrong amount
- User sent to wrong wallet
- Transaction took too long (>2 minutes)
- Network congestion

**Solution**: 
- Show exact amount and admin wallet to user
- Add confirmation dialog before sending
- Increase backend `timeWindow` if needed

#### 3. "User rejected transaction"
**Cause**: User cancelled in wallet popup

**Solution**: Handle gracefully, allow retry

#### 4. "Insufficient funds"
**Cause**: User doesn't have enough SOL

**Solution**: Show balance check before opening case

## UX Improvements

### 1. Pre-flight Check

```typescript
const checkBalance = async () => {
  if (!wallet.publicKey) return false;
  
  const balance = await connection.getBalance(wallet.publicKey);
  const balanceSOL = balance / LAMPORTS_PER_SOL;
  
  if (balanceSOL < lootBox.priceSol) {
    toast.error(`Insufficient balance. You need ${lootBox.priceSol} SOL.`);
    return false;
  }
  
  return true;
};

// Call before openCase()
const canOpen = await checkBalance();
if (!canOpen) return;
```

### 2. Confirmation Dialog

```typescript
const confirmOpen = () => {
  return window.confirm(
    `You are about to send ${lootBox.priceSol} SOL to open this case. Continue?`
  );
};

// In openCase()
if (!confirmOpen()) return;
```

### 3. Show Admin Wallet

```typescript
<div className="mb-4 p-3 bg-zinc-900 rounded-lg">
  <p className="text-sm text-zinc-400">Payment will be sent to:</p>
  <p className="text-xs font-mono text-zinc-300 break-all">
    {process.env.NEXT_PUBLIC_ADMIN_WALLET}
  </p>
</div>
```

### 4. Transaction Link

```typescript
// After payment confirmation
const explorerUrl = `https://solscan.io/tx/${signature}?cluster=devnet`;

toast.success(
  <div>
    Payment confirmed!{" "}
    <a href={explorerUrl} target="_blank" className="underline">
      View on Solscan
    </a>
  </div>,
  { duration: 5000 }
);
```

## Testing

### Test on Devnet

```bash
# 1. Fund your test wallet
solana airdrop 1 <YOUR_WALLET> --url devnet

# 2. Check balance
solana balance <YOUR_WALLET> --url devnet

# 3. Try opening a case
# - Payment should go through
# - Backend should verify and open case
# - NFT should be revealed

# 4. Check admin wallet received payment
solana balance <ADMIN_WALLET> --url devnet
```

### Test Error Cases

```bash
# 1. Try with insufficient balance
# - Should show "Insufficient funds" error

# 2. Try with wrong admin wallet in .env
# - Backend should return "Payment not found"

# 3. Try cancelling transaction
# - Should handle gracefully and allow retry

# 4. Try waiting >2 minutes before opening
# - Backend should return "Payment not found"
# - Solution: Re-send payment
```

## Production Checklist

- [ ] Update `NEXT_PUBLIC_ADMIN_WALLET` to production wallet
- [ ] Update `SOLANA_CLUSTER` to `mainnet-beta`
- [ ] Test with real SOL on mainnet
- [ ] Monitor admin wallet balance
- [ ] Set up alerts for low balance
- [ ] Add analytics for payment success rate
- [ ] Add retry logic for failed payments
- [ ] Add customer support contact for payment issues

## Support

For issues:
1. Check browser console for errors
2. Verify wallet is connected
3. Check wallet has sufficient balance
4. Verify admin wallet is correct
5. Check transaction on Solscan
6. Review backend logs for payment verification

## Next Steps

1. Test payment flow on devnet
2. Verify backend receives and verifies payment
3. Test complete flow: payment → open → claim/buyback
4. Add monitoring and analytics
5. Deploy to production

