# 🎯 Metaplex Core Candy Machine Integration Plan

## 📊 CURRENT SYSTEM ARCHITECTURE (WHAT YOU HAVE)

### **Current Instructions**
1. **`initialize()`** - Initialize program with oracle, USDC mint, treasury
2. **`publish_merkle_root()`** - Publish Merkle root for batch inventory
3. **`mint_box()`** - Mint loot box NFT with Token Metadata
4. **`open_box()`** - Request VRF randomness for box opening
5. **`vrf_callback()`** - Oracle-only callback with secure randomness
6. **`assign()`** - Assign inventory item with Merkle proof
7. **`set_price_signed()`** - Oracle sets price for item
8. **`sell_back()`** - Buyback system for selling items
9. **Admin Instructions** - Oracle management, treasury, pause, etc.

### **Current State Accounts**
- **`Global`** - Program authority, oracle, USDC mint, settings
- **`Batch`** - Merkle root, batch metadata, statistics
- **`BoxState`** - Individual box: owner, opened status, random_index
- **`VrfPending`** - Pending VRF requests
- **`PriceStore`** - Oracle-signed prices
- **`InventoryAssignment`** - Track assigned inventory

### **Current NFT System (Token Metadata)**
- Using `mpl-token-metadata` v5.0.0
- Manual NFT creation with CreateV1
- Master Edition support
- Collection verification
- Update metadata after assignment

### **Current Dependencies**
```toml
anchor-lang = "0.31.1"
anchor-spl = "0.31.1"
mpl-token-metadata = "5.0.0"
```

---

## 🎯 TARGET ARCHITECTURE (METAPLEX CORE + CANDY MACHINE)

### **What Changes**

| Component | Current | New (Core CM) |
|-----------|---------|---------------|
| **NFT Standard** | Token Metadata | **Metaplex Core** |
| **Collection Mgmt** | Manual | **Core Candy Machine** |
| **Mint Cost** | 0.022 SOL | **0.0029 SOL (87% cheaper)** |
| **Minting** | Manual CreateV1 CPI | **CM MintV1 CPI** |
| **Loot Box Logic** | Your VRF system ✅ | **Keep VRF system ✅** |
| **Randomness** | Your VRF ✅ | **Keep VRF ✅** |

### **What Stays the Same** ✅
- ✅ Your VRF security implementation
- ✅ Oracle-only randomness callback
- ✅ Merkle proof verification
- ✅ Buyback system
- ✅ Admin controls
- ✅ Treasury management

---

## 📋 STEP-BY-STEP INTEGRATION PLAN

### **PHASE 1: Setup Metaplex Core Dependencies**

#### **Step 1.1: Update Cargo.toml**
```toml
[dependencies]
anchor-lang = { version = "0.31.1", features = ["init-if-needed"] }
anchor-spl = "0.31.1"

# Replace Token Metadata with Core
mpl-core = "0.7.2"
mpl-core-candy-machine = "0.3.1"
mpl-core-candy-guard = "0.3.0"

# Remove or comment out:
# mpl-token-metadata = { version = "5.0.0", features = ["serde"] }
```

#### **Step 1.2: Install Sugar CLI**
```bash
# Install Sugar (Candy Machine management tool)
bash <(curl -sSf https://sugar.metaplex.com/install.sh)

# Verify installation
sugar --version
```

---

### **PHASE 2: Prepare CS:GO Skin Collection**

#### **Step 2.1: Create Asset Structure**
Create a directory structure for your CS:GO skins:
```
assets/
├── collection.json          # Collection metadata
├── 0.json                   # AK-47 Fire Serpent
├── 0.png
├── 1.json                   # AWP Dragon Lore
├── 1.png
├── 2.json                   # M4A4 Howl
├── 2.png
└── ...
```

