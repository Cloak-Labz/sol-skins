# SkinVault Security & Architecture Review

**Program**: SkinVault Lootbox System  
**Version**: 0.1.0  
**Review Date**: October 1, 2025  
**Status**: ⚠️ **NOT PRODUCTION READY**

---

## 🔴 CRITICAL ISSUES (Must Fix Before Mainnet)

### 1. **Oracle Signature Verification is Stubbed**
**Location**: `src/instructions/set_price.rs:64-65`

```rust
// Current: Just checks signature is not all zeros
require!(signature != [0u8; 64], SkinVaultError::InvalidSignature);
// TODO: Implement actual signature verification
```

**Impact**: Anyone can fake price data and manipulate buyback prices  
**Risk Level**: 🔴 **CRITICAL** - Direct theft vector  
**Fix Complexity**: Medium (30 min)

**Solution**: Implement Ed25519 signature verification:
```rust
use anchor_lang::solana_program::ed25519_program;

// Verify oracle signature using ed25519_verify syscall
let message = create_price_message(&inventory_id_hash, price, timestamp);
// Requires ed25519 instruction in transaction
```

---

### 2. **No VRF Callback Authorization**
**Location**: `src/instructions/vrf_callback.rs:9-41`

```rust
// Current: No Signer constraint, anyone can call
pub struct VrfCallback<'info> {
    pub batch: Account<'info, Batch>,
    pub box_state: Account<'info, BoxState>,
    pub vrf_pending: Account<'info, VrfPending>,
    pub box_owner: AccountInfo<'info>,
}
```

**Impact**: Users can call `vrf_callback` with custom randomness to win specific items  
**Risk Level**: 🔴 **CRITICAL** - Breaks entire lootbox fairness mechanism  
**Fix Complexity**: Low (10 min)

**Solution**: Add oracle/authority authorization:
```rust
#[account(
    constraint = vrf_authority.key() == global.oracle_pubkey 
              || vrf_authority.key() == global.authority
    @ SkinVaultError::Unauthorized
)]
pub vrf_authority: Signer<'info>,
```

---

### 3. **Inventory Can Be Assigned Multiple Times**
**Location**: `src/instructions/assign.rs:30-70`

**Impact**: Same physical inventory item can be assigned to multiple NFTs  
**Risk Level**: 🔴 **CRITICAL** - Double-spending of physical items  
**Fix Complexity**: Medium (20 min)

**Solution**: Track assigned inventory in PDA:
```rust
#[account(
    init,
    payer = signer,
    seeds = [b"inventory", inventory_id_hash.as_ref()],
    bump,
    space = InventoryAssignment::LEN
)]
pub inventory_assignment: Account<'info, InventoryAssignment>,
```

---

### 4. **Global PDA Uses Authority in Seed**
**Location**: `src/instructions/admin.rs:16`

```rust
// Current: Creates separate Global state per authority
seeds = [b"skinvault", authority.key().as_ref()],
```

**Impact**: Multiple Global states can exist, fragmenting program state  
**Risk Level**: 🔴 **CRITICAL** - Architecture flaw  
**Fix Complexity**: Low (5 min, but requires redeployment)

**Solution**: Use fixed seed:
```rust
seeds = [b"global"],  // Single global state
```

---

### 5. **No Treasury Withdrawal Function**
**Location**: `src/lib.rs` - Missing instruction

**Impact**: USDC can be deposited but never withdrawn - funds permanently locked  
**Risk Level**: 🔴 **CRITICAL** - Loss of funds  
**Fix Complexity**: Low (15 min)

**Solution**: Add withdrawal instruction with authority check:
```rust
pub fn withdraw_treasury(ctx: Context<WithdrawTreasury>, amount: u64) -> Result<()> {
    // Check minimum balance remains
    // Transfer to authority ATA
}
```

---

## 🟠 HIGH PRIORITY ISSUES

### 6. **Metaplex Integration is Stubbed**
**Location**: `src/cpi/metaplex.rs:8-26`

```rust
pub fn create_metadata<'info>(...) -> Result<()> {
    // TODO: Implement actual Metaplex Token Metadata CPI
    msg!("Metaplex metadata creation placeholder");
    Ok(())
}
```

