# SkinVault Anchor Program - Security & Best Practices Review

## Executive Summary

Your program implements the core lootbox functionality but has **critical security gaps** and **missing production features**. Below are prioritized fixes with code examples.

---

## 🔴 CRITICAL FIXES (Must Fix Before Mainnet)

### 1. FIX GLOBAL PDA SEED DESIGN

**Problem**: Using `authority.key()` in Global PDA seeds means each authority creates a separate state.

**Current:**
```rust
#[account(
    init,
    payer = authority,
    seeds = [b"skinvault", authority.key().as_ref()], // ❌ WRONG
    bump,
    space = Global::LEN
)]
pub global: Account<'info, Global>,
```

**Fixed:**
```rust
#[account(
    init,
    payer = authority,
    seeds = [b"global"], // ✅ Fixed seed
    bump,
    space = Global::LEN
)]
pub global: Account<'info, Global>,

// Update all references:
#[account(
    mut,
    seeds = [b"global"],
    bump = global.bump,
    has_one = authority @ SkinVaultError::Unauthorized
)]
pub global: Account<'info, Global>,
```

---

### 2. IMPLEMENT REAL ORACLE SIGNATURE VERIFICATION

**Problem**: Oracle signatures are not verified - anyone can fake prices.

**Add to `set_price.rs`:**
```rust
use anchor_lang::solana_program::ed25519_program;

pub fn set_price_signed_handler(
    ctx: Context<SetPriceSigned>,
    inventory_id_hash: [u8; 32],
    price: u64,
    timestamp: i64,
    signature: [u8; 64],
) -> Result<()> {
    let global = &ctx.accounts.global;
    
    // Create message
    let message = create_price_message(&inventory_id_hash, price, timestamp);
    
    // Verify Ed25519 signature
    let pubkey_bytes = global.oracle_pubkey.to_bytes();
    let sig_offsets = ed25519_program::new_ed25519_instruction(
        &pubkey_bytes,
        &message,
        &signature,
    );
    
    // Check signature in transaction
    let current_ix = anchor_lang::solana_program::sysvar::instructions::get_instruction_relative(
        0,
        &ctx.accounts.sysvar_instructions,
    )?;
    
    require!(
        current_ix.program_id == ed25519_program::ID,
        SkinVaultError::OracleSignatureInvalid
    );
    
    // ... rest of function
}
```

**Update SetPriceSigned accounts:**
```rust
#[derive(Accounts)]
pub struct SetPriceSigned<'info> {
    // ... existing accounts ...
    
    /// CHECK: Ed25519 instruction sysvar
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub sysvar_instructions: AccountInfo<'info>,
}
```

---

### 3. ADD VRF CALLBACK AUTHORIZATION

**Problem**: Anyone can call `vrf_callback` with fake randomness.

**Fixed vrf_callback.rs:**
```rust
#[derive(Accounts)]
pub struct VrfCallback<'info> {
    #[account(
        seeds = [b"global"],
        bump = global.bump
    )]
    pub global: Account<'info, Global>,
    
    // ... existing accounts ...
    
    /// Only oracle or authority can provide VRF results
    #[account(
        constraint = vrf_authority.key() == global.oracle_pubkey 
                  || vrf_authority.key() == global.authority
        @ SkinVaultError::Unauthorized
    )]
    pub vrf_authority: Signer<'info>,
}

pub fn vrf_callback_handler(
    ctx: Context<VrfCallback>,
    request_id: u64,
    randomness: [u8; 32],
) -> Result<()> {
    // Verify VRF proof (when using real VRF like Switchboard)
    // For Switchboard: validate the VRF account and proof
    
    // ... rest of function
}
```

---

### 4. ADD INVENTORY UNIQUENESS TRACKING

**Problem**: Same inventory can be assigned to multiple boxes.