#### **Step 2.2: Create Sugar Config**
Create `config.json`:
```json
{
  "number": 10000,
  "symbol": "SKIN",
  "sellerFeeBasisPoints": 500,
  "isMutable": true,
  "isSequential": false,
  "creators": [
    {
      "address": "YOUR_AUTHORITY_WALLET",
      "share": 100
    }
  ],
  "uploadMethod": "bundlr",
  "awsS3Bucket": null,
  "nftStorageAuthToken": null,
  "shdwStorageAccount": null,
  "pinataConfig": null,
  "hiddenSettings": null,
  "guards": {
    "default": {
      "solPayment": {
        "value": 0.1,
        "destination": "YOUR_TREASURY_WALLET"
      },
      "mintLimit": {
        "id": 1,
        "limit": 10
      },
      "startDate": {
        "date": "2025-01-01 00:00:00 +0000"
      }
    }
  }
}
```

#### **Step 2.3: Asset Metadata Example**
Create `0.json` (Fire Serpent):
```json
{
  "name": "AK-47 | Fire Serpent",
  "symbol": "SKIN",
  "description": "Covert Rifle Skin from Operation Bravo Case",
  "image": "0.png",
  "attributes": [
    {
      "trait_type": "Weapon",
      "value": "AK-47"
    },
    {
      "trait_type": "Skin",
      "value": "Fire Serpent"
    },
    {
      "trait_type": "Rarity",
      "value": "Covert"
    },
    {
      "trait_type": "Collection",
      "value": "Operation Bravo"
    },
    {
      "trait_type": "Exterior",
      "value": "Factory New"
    },
    {
      "trait_type": "Float",
      "value": "0.07"
    },
    {
      "trait_type": "Weight",
      "value": "1"
    }
  ],
  "properties": {
    "category": "image",
    "files": [
      {
        "uri": "0.png",
        "type": "image/png"
      }
    ]
  }
}
```

---

### **PHASE 3: Deploy Candy Machine**

#### **Step 3.1: Validate Assets**
```bash
cd assets
sugar validate
```

#### **Step 3.2: Upload Assets**
```bash
# Upload to Arweave via Bundlr
sugar upload

# This will:
# - Upload all images and metadata
# - Create cache file with URIs
# - Cost depends on file sizes
```

#### **Step 3.3: Deploy Candy Machine**
```bash
# Deploy Core Candy Machine
sugar deploy

# Save the output:
# - Candy Machine ID
# - Collection NFT address
```

#### **Step 3.4: Verify Deployment**
```bash
# Check candy machine status
sugar show <CANDY_MACHINE_ID>

# Should show:
# - Items loaded: 10000
# - Items minted: 0
# - Guards configured
```

---

### **PHASE 4: Update Solana Program**

#### **Step 4.1: Create New CPI Module**
Create `src/cpi/candy_machine.rs`:
```rust
use anchor_lang::prelude::*;
use mpl_core_candy_machine::instructions::MintV1CpiBuilder;
use mpl_core::instructions::BurnV1CpiBuilder;

/// Mint specific item from Candy Machine
pub fn mint_from_candy_machine<'info>(
    candy_machine_program: &AccountInfo<'info>,
    candy_machine: &AccountInfo<'info>,
    candy_guard: &AccountInfo<'info>,
    asset: &AccountInfo<'info>,
    collection: &AccountInfo<'info>,
    mint_authority: &AccountInfo<'info>,
    payer: &AccountInfo<'info>,
    mint_number: u64,  // From VRF
    signer_seeds: &[&[&[u8]]],
) -> Result<()> {
    MintV1CpiBuilder::new(candy_machine_program)
        .candy_machine(candy_machine)
        .candy_guard(candy_guard)
        .asset(asset)
        .collection(collection)
        .mint_authority(mint_authority)
        .payer(payer)
        .mint_number(mint_number)
        .invoke_signed(signer_seeds)?;
    
    Ok(())
}

/// Burn Core NFT
pub fn burn_core_nft<'info>(
    core_program: &AccountInfo<'info>,
    asset: &AccountInfo<'info>,
    collection: Option<&AccountInfo<'info>>,
    authority: &AccountInfo<'info>,
    signer_seeds: Option<&[&[&[u8]]]>,
) -> Result<()> {
    let mut builder = BurnV1CpiBuilder::new(core_program);
    builder
        .asset(asset)
        .collection(collection)
        .payer(authority);
    
    if let Some(seeds) = signer_seeds {
        builder.invoke_signed(seeds)?;
    } else {
        builder.invoke()?;
    }
    
    Ok(())
}
```

