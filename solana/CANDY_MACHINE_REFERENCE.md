# 🍬 Candy Machine Quick Reference

**Last Updated**: October 2, 2025
**Network**: Solana Devnet

---

## 🎯 Deployed Resources

```
Candy Machine ID: 5U4gnUzB9rR22UP3MyyZG3UvoSqx5wXreKRsmx6s5Qt1
Collection Mint:  2CanbJ2SrXpufaG34PXj5ELLnQu28i9ZauYsvoyuwM9Y
Authority:        mgfSqUe1qaaUjeEzuLUyDUx5Rk4fkgePB5NtLnS3Vxa
Test NFT Minted:  4n2x2B1PiWSyDKnYBTEkxJXXbgwuY7vg5e8yQ7iohHiS
```

---

## 🚀 Quick Commands

```bash
# View Candy Machine details
sugar show 5U4gnUzB9rR22UP3MyyZG3UvoSqx5wXreKRsmx6s5Qt1

# Mint 1 NFT
sugar mint -n 1

# Mint multiple NFTs
sugar mint -n 5

# Validate assets before changes
sugar validate

# Update Candy Machine (after asset changes)
sugar upload
sugar deploy

# Run tests
cd /Users/marcelofeitoza/sol-skins/solana
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
ANCHOR_WALLET=~/.config/solana/id.json \
node_modules/.bin/mocha --require ts-node/register \
  --extensions ts --timeout 120000 \
  tests/candy-machine.test.ts
```

---

## 📦 Available Skins

| Index | Name | Weapon | Rarity | Weight | Probability |
|-------|------|--------|--------|--------|-------------|
| 0 | Fire Serpent | AK-47 | Covert | 1 | 33.33% |
| 1 | Dragon Lore | AWP | Covert | 1 | 33.33% |
| 2 | Howl | M4A4 | Contraband | 1 | 33.33% |

---

## 🔐 Guards Configuration

### SOL Payment Guard
- **Amount**: 0.01 SOL per mint
- **Destination**: `mgfSqUe1qaaUjeEzuLUyDUx5Rk4fkgePB5NtLnS3Vxa`
- **Purpose**: Prevent free mints, cover costs

### Start Date Guard
- **Date**: 2025-01-01 00:00:00 UTC
- **Purpose**: Coordinated launch, prevent early mints

### Other Settings
- **Royalty**: 5% (500 basis points)
- **Mutable**: Yes
- **Sequential**: No (random order)

---

## 📁 Asset Structure

```
solana/assets/
├── 0.json + 0.png          → AK-47 | Fire Serpent
├── 1.json + 1.png          → AWP | Dragon Lore
├── 2.json + 2.png          → M4A4 | Howl
└── collection.json + .png  → CS:GO Skins Collection
```

### Metadata Template
```json
{
  "name": "Skin Name",
  "symbol": "SKIN",
  "description": "Description",
  "image": "X.png",
  "attributes": [
    { "trait_type": "Weapon", "value": "..." },
    { "trait_type": "Skin", "value": "..." },
    { "trait_type": "Rarity", "value": "..." },
    { "trait_type": "Collection", "value": "..." },
    { "trait_type": "Exterior", "value": "..." },
    { "trait_type": "Float", "value": "..." },
    { "trait_type": "Weight", "value": "1" }
  ],
  "properties": {
    "category": "image",
    "files": [{ "uri": "X.png", "type": "image/png" }]
  }
}
```

---

## 🔗 Integration with VRF System

### Flow
```
1. User opens loot box → open_box() instruction
2. VRF generates randomness → vrf_callback() instruction
3. Randomness % 3 = skin index (0, 1, or 2)
4. User claims → reveal_and_claim() instruction (TODO)
5. CPI to Candy Machine → mints NFT at index
6. NFT transferred to user
```

