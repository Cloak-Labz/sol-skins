# Frontend Updates for Off-Chain Implementation

## Overview
Updated frontend to work with the new off-chain randomization system. Results are now immediate instead of requiring polling.

---

## Files Updated

### 1. `/src/client/app/app-dashboard/open/[id]/page.tsx`

**Major Changes:**
- ✅ **Removed polling** - No longer needs `useEffect` to poll for results
- ✅ **Updated `openCase()`** - Handles immediate results from backend
- ✅ **Removed `simulateResult()`** - No longer needed
- ✅ **Enhanced decision feedback** - Better toast notifications

**Key Code Changes:**

```typescript
// ❌ REMOVED: Polling useEffect
// useEffect(() => {
//   if (caseOpening && caseOpening.status === "pending") {
//     const interval = setInterval(() => checkOpeningStatus(), 2000);
//   }
// }, [caseOpening]);

// ✅ NEW: Immediate results handling
const response = await casesService.openCase({
  lootBoxTypeId: lootBox.id,
  paymentMethod: "SOL",
});

// Backend returns complete result immediately!
const skinResult = response.data.skinResult;
const randomization = response.data.randomization;

const newOpening: CaseOpening = {
  id: response.data.caseOpeningId,
  status: "completed", // Already completed!
  nftMintAddress: response.data.nftMintAddress,
  skinResult: skinResult,
  randomSeed: randomization.seed,
  randomValue: randomization.value,
  randomHash: randomization.hash,
};

// Show reveal animation (purely visual, result already determined)
setTimeout(() => {
  setRevealedSkin(skinResult);
  setShowResult(true);
}, 3500);
```

**User Experience:**
- Case opens instantly (no waiting for VRF)
- 3.5 second reveal animation (purely visual)
- Immediate decision (keep/sell)

---

### 2. `/src/client/app/app-dashboard/inventory/page.tsx`

**Changes:**
- ✅ Updated `confirmSell()` to match backend response format
- ✅ Changed `payoutAmount` to `soldSkin.buybackPrice`
- ✅ Added 85% buyback message to success toast

**Key Code Changes:**

```typescript
// ❌ OLD:
toast.success(`Sold for ${formatCurrency(response.data.payoutAmount)}!`);

// ✅ NEW:
const buybackPrice = response.data?.soldSkin?.buybackPrice || 0;
toast.success(
  `Sold for ${formatCurrency(buybackPrice)} (85% buyback)!`,
  { duration: 4000 }
);
```

**User Experience:**
- Buyback now works with off-chain implementation
- Shows 85% rate in success message
- Reloads inventory after sale

---

### 3. `/src/client/app/app-dashboard/history/page.tsx`

**Status:** ✅ **No changes needed**

Already handles buyback transactions correctly. Displays:
- Transaction type (case opening / buyback)
- Amount (red for debits, green for credits)
- Status (completed/pending/failed)
- Transaction hash link to Solana explorer

---

## Backend Integration Points

### API Endpoints Used:

**Case Opening:**
```
POST /api/v1/cases/open
Request: { lootBoxTypeId, paymentMethod }
Response: {
  caseOpeningId,
  nftMintAddress,
  transaction,
  skinResult: { id, weapon, skinName, rarity, condition, currentPriceUsd, imageUrl },
  randomization: { seed, value, hash, probability }
}
```

**Keep Decision:**
```
POST /api/v1/cases/opening/:id/decision
Request: { decision: "keep" }
Response: { decision, nftMintAddress, addedToInventory: true }
```

**Buyback Decision (from case opening):**
```
POST /api/v1/cases/opening/:id/decision
Request: { decision: "buyback" }
Response: {
  decision,
  nftMintAddress,
  buybackPrice,
  addedToInventory: false,
  transaction,
  burned: true
}
```

**Buyback (from inventory):**
```
POST /api/v1/inventory/:skinId/buyback
Request: { minAcceptablePrice?: number }
Response: {
  soldSkin: {
    id, weapon, skinName,
    originalPrice, buybackPrice, buybackPercentage: 85
  },
  transaction: { id, amountUsdc, txHash, status },
  burned: true,
  credited: number
}
```