#### **Step 4.2: Update BoxState**
Add field for CM integration:
```rust
#[account]
pub struct BoxState {
    pub owner: Pubkey,
    pub batch_id: u64,
    pub opened: bool,
    pub assigned_inventory: [u8; 32],
    pub nft_mint: Pubkey,           // Unrevealed box NFT
    pub mint_time: i64,
    pub open_time: i64,
    pub random_index: u64,          // VRF result (CM item index)
    pub redeemed: bool,
    pub redeem_time: i64,
    
    // NEW FIELDS FOR CM
    pub revealed: bool,             // Has skin been claimed?
    pub revealed_skin_mint: Option<Pubkey>,  // The actual skin NFT
    pub candy_machine: Pubkey,      // Which CM to mint from
    
    pub bump: u8,
}
```

#### **Step 4.3: Create New Instructions**

**Buy Loot Box (Simplified):**
```rust
// Buy a generic "unrevealed box" NFT
// This can be a simple Core NFT or even just tracking in BoxState
pub fn buy_loot_box(ctx: Context<BuyLootBox>) -> Result<()> {
    // Create BoxState account
    let box_state = &mut ctx.accounts.box_state;
    box_state.owner = ctx.accounts.buyer.key();
    box_state.opened = false;
    box_state.revealed = false;
    box_state.candy_machine = ctx.accounts.candy_machine.key();
    
    // Optional: Mint generic "unrevealed box" NFT
    // Or just track in BoxState without NFT
    
    Ok(())
}
```

**Open Box (Keep Your VRF System!):**
```rust
// Your existing open_box logic - NO CHANGES
pub fn open_box(ctx: Context<OpenBox>, pool_size: u64) -> Result<()> {
    // Your VRF request logic
    // Determines random_index
    // This index will be used to mint specific skin from CM
}
```

**VRF Callback (Keep Your Security!):**
```rust
// Your existing vrf_callback logic - NO CHANGES
pub fn vrf_callback(
    ctx: Context<VrfCallback>,
    randomness: [u8; 32],
) -> Result<()> {
    // Your VRF security checks
    // Calculate random_index from weighted pool
    // Store in BoxState
}
```

**NEW: Reveal and Claim Skin:**
```rust
pub fn reveal_and_claim(ctx: Context<RevealAndClaim>) -> Result<()> {
    let box_state = &mut ctx.accounts.box_state;
    
    // Verify box is opened (VRF completed)
    require!(box_state.opened, ErrorCode::BoxNotOpened);
    require!(!box_state.revealed, ErrorCode::AlreadyRevealed);
    
    // Mint specific skin from CM using VRF result
    candy_machine::mint_from_candy_machine(
        &ctx.accounts.candy_machine_program,
        &ctx.accounts.candy_machine,
        &ctx.accounts.candy_guard,
        &ctx.accounts.skin_asset,
        &ctx.accounts.collection,
        &ctx.accounts.mint_authority,
        &ctx.accounts.payer,
        box_state.random_index,  // VRF-determined index
        &[&[
            b"mint_authority",
            &[ctx.bumps.mint_authority]
        ]],
    )?;
    
    // Update state
    box_state.revealed = true;
    box_state.revealed_skin_mint = Some(ctx.accounts.skin_asset.key());
    
    // Optional: Burn unrevealed box NFT if you created one
    
    emit!(SkinRevealed {
        box_mint: box_state.nft_mint,
        skin_mint: ctx.accounts.skin_asset.key(),
        random_index: box_state.random_index,
    });
    
    Ok(())
}
```

---

### **PHASE 5: Update Client/Frontend**

#### **Step 5.1: Install Metaplex JS SDK**
```bash
npm install @metaplex-foundation/mpl-core
npm install @metaplex-foundation/mpl-core-candy-machine
```

