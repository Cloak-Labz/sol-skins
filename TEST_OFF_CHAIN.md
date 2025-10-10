# Testing Off-Chain Implementation

## Quick Start

### 1. Start Backend

```bash
cd src/server
npm run dev
```

**Expected Output:**
```
✅ Database connection established successfully
🚀 Server running on port 3001
📚 API Documentation: http://localhost:3001/api-docs
```

### 2. Start Frontend

```bash
cd src/client
npm run dev
```

**Expected Output:**
```
✓ Ready in 2.3s
○ Local:   http://localhost:3000
```

---

## Testing Flow

### Test 1: Case Opening (Immediate Results)

1. Open http://localhost:3000
2. Connect wallet (or use mock mode)
3. Go to Marketplace
4. Click on any pack
5. Click "Open Case"

**Expected Behavior:**
- ✅ 3.5 second animation plays
- ✅ Result shows immediately after animation
- ✅ Console shows:
  ```
  🎉 [FRONTEND] Case opened with immediate result: {
    caseOpeningId: "...",
    nftMintAddress: "SOL_MOCK_...",
    skinResult: { weapon, skinName, rarity, currentPriceUsd, ... },
    randomization: { seed, value, hash, probability }
  }
  ```

### Test 2: Keep Decision

1. After opening case, click "Keep as NFT"

**Expected Behavior:**
- ✅ Toast: "Skin added to your inventory!"
- ✅ Redirects to `/app-dashboard/inventory`
- ✅ Skin appears in inventory
- ✅ Console shows:
  ```
  ✅ [KEEP] Skin added to inventory: { decision: "keep", ... }
  ```

### Test 3: Buyback from Case Opening

1. Open a case
2. Click "Sell via Buyback"

**Expected Behavior:**
- ✅ Toast: "Skin sold for $X.XX (85% buyback)!"
- ✅ Redirects to `/app-dashboard/history`
- ✅ Transaction appears in history
- ✅ Console shows:
  ```
  💰 [BUYBACK] Skin sold: {
    buybackPrice: 42.50,
    transaction: "TX_MOCK_...",
    burned: true
  }
  ```

### Test 4: Buyback from Inventory

1. Go to Inventory
2. Find a skin with status "owned"
3. Click "Sell via Buyback"
4. Confirm in dialog

**Expected Behavior:**
- ✅ Dialog shows 85% buyback price
- ✅ Original price shown: $50.00
- ✅ Buyback price shown: $42.50
- ✅ Toast: "Sold for $42.50 (85% buyback)!"
- ✅ Inventory reloads (skin removed)
- ✅ Transaction in history

### Test 5: Transaction History

1. Go to History page
2. Check "Total Earned" card

**Expected Behavior:**
- ✅ Shows sum of all buyback transactions
- ✅ "Total Spent" shows case opening costs
- ✅ "Net Profit/Loss" shows difference
- ✅ Can filter by "Buybacks" or "Case Openings"
- ✅ Each transaction shows:
  - Type icon (📦 for opening, 💰 for buyback)
  - Skin name (if applicable)
  - Amount (red for spent, green for earned)
  - Status badge
  - "View on Explorer" link

---

## Backend Console Logs

### Case Opening:
```
🎲 [CASE OPENING] User: abc-123
   Pack: Starter Pack
   Selected: AK-47 | Redline
   Rarity: Rare
   Probability: 5.00%

🎨 [MOCK NFT] Minted: SOL_MOCK_abc123xyz...
   Name: AK-47 | Redline
   Transaction: TX_MOCK_abc123xyz...
```

### Keep Decision:
```
✅ [DECISION] User kept NFT: SOL_MOCK_abc123xyz...
```

### Buyback:
```
💰 [BUYBACK] Executed
   NFT: SOL_MOCK_abc123xyz...
   Original Price: $50.00
   Buyback Price: $42.50
   Transaction: TX_MOCK_def456uvw...
```

---

## Troubleshooting

### Issue: Database connection fails

**Solution:**
```bash
cd deployment
docker-compose up -d
```

### Issue: Entities not synced

**Solution:**
```bash
cd src/server
npm run schema:sync  # Development only - will drop all data!
```

**Or safer (check env.ts):**
```typescript
// src/server/config/env.ts
synchronize: true  // Should be true in development
```

### Issue: Migration errors

**Note:** Migrations are not needed with `synchronize: true`.
TypeORM will automatically create/update tables based on entities.

If you want to use migrations instead:
1. Set `synchronize: false` in config
2. Run: `npm run migration:generate -- src/database/migrations/Initial`
3. Run: `npm run migration:run`

### Issue: Frontend shows old data

**Solution:**
1. Clear browser cache
2. Hard refresh (Cmd+Shift+R)
3. Check Network tab for API responses

### Issue: "User not found" errors

**Solution:**
1. Connect wallet
2. Check wallet auth middleware
3. Verify JWT token in localStorage

---

## API Testing (Optional)

### Test with curl:

**Open Case:**
```bash
curl -X POST http://localhost:3001/api/v1/cases/open \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "lootBoxTypeId": "YOUR_LOOTBOX_ID",
    "paymentMethod": "SOL"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "caseOpeningId": "...",
    "nftMintAddress": "SOL_MOCK_...",
    "transaction": "TX_MOCK_...",
    "skinResult": {
      "id": "...",
      "weapon": "AK-47",
      "skinName": "Redline",
      "rarity": "Rare",
      "condition": "Field-Tested",
      "currentPriceUsd": 50.00,
      "imageUrl": "..."
    },
    "randomization": {
      "seed": "user123_lootbox456_1234567890",
      "value": 0.123456789,
      "hash": "abc123...",
      "probability": "5.00%"
    }
  }
}
```

**Make Decision (Keep):**
```bash
curl -X POST http://localhost:3001/api/v1/cases/opening/CASE_ID/decision \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{ "decision": "keep" }'
```

**Make Decision (Buyback):**
```bash
curl -X POST http://localhost:3001/api/v1/cases/opening/CASE_ID/decision \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{ "decision": "buyback" }'
```

**Buyback from Inventory:**
```bash
curl -X POST http://localhost:3001/api/v1/inventory/SKIN_ID/buyback \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{ "minAcceptablePrice": 40.00 }'
```

---

## Success Criteria

✅ Case opens in < 1 second (no VRF delay)
✅ Result shows immediately after animation
✅ Keep decision adds skin to inventory
✅ Buyback decision credits user (85% rate)
✅ Inventory buyback works correctly
✅ History shows all transactions
✅ All console logs appear as expected
✅ No polling/async waiting

---

## Next Steps After Testing

1. ✅ Verify all flows work end-to-end
2. 📝 Document any issues found
3. 🐛 Fix bugs if any
4. 🎨 Polish UI/UX (optional)
5. 📊 Add analytics tracking (optional)
6. 🔄 Plan migration to real Solana (future)

---

## Rollback Plan

If major issues found:
```bash
git stash  # Save current changes
git checkout main  # Return to previous version
cd deployment && docker-compose down -v  # Clear database
cd deployment && docker-compose up -d  # Restart fresh
```

---

## Documentation

- **Architecture**: `/docs/OFF_CHAIN_ARCHITECTURE.md`
- **Implementation**: `/docs/OFF_CHAIN_IMPLEMENTATION.md`
- **Controllers**: `/docs/CONTROLLER_UPDATES_SUMMARY.md`
- **Frontend**: `/docs/FRONTEND_UPDATES_SUMMARY.md`