**Add new state account:**
```rust
// In state.rs
#[account]
pub struct InventoryAssignment {
    /// Hash of the assigned inventory
    pub inventory_id_hash: [u8; 32],
    
    /// Box mint that owns this inventory
    pub box_mint: Pubkey,
    
    /// Batch this inventory came from
    pub batch_id: u64,
    
    /// Timestamp of assignment
    pub assigned_at: i64,
    
    /// Bump
    pub bump: u8,
}

impl InventoryAssignment {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 8 + 1;
}
```

**Update Assign instruction:**
```rust
#[derive(Accounts)]
#[instruction(inventory_id_hash: [u8; 32])]
pub struct Assign<'info> {
    // ... existing accounts ...
    
    /// Track inventory assignment to prevent reuse
    #[account(
        init,
        payer = signer,
        seeds = [b"inventory", inventory_id_hash.as_ref()],
        bump,
        space = InventoryAssignment::LEN
    )]
    pub inventory_assignment: Account<'info, InventoryAssignment>,
    
    pub system_program: Program<'info, System>,
}

pub fn assign_handler(
    ctx: Context<Assign>,
    inventory_id_hash: [u8; 32],
    merkle_proof: Vec<[u8; 32]>,
    _backend_signature: Option<[u8; 64]>,
) -> Result<()> {
    // ... existing validation ...
    
    // Initialize inventory assignment
    let assignment = &mut ctx.accounts.inventory_assignment;
    assignment.inventory_id_hash = inventory_id_hash;
    assignment.box_mint = box_state.nft_mint;
    assignment.batch_id = box_state.batch_id;
    assignment.assigned_at = Clock::get()?.unix_timestamp;
    assignment.bump = ctx.bumps.inventory_assignment;
    
    // ... rest of function
}
```

---

### 5. IMPLEMENT TREASURY WITHDRAWAL

**Add to admin.rs:**
```rust
#[derive(Accounts)]
pub struct WithdrawTreasury<'info> {
    #[account(
        seeds = [b"global"],
        bump = global.bump,
        has_one = authority @ SkinVaultError::Unauthorized
    )]
    pub global: Account<'info, Global>,

    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = global
    )]
    pub treasury_ata: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = recipient_ata.mint == usdc_mint.key()
    )]
    pub recipient_ata: Account<'info, TokenAccount>,

    #[account(address = global.usdc_mint)]
    pub usdc_mint: Account<'info, Mint>,

    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

pub fn withdraw_treasury_handler(
    ctx: Context<WithdrawTreasury>,
    amount: u64,
) -> Result<()> {
    let global = &ctx.accounts.global;
    let treasury_balance = ctx.accounts.treasury_ata.amount;
    
    // Ensure minimum balance remains
    let remaining_balance = treasury_balance
        .checked_sub(amount)
        .ok_or(SkinVaultError::ArithmeticOverflow)?;
    
    require!(
        remaining_balance >= global.min_treasury_balance,
        SkinVaultError::TreasuryInsufficient
    );
    
    // Transfer from treasury
    let global_seeds: &[&[u8]] = &[
        b"global",
        &[global.bump],
    ];
    let signer_seeds: &[&[&[u8]]] = &[global_seeds];
    
    crate::cpi::spl::transfer_tokens(
        &ctx.accounts.token_program,
        &ctx.accounts.treasury_ata,
        &ctx.accounts.recipient_ata,
        &global.to_account_info(),
        amount,
        Some(signer_seeds),
    )?;
    
    msg!("Treasury withdrawal: {} USDC to {}", amount, ctx.accounts.authority.key());
    Ok(())
}
```

**Add to lib.rs:**
```rust
pub fn withdraw_treasury(ctx: Context<WithdrawTreasury>, amount: u64) -> Result<()> {
    instructions::admin::withdraw_treasury_handler(ctx, amount)
}
```

---

## 🟠 HIGH PRIORITY FIXES

### 6. ADD REAL METAPLEX INTEGRATION

