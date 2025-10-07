# Oracle Removal - Architecture Change Summary

## Overview

Successfully removed on-chain Oracle functionality from the SolSkins project. Prices are now managed off-chain, simplifying the architecture and reducing transaction costs.

## Changes Made

### 1. Solana Program (On-Chain)

**Removed:**
- `oracle_pubkey` field from Global state
- `PriceStore` state account
- `set_price_signed` instruction
- `set_oracle` admin instruction
- Oracle-related errors: `OracleNotSet`, `InvalidTimestamp`, `OracleSignatureInvalid`, `PriceStale`, `InvalidSignature`
- `OracleUpdated` and `PriceSet` events

**Modified:**
- `initialize()` - No longer requires `oracle_pubkey` parameter
- `sell_back()` - Now accepts `market_price: u64` as first parameter (in micro-USDC, e.g., $10 = 10_000_000)
  - Signature: `sell_back(market_price: u64, min_price: u64)`
  - Backend passes current market price directly
  - Program validates only that `market_price > 0`
- `vrf_callback()` - Removed oracle pubkey validation

**Build Status:** ✅ Program compiles successfully

### 2. Backend (src/server/)

**Current State:**
- `InventoryService.sellSkinViaBuyback()` already has comments explaining the new flow (lines 88-100)
- Reads price from database/cache
- Calculates 85% buyback rate
- Ready to pass `market_price` to Solana program

**TODO:**
- Implement actual Solana program call with new signature
- Set up Redis cache for price data

### 3. Worker (src/worker/)

**Current State:**
- `PriceOracle` class already implemented in `src/worker/src/jobs/price-oracle.ts`
- Aggregates prices from external sources
- Stores in database/cache

**Updated Comments:**
- Now explicitly states prices are off-chain
- No signature generation needed
- Backend reads from cache and passes to Solana

### 4. Documentation

**Updated Files:**
- `CLAUDE.md` - Removed all oracle references, updated architecture
- `docs/backend-knowledge-base.md` - Updated all sequence diagrams and flow descriptions
- Test files - Updated to call `initialize()` without oracle parameter

## New Architecture

### Price Data Flow

```
External APIs (Steam, CSGOFloat, DMarket)
    ↓
Worker (PriceOracle)
    ↓
Database + Redis Cache (15min TTL)
    ↓
Backend API
    ↓
Solana Program (as parameter)
```

### Buyback Flow

1. User requests buyback
2. Backend reads price from cache/DB
3. Backend calculates 85% buyback value
4. Backend calls `sell_back(market_price, min_price)` on Solana
5. Program validates `market_price > 0`
6. Program calculates payout: `market_price * 0.85 - (market_price * 0.01)` = 84% net
7. Program transfers USDC to user
8. Backend updates database

## Benefits

✅ **Simpler**: No on-chain price verification needed
✅ **Faster**: Fewer account lookups, smaller transactions
✅ **Cheaper**: Lower transaction costs (no PDA reads/writes)
✅ **Flexible**: Easy to update price sources without deploying new program
✅ **Off-chain Trust**: Backend maintains price data integrity

## Trade-offs

⚠️ **Trust Model**: Users trust backend to provide accurate prices (vs on-chain oracle)
⚠️ **Centralization**: Price data controlled by backend (vs decentralized oracle)

## Next Steps

1. ✅ Remove oracle from Solana program
2. ✅ Update documentation
3. ⏳ Set up Redis cache for prices
4. ⏳ Implement price aggregation from external APIs
5. ⏳ Update backend to call new `sell_back(market_price, min_price)` signature
6. ⏳ Test end-to-end buyback flow

## Testing

The Solana program builds successfully. To test:

```bash
cd solana
anchor build  # ✅ Builds without errors
anchor test   # Run integration tests
```

## Migration Notes

**For existing deployments:**
- Global state account needs migration (oracle_pubkey removed)
- Consider redeploying program with new account layout
- No PriceStore accounts needed anymore

**For new deployments:**
- Just call `initialize()` without oracle parameter
- Backend handles all price logic off-chain