**Impact**: 
- NFTs have no metadata (name, image, attributes)
- No collection verification
- Not displayed in wallets correctly

**Risk Level**: 🟠 **HIGH** - Core functionality missing  
**Fix Complexity**: High (2-3 hours)

**Solution**: 
1. Add `mpl-token-metadata` dependency
2. Implement `CreateMetadataAccountV3` CPI
3. Add collection support
4. Update metadata on assignment

---

### 7. **No Emergency Controls**
**Location**: Missing from `src/state.rs` and `src/instructions/admin.rs`

**Missing**:
- Emergency pause mechanism
- Authority transfer (2-step)
- Circuit breaker beyond buyback toggle

**Impact**: Cannot respond to security incidents or migrate control  
**Risk Level**: 🟠 **HIGH** - Operational security  
**Fix Complexity**: Medium (1 hour)

**Solution**:
```rust
// Add to Global state
pub paused: bool,
pub pending_authority: Option<Pubkey>,

// Add instructions
pub fn emergency_pause(ctx, paused: bool)
pub fn initiate_authority_transfer(ctx, new_authority)
pub fn accept_authority(ctx)
```

---

### 8. **NFTs Not Burned on Sellback**
**Location**: `src/instructions/sell_back.rs:121-123`

```rust
// Current: Box state remains after sellback
let box_state = &mut ctx.accounts.box_state;
// For now, we'll keep the box state but could add a "redeemed" flag
```

**Impact**: 
- NFTs remain after redemption
- State bloat
- Confusion about NFT status

**Risk Level**: 🟠 **HIGH** - User experience and economics  
**Fix Complexity**: Low (20 min)

**Solution**:
```rust
// Burn NFT
burn(CpiContext::new(...), 1)?;

// Close token account
close_account(CpiContext::new(...))?;

// Add redeemed flag
box_state.redeemed = true;
box_state.redeem_time = current_time;
```

---

## ✅ WHAT'S GOOD

Your program has strong foundations in several areas:

### **State Management** ✓
- Well-structured account types (Global, Batch, BoxState, PriceStore, VrfPending)
- Proper discriminator space allocation
- Logical separation of concerns
- Appropriate PDA seeds (except Global)

### **Merkle Proof Implementation** ✓
```rust:1:41:/home/victorcarvalho/Documents/Github/sol-skins/apps/solana/programs/solana/src/merkle.rs
// Solid implementation with:
// - Depth validation
// - Sorted hashing (prevents proof manipulation)
// - Comprehensive tests
```

### **Error Handling** ✓
- Custom error enum with descriptive messages
- Consistent use of `require!` macro
- Proper error propagation with `?`

### **Event Emissions** ✓
All critical actions emit events:
- `MerklePublished`
- `BoxMinted`
- `BoxOpened`
- `InventoryAssigned`
- `PriceSet`
- `BuybackExecuted`
- `TreasuryDeposit`
- `BuybackToggled`
- `OracleUpdated`

### **Checked Arithmetic** ✓
Most operations use safe math:
```rust
batch.boxes_minted = batch.boxes_minted
    .checked_add(1)
    .ok_or(SkinVaultError::ArithmeticOverflow)?;
```

### **PDA Design** ✓ (mostly)
- Batch: `[b"batch", batch_id]` ✓
- BoxState: `[b"box", nft_mint]` ✓
- PriceStore: `[b"price", inventory_hash]` ✓
- VrfPending: `[b"vrf_pending", nft_mint]` ✓

### **Security Features** ✓
- Circuit breaker (min treasury balance)
- Price staleness checks (5 min window)
- Buyback spread fee (1%)
- Slippage protection on sellback
- Merkle proof depth limit (20)

### **Testing** ✓
Unit tests for:
- Merkle tree operations
- Buyback calculations
- Price staleness
- Random index generation
- VRF seed creation

---

## 📊 RISK ASSESSMENT