**Replace placeholder in `cpi/metaplex.rs`:**
```rust
use anchor_lang::prelude::*;
use mpl_token_metadata::{
    instructions::{CreateMetadataAccountV3CpiBuilder, UpdateMetadataAccountV2CpiBuilder},
    types::DataV2,
};

pub fn create_metadata<'info>(
    metadata_program: &AccountInfo<'info>,
    metadata_account: &AccountInfo<'info>,
    mint: &AccountInfo<'info>,
    mint_authority: &AccountInfo<'info>,
    payer: &AccountInfo<'info>,
    update_authority: &AccountInfo<'info>,
    name: String,
    symbol: String,
    uri: String,
    seller_fee_basis_points: u16,
    creators: Option<Vec<Creator>>,
    signer_seeds: Option<&[&[&[u8]]]>,
) -> Result<()> {
    let data = DataV2 {
        name,
        symbol,
        uri,
        seller_fee_basis_points,
        creators: creators.map(|c| c.into_iter().map(|creator| {
            mpl_token_metadata::types::Creator {
                address: creator.address,
                verified: creator.verified,
                share: creator.share,
            }
        }).collect()),
        collection: None,
        uses: None,
    };
    
    let mut builder = CreateMetadataAccountV3CpiBuilder::new(metadata_program);
    builder
        .metadata(metadata_account)
        .mint(mint)
        .mint_authority(mint_authority)
        .payer(payer)
        .update_authority(update_authority, true)
        .is_mutable(true)
        .data(data);
    
    if let Some(seeds) = signer_seeds {
        builder.invoke_signed(seeds)?;
    } else {
        builder.invoke()?;
    }
    
    Ok(())
}
```

**Update Cargo.toml:**
```toml
[dependencies]
anchor-lang = { version = "0.31.1", features = ["init-if-needed"] }
anchor-spl = "0.31.1"
mpl-token-metadata = { version = "5.0", features = ["cpi"] }
```

---

### 7. ADD REDEEMED FLAG & NFT BURNING

**Update BoxState:**
```rust
#[account]
pub struct BoxState {
    // ... existing fields ...
    
    /// Whether the box has been redeemed (sold back)
    pub redeemed: bool,
    
    /// Timestamp of redemption
    pub redeem_time: i64,
}

impl BoxState {
    pub const LEN: usize = 8 + 32 + 8 + 1 + 32 + 32 + 8 + 8 + 8 + 1 + 8 + 1; // Updated
}
```

**Update SellBack:**
```rust
use anchor_spl::token::{Mint, burn, Burn, close_account, CloseAccount};

#[derive(Accounts)]
pub struct SellBack<'info> {
    // ... existing accounts ...
    
    #[account(
        mut,
        constraint = nft_mint.key() == box_state.nft_mint
    )]
    pub nft_mint: Account<'info, Mint>,
    
    #[account(
        mut,
        constraint = seller_nft_ata.mint == nft_mint.key(),
        constraint = seller_nft_ata.owner == seller.key(),
        constraint = seller_nft_ata.amount == 1
    )]
    pub seller_nft_ata: Account<'info, TokenAccount>,
}

pub fn sell_back_handler(
    ctx: Context<SellBack>,
    min_price: u64,
) -> Result<()> {
    // ... existing validation and payment ...
    
    // Burn the NFT
    burn(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                mint: ctx.accounts.nft_mint.to_account_info(),
                from: ctx.accounts.seller_nft_ata.to_account_info(),
                authority: ctx.accounts.seller.to_account_info(),
            },
        ),
        1,
    )?;
    
    // Close the token account
    close_account(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            CloseAccount {
                account: ctx.accounts.seller_nft_ata.to_account_info(),
                destination: ctx.accounts.seller.to_account_info(),
                authority: ctx.accounts.seller.to_account_info(),
            },
        ),
    )?;
    
    // Mark as redeemed
    let box_state = &mut ctx.accounts.box_state;
    box_state.redeemed = true;
    box_state.redeem_time = Clock::get()?.unix_timestamp;
    
    // ... rest of function
}
```

---

### 8. ADD EMERGENCY CONTROLS