#### **Step 5.2: Update Client Flow**
```typescript
// 1. Buy loot box
const buyTx = await program.methods
  .buyLootBox()
  .accounts({
    boxState,
    candyMachine: CANDY_MACHINE_ID,
    buyer: wallet.publicKey,
  })
  .rpc();

// 2. Open box (triggers VRF)
const openTx = await program.methods
  .openBox(poolSize)
  .accounts({
    boxState,
    vrfPending,
    // ... your VRF accounts
  })
  .rpc();

// 3. Wait for VRF callback (oracle)
// ... polling or websocket listening ...

// 4. Reveal and claim skin
const revealTx = await program.methods
  .revealAndClaim()
  .accounts({
    boxState,
    candyMachine: CANDY_MACHINE_ID,
    candyGuard,
    skinAsset: newSkinMint,
    collection,
    // ...
  })
  .rpc();
```

---

### **PHASE 6: Testing**

#### **Step 6.1: Devnet Testing Checklist**
- [ ] Deploy CM to devnet
- [ ] Test buy_loot_box
- [ ] Test open_box (VRF request)
- [ ] Test vrf_callback (oracle)
- [ ] Test reveal_and_claim (CM mint)
- [ ] Verify Core NFT in wallet
- [ ] Test DAS API indexing
- [ ] Test marketplace compatibility

#### **Step 6.2: Update Your Tests**
Update `tests/vrf-security.test.ts` to include CM interactions

---

### **PHASE 7: Migration Strategy**

#### **Option A: Fresh Start (Recommended)**
- Deploy new program with CM integration
- New candy machine for skins
- Fresh start with Core NFTs

#### **Option B: Gradual Migration**
- Keep existing Token Metadata system
- Add new CM-based minting
- Support both standards temporarily

---

## 💰 COST COMPARISON

### **Before (Token Metadata)**
```
Per User:
- Box NFT: 0.022 SOL
- Skin NFT: 0.022 SOL
Total: 0.044 SOL (~$9 at $200/SOL)
```

### **After (Core + CM)**
```
Per User:
- Box State: 0.0015 SOL (rent)
- Skin NFT: 0.0029 SOL
Total: 0.0044 SOL (~$0.88 at $200/SOL)

90% COST REDUCTION! 🎉
```

---

## 🎯 IMPLEMENTATION PRIORITY

### **Week 1: Setup & Preparation**
1. Install Sugar CLI
2. Create asset collection (images + metadata)
3. Configure candy machine settings
4. Upload assets to Arweave

### **Week 2: Smart Contract Updates**
1. Update Cargo.toml dependencies
2. Create candy_machine.rs CPI module
3. Update BoxState struct
4. Implement reveal_and_claim instruction

### **Week 3: Testing**
1. Deploy to devnet
2. Test full flow end-to-end
3. Verify marketplace compatibility
4. Load testing

### **Week 4: Production**
1. Mainnet candy machine deployment
2. Program deployment
3. Frontend integration
4. Launch! 🚀

---

## 📚 RESOURCES

### **Metaplex Core Documentation**
- Core Overview: https://developers.metaplex.com/core
- Core Candy Machine: https://developers.metaplex.com/core-candy-machine
- Sugar CLI: https://developers.metaplex.com/sugar

### **Your Existing Documentation**
- VRF Implementation: `VRF_IMPLEMENTATION_COMPLETE.md`
- Test Guide: `solana/tests/README.md`
- Security Review: `SECURITY_REVIEW.md`

---

## ✅ NEXT IMMEDIATE STEPS

1. **Review attached Metaplex docs** ✓ (you're here!)
2. **Install Sugar CLI** ⏳
3. **Prepare test asset collection** (10-20 skins to start)
4. **Deploy test CM to devnet** ⏳
5. **Update program dependencies** ⏳

Would you like me to help with any specific step? I can:
- Create the asset structure and metadata
- Write the candy_machine.rs CPI module
- Update your instructions to integrate CM
- Create Sugar config files
- Update your tests

Let me know which step you'd like to tackle first! 🚀