| Issue | Severity | Exploitability | Business Impact | Fix Priority |
|-------|----------|----------------|-----------------|--------------|
| Oracle signature bypass | 🔴 Critical | High | Complete loss of funds | P0 |
| VRF manipulation | 🔴 Critical | High | Unfair loot distribution | P0 |
| Inventory double-spend | 🔴 Critical | Medium | Physical item fraud | P0 |
| Global PDA design | 🔴 Critical | Low | State fragmentation | P0 |
| No treasury withdrawal | 🔴 Critical | N/A | Locked funds | P0 |
| Missing NFT metadata | 🟠 High | N/A | Broken UX | P1 |
| No emergency pause | 🟠 High | N/A | Can't stop attacks | P1 |
| NFTs not burned | 🟠 High | Low | State bloat | P1 |

---

## 🎯 RECOMMENDED FIX ORDER

### **Phase 1: Critical Fixes (1-2 days)**
1. Fix Global PDA seed (5 min) ⚡
2. Add VRF callback authorization (10 min) ⚡
3. Add treasury withdrawal (15 min) ⚡
4. Add inventory uniqueness tracking (20 min)
5. Implement oracle signature verification (30 min)

### **Phase 2: High Priority (2-3 days)**
6. Implement Metaplex metadata CPI (3 hours)
7. Add emergency controls (1 hour)
8. Add NFT burning on sellback (20 min)
9. Add comprehensive integration tests (4 hours)

### **Phase 3: Polish (1-2 days)**
10. Switch to `InterfaceAccount` for Token-2022
11. Add collection support
12. Performance optimization
13. Security audit preparation

---

## ✅ PRE-DEPLOYMENT CHECKLIST

Before deploying to mainnet:

- [ ] All 5 critical issues fixed
- [ ] All 3 high priority issues fixed
- [ ] Integration tests passing (>80% coverage)
- [ ] Security audit completed by professional firm
- [ ] Upgrade authority set to multisig (3-of-5 minimum)
- [ ] Treasury minimum balance configured appropriately
- [ ] Oracle public key configured and tested
- [ ] Real VRF provider integrated (Switchboard/Chainlink)
- [ ] Emergency response plan documented
- [ ] Monitoring and alerting configured
- [ ] Bug bounty program established
- [ ] Insurance/treasury reserves allocated

---

## 🔧 QUICK START FIXES

Copy-paste these fixes to get started:

### Fix #1: Global PDA Seed
```bash
# Search and replace in all files
find src -type f -name "*.rs" -exec sed -i 's/seeds = \[b"skinvault", authority.key().as_ref()\]/seeds = [b"global"]/g' {} +
find src -type f -name "*.rs" -exec sed -i 's/seeds = \[b"skinvault", global.authority.as_ref()\]/seeds = [b"global"]/g' {} +
```

### Fix #2: Add VRF Auth
```rust
// In vrf_callback.rs, add to VrfCallback struct:
#[account(
    seeds = [b"global"],
    bump = global.bump
)]
pub global: Account<'info, Global>,

#[account(
    constraint = vrf_authority.key() == global.oracle_pubkey
        @ SkinVaultError::Unauthorized
)]
pub vrf_authority: Signer<'info>,
```

### Fix #3: Treasury Withdrawal
See `PROGRAM_REVIEW.md` section 5 for complete implementation.

---

## 📚 RESOURCES

- **Full Review**: See `PROGRAM_REVIEW.md` for detailed code examples
- **Anchor Best Practices**: https://book.anchor-lang.com/chapter_3/security.html
- **Solana Security**: https://github.com/coral-xyz/sealevel-attacks
- **Metaplex Docs**: https://github.com/metaplex-foundation/mpl-token-metadata
- **Switchboard VRF**: https://docs.switchboard.xyz/functions

---

## 🤝 NEXT STEPS

1. **Review this document** with your team
2. **Prioritize fixes** based on your timeline
3. **Start with Phase 1** critical fixes
4. **Request code review** after each phase
5. **Schedule security audit** after Phase 2
6. **Plan testnet deployment** with real users
7. **Prepare incident response** procedures

---

## 📞 SUPPORT

If you need help implementing any of these fixes:
- Open an issue with specific questions
- Reference the issue number from this document
- Include relevant code snippets and error messages

---

**Last Updated**: October 1, 2025  
**Next Review**: After Phase 1 fixes completed