**Update Global:**
```rust
#[account]
pub struct Global {
    // ... existing fields ...
    
    /// Emergency pause flag
    pub paused: bool,
    
    /// Pending authority for transfer
    pub pending_authority: Option<Pubkey>,
}
```

**Add to admin.rs:**
```rust
#[derive(Accounts)]
pub struct EmergencyPause<'info> {
    #[account(
        mut,
        seeds = [b"global"],
        bump = global.bump,
        has_one = authority @ SkinVaultError::Unauthorized
    )]
    pub global: Account<'info, Global>,
    pub authority: Signer<'info>,
}

pub fn emergency_pause_handler(ctx: Context<EmergencyPause>, paused: bool) -> Result<()> {
    ctx.accounts.global.paused = paused;
    msg!("Emergency pause: {}", paused);
    Ok(())
}

// Authority transfer (2-step process for safety)
pub fn initiate_authority_transfer_handler(
    ctx: Context<EmergencyPause>,
    new_authority: Pubkey,
) -> Result<()> {
    ctx.accounts.global.pending_authority = Some(new_authority);
    msg!("Authority transfer initiated to: {}", new_authority);
    Ok(())
}

#[derive(Accounts)]
pub struct AcceptAuthority<'info> {
    #[account(
        mut,
        seeds = [b"global"],
        bump = global.bump,
        constraint = global.pending_authority == Some(new_authority.key())
            @ SkinVaultError::Unauthorized
    )]
    pub global: Account<'info, Global>,
    pub new_authority: Signer<'info>,
}

pub fn accept_authority_handler(ctx: Context<AcceptAuthority>) -> Result<()> {
    let global = &mut ctx.accounts.global;
    global.authority = ctx.accounts.new_authority.key();
    global.pending_authority = None;
    msg!("Authority transferred to: {}", global.authority);
    Ok(())
}
```

**Add pause checks to all user functions:**
```rust
pub fn open_box_handler(ctx: Context<OpenBox>, pool_size: u64) -> Result<()> {
    require!(!ctx.accounts.global.paused, SkinVaultError::EmergencyPaused);
    // ... rest of function
}
```

---

## 🟡 MEDIUM PRIORITY IMPROVEMENTS

### 9. USE InterfaceAccount FOR TOKEN-2022 COMPATIBILITY

**Update all TokenAccount references:**
```rust
use anchor_spl::token_interface::{TokenInterface, TokenAccount};

#[derive(Accounts)]
pub struct SellBack<'info> {
    // ... other accounts ...
    
    #[account(
        mut,
        token::mint = usdc_mint,
        token::authority = global
    )]
    pub treasury_ata: InterfaceAccount<'info, TokenAccount>,
    
    #[account(
        mut,
        token::mint = usdc_mint,
        token::authority = seller
    )]
    pub user_ata: InterfaceAccount<'info, TokenAccount>,
    
    pub usdc_mint: InterfaceAccount<'info, Mint>,
    
    pub token_program: Interface<'info, TokenInterface>,
}
```

---

### 10. ADD COMPREHENSIVE TESTING

**Create `tests/integration.rs`:**
```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Skinvault } from "../target/types/skinvault";
import { expect } from "chai";

describe("skinvault-integration", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Skinvault as Program<Skinvault>;
  
  let globalPda: anchor.web3.PublicKey;
  let treasuryAta: anchor.web3.PublicKey;
  
  before(async () => {
    [globalPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("global")],
      program.programId
    );
  });
  
  it("Initializes the program", async () => {
    const tx = await program.methods
      .initialize(provider.wallet.publicKey)
      .accounts({
        global: globalPda,
        authority: provider.wallet.publicKey,
      })
      .rpc();
    
    const global = await program.account.global.fetch(globalPda);
    expect(global.authority.toString()).to.equal(provider.wallet.publicKey.toString());
  });
  
  // Add tests for:
  // - publish_merkle_root
  // - mint_box
  // - open_box
  // - vrf_callback
  // - assign
  // - set_price_signed
  // - sell_back
  // - Error cases
});
```

---

## 🔵 ADDITIONAL BEST PRACTICES