### Code Example (To Implement)
```rust
pub fn reveal_and_claim(ctx: Context<RevealAndClaim>) -> Result<()> {
    let vrf_pending = &ctx.accounts.vrf_pending;
    let randomness = vrf_pending.randomness;
    
    // Deterministic index
    let skin_index = (randomness % 3) as usize;
    
    msg!("Revealing skin index: {}", skin_index);
    
    // CPI to Candy Machine
    mint_from_candy_machine_v2(
        CpiContext::new_with_signer(
            ctx.accounts.candy_machine_program.to_account_info(),
            MintFromCandyMachineV2 {
                candy_machine: ctx.accounts.candy_machine.to_account_info(),
                candy_machine_authority: ctx.accounts.candy_machine_authority.to_account_info(),
                payer: ctx.accounts.user.to_account_info(),
                nft_mint: ctx.accounts.nft_mint.to_account_info(),
                nft_mint_authority: ctx.accounts.nft_mint_authority.to_account_info(),
                nft_metadata: ctx.accounts.nft_metadata.to_account_info(),
                nft_master_edition: ctx.accounts.nft_master_edition.to_account_info(),
                collection_mint: ctx.accounts.collection_mint.to_account_info(),
                collection_metadata: ctx.accounts.collection_metadata.to_account_info(),
                collection_master_edition: ctx.accounts.collection_master_edition.to_account_info(),
                token_metadata_program: ctx.accounts.token_metadata_program.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
            },
            &[],
        ),
    )?;
    
    Ok(())
}
```

---

## 💰 Cost Breakdown

### Per Mint
- **Traditional**: 0.012 SOL
- **Candy Machine**: 0.01 SOL
- **Savings**: 0.002 SOL (16.7%)

### At Scale
- **100 mints**: Save 0.2 SOL
- **1,000 mints**: Save 2 SOL
- **10,000 mints**: Save 20 SOL

### Additional Benefits
- Permanent Arweave storage (via Bundlr)
- No metadata duplication
- Metaplex security guarantees
- Ecosystem compatibility

---

## 🧪 Testing

### Run All Tests
```bash
cd solana
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
ANCHOR_WALLET=~/.config/solana/id.json \
node_modules/.bin/mocha --require ts-node/register \
  --extensions ts --timeout 120000 \
  'tests/*.test.ts'
```

### Test Suites
1. **candy-machine.test.ts** (26 tests)
   - Deployment verification
   - Minting functionality
   - Security guards
   - Randomness integration
   - Cost analysis

2. **vrf-security.test.ts** (5 tests)
   - Oracle-only access
   - Randomness quality
   - VRF architecture

3. **vrf-simple.test.ts** (3 tests)
   - Basic VRF validation
   - Mock VRF testing
   - Switchboard readiness

---

## 🔍 Debugging

### View Candy Machine on Explorer
```
https://explorer.solana.com/address/5U4gnUzB9rR22UP3MyyZG3UvoSqx5wXreKRsmx6s5Qt1?cluster=devnet
```

### View Collection NFT
```
https://explorer.solana.com/address/2CanbJ2SrXpufaG34PXj5ELLnQu28i9ZauYsvoyuwM9Y?cluster=devnet
```

### View Test Minted NFT
```
https://explorer.solana.com/address/4n2x2B1PiWSyDKnYBTEkxJXXbgwuY7vg5e8yQ7iohHiS?cluster=devnet
```

### Check Logs
```bash
# Sugar logs
sugar logs

# Solana program logs
solana logs | grep skinvault
```

---

## 📚 Next Steps

### Phase 4: Program Integration
- [ ] Add `mpl-candy-machine-core` dependency
- [ ] Implement `reveal_and_claim()` instruction
- [ ] Add CPI to Candy Machine
- [ ] Write integration tests
- [ ] Test full flow: open → vrf → claim

### Phase 5: Core NFT Migration
- [ ] Study Metaplex Core documentation
- [ ] Update metadata format
- [ ] Migrate collection to Core
- [ ] Update program CPIs
- [ ] Measure cost savings

### Phase 6: Mainnet Deployment
- [ ] Audit smart contract
- [ ] Upload production assets
- [ ] Configure mainnet guards
- [ ] Deploy to mainnet
- [ ] Set up monitoring

---

## 🆘 Troubleshooting

### "Error: Bundlr is only supported on devnet or mainnet"
**Solution**: Switch to devnet
```bash
solana config set --url devnet
```

### "Error: missing field `ruleSet`"
**Solution**: Add to config.json
```json
"ruleSet": null,
```

### "Error: airdrop request failed"
**Solution**: Use faucet
```
https://faucet.solana.com
```

### "Error: Account not found"
**Solution**: Verify Candy Machine ID
```bash
sugar show <CANDY_MACHINE_ID>
```

---

## 📞 Support

- **Metaplex Discord**: https://discord.gg/metaplex
- **Solana Discord**: https://discord.gg/solana
- **Documentation**: https://developers.metaplex.com

---

**Ready for Phase 4!** 🚀