---

## Testing Checklist

### Case Opening Flow:
- [ ] Navigate to marketplace
- [ ] Click on a pack
- [ ] Click "Open Case"
- [ ] See 3.5 second animation
- [ ] Result shows immediately after animation
- [ ] Click "Keep as NFT"
- [ ] Verify skin appears in inventory
- [ ] Check console logs for randomization data

### Buyback Flow (from case opening):
- [ ] Open a case
- [ ] Click "Sell via Buyback" on result screen
- [ ] Verify 85% price calculation
- [ ] Confirm buyback shows price in toast
- [ ] Verify redirect to history page
- [ ] Check transaction appears in history

### Buyback Flow (from inventory):
- [ ] Go to inventory
- [ ] Click "Sell via Buyback" on owned skin
- [ ] Dialog shows 85% buyback price
- [ ] Click "Confirm Sale"
- [ ] Toast shows buyback amount
- [ ] Inventory reloads (skin removed)
- [ ] Check history for transaction

### History Page:
- [ ] View all transactions
- [ ] Filter by "Case Openings"
- [ ] Filter by "Buybacks"
- [ ] Search for specific skin
- [ ] Verify amounts (red for spent, green for earned)
- [ ] Click "View on Explorer" link

---

## Console Logging

### Expected Logs:

**Case Opening:**
```
🎉 [FRONTEND] Case opened with immediate result: {
  caseOpeningId: "...",
  nftMintAddress: "SOL_MOCK_...",
  skinResult: { weapon, skinName, rarity, ... },
  randomization: { seed, value, hash, probability }
}
```

**Keep Decision:**
```
✅ [KEEP] Skin added to inventory: { decision: "keep", ... }
```

**Buyback Decision:**
```
💰 [BUYBACK] Skin sold: {
  decision: "buyback",
  buybackPrice: 42.50,
  transaction: "TX_MOCK_...",
  burned: true
}
```

---

## Migration Status

**Database Migration:**
- ✅ Migration file already generated: `src/server/src/migrations/1234567890123-AddOffChainRandomization.ts`
- ⚠️ **ACTION REQUIRED**: Run migration before testing

```bash
cd src/server
npm run migration:run
```

**Environment Variables:**
```bash
# Add to src/server/.env
MOCK_MODE=true
MOCK_NFT_MINTING=true
MOCK_BUYBACK=true
RANDOMIZATION_SECRET=your-secret-here-change-in-production
```

---

## Known Limitations

1. **Mock Blockchain**: All blockchain interactions are simulated
2. **No Real NFTs**: NFT mint addresses are mock values (format: `SOL_MOCK_...`)
3. **No Real Transactions**: Transaction hashes are mock (format: `TX_MOCK_...`)
4. **No User Balance**: Buyback credits are not tracked in user balance (TODO)
5. **Price Updates**: Skin prices are static (basePriceUsd), no real-time market data

---

## Next Steps

1. ✅ Run database migration
2. ✅ Start backend server
3. ✅ Start frontend server
4. ✅ Test complete flow end-to-end
5. ⏭️ Future: Integrate real Solana when ready
6. ⏭️ Future: Add user balance system for buyback credits
7. ⏭️ Future: Integrate real-time price feeds

---

## Rollback Plan

If issues occur, revert to previous branch:
```bash
git checkout main  # or previous branch
cd src/server
npm run migration:revert  # revert last migration
```

---

## Documentation References

- **Off-Chain Architecture**: `/docs/OFF_CHAIN_ARCHITECTURE.md`
- **Implementation Details**: `/docs/OFF_CHAIN_IMPLEMENTATION.md`
- **Controller Updates**: `/docs/CONTROLLER_UPDATES_SUMMARY.md`
- **Pack Management**: `/docs/PACK_MANAGEMENT_GUIDE.md`