### 11. Add Collection Support

**Create collection mint and metadata, then verify boxes:**
```rust
pub fn verify_collection<'info>(
    metadata_program: &AccountInfo<'info>,
    metadata: &AccountInfo<'info>,
    collection_authority: &AccountInfo<'info>,
    collection_mint: &AccountInfo<'info>,
    collection_metadata: &AccountInfo<'info>,
    collection_master_edition: &AccountInfo<'info>,
    signer_seeds: Option<&[&[&[u8]]]>,
) -> Result<()> {
    use mpl_token_metadata::instructions::VerifyCollectionV1CpiBuilder;
    
    let mut builder = VerifyCollectionV1CpiBuilder::new(metadata_program);
    builder
        .metadata(metadata)
        .collection_authority(collection_authority)
        .collection_mint(collection_mint)
        .collection(collection_metadata)
        .collection_master_edition(collection_master_edition);
    
    if let Some(seeds) = signer_seeds {
        builder.invoke_signed(seeds)?;
    } else {
        builder.invoke()?;
    }
    
    Ok(())
}
```

---

## 📊 PRIORITY MATRIX

| Priority | Issue | Impact | Effort | Status |
|----------|-------|--------|--------|--------|
| 🔴 P0 | Oracle signature verification | Critical Security | Medium | TODO |
| 🔴 P0 | VRF callback authorization | Critical Security | Low | TODO |
| 🔴 P0 | Inventory uniqueness | Critical Logic | Medium | TODO |
| 🔴 P0 | Global PDA seed fix | Critical Design | Low | TODO |
| 🟠 P1 | Treasury withdrawal | High Functionality | Low | TODO |
| 🟠 P1 | Metaplex integration | High Functionality | High | TODO |
| 🟠 P1 | Emergency pause | High Security | Medium | TODO |
| 🟡 P2 | NFT burning on sellback | Medium Functionality | Low | TODO |
| 🟡 P2 | Token-2022 support | Medium Future | Medium | TODO |
| 🟡 P2 | Integration tests | Medium Quality | High | TODO |
| 🔵 P3 | Collection support | Low Enhancement | Medium | TODO |
| 🔵 P3 | Authority transfer | Low Security | Low | TODO |

---

## 🧪 TESTING CHECKLIST

- [ ] Initialize program
- [ ] Publish merkle root
- [ ] Mint box with NFT metadata
- [ ] Open box (VRF request)
- [ ] VRF callback with valid randomness
- [ ] Assign inventory with valid Merkle proof
- [ ] Assign inventory with invalid proof (should fail)
- [ ] Assign same inventory twice (should fail)
- [ ] Set price with valid oracle signature
- [ ] Set price with invalid signature (should fail)
- [ ] Sell back for USDC
- [ ] Sell back without assignment (should fail)
- [ ] Treasury deposit
- [ ] Treasury withdrawal
- [ ] Emergency pause/unpause
- [ ] Authority transfer
- [ ] VRF callback by unauthorized user (should fail)

---

## 📚 REFERENCES

- [Anchor Best Practices](https://book.anchor-lang.com/chapter_3/security.html)
- [Solana Security Best Practices](https://github.com/coral-xyz/sealevel-attacks)
- [Metaplex Token Metadata](https://github.com/metaplex-foundation/mpl-token-metadata)
- [Switchboard VRF](https://docs.switchboard.xyz/functions)

---

## ✅ DEPLOYMENT CHECKLIST

Before deploying to mainnet:

- [ ] All P0 issues fixed
- [ ] All P1 issues fixed
- [ ] Integration tests passing
- [ ] Security audit completed
- [ ] Upgrade authority set to multisig
- [ ] Treasury minimum balance configured
- [ ] Oracle configured and tested
- [ ] VRF provider integrated
- [ ] Emergency contacts established
- [ ] Monitoring and alerts configured

---

*Generated: 2025-10-01*
*Program: SkinVault v0.1.0*
*Reviewer: Cursor AI with Solana/Anchor Expert*


