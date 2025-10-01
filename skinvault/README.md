# SkinVault Protocol

A decentralized lootbox system on Solana with verifiable randomness (VRF), Merkle-tree inventory proofs, and instant USDC buyback functionality.

## Features

- **Verifiable Randomness**: Uses VRF for provably fair lootbox opening
- **Merkle Tree Inventory**: On-chain verification of inventory snapshots  
- **Instant Buyback**: Sell skins back for USDC at market prices
- **Oracle Price Feeds**: Signed price data from trusted oracles
- **Circuit Breakers**: Treasury safeguards and admin controls
- **NFT Metadata**: Full Metaplex integration for skin NFTs

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Mint Boxes    │    │   Open Boxes    │    │  Assign Items   │
│                 │    │                 │    │                 │
│ • Create NFT    │───▶│ • Request VRF   │───▶│ • Merkle Proof  │
│ • Link to Batch │    │ • Get Random #  │    │ • Update State  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
┌─────────────────┐    ┌─────────────────┐             │
│   Set Prices    │    │   Sell Back     │◀────────────┘
│                 │    │                 │
│ • Oracle Sign   │───▶│ • Check Price   │
│ • Store Price   │    │ • Transfer USDC │
└─────────────────┘    └─────────────────┘
```

## Quick Start

### Prerequisites

- [Rust](https://rustup.rs/) 
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools)
- [Anchor Framework](https://www.anchor-lang.com/docs/installation) >= 0.30.1
- [Node.js](https://nodejs.org/) >= 18

### Installation

```bash
# Clone and navigate to project
cd apps/skinvault

# Install dependencies
npm install

# Generate keypair for testing (if needed)
solana-keygen new --outfile ~/.config/solana/id.json

# Set Solana to devnet
solana config set --url devnet
```

### Build & Deploy

```bash
# Build the program
anchor build

# Deploy to devnet
anchor deploy

# Run tests
anchor test
```

### Setup Treasury

```bash
# Seed treasury with test USDC
npx ts-node scripts/seed_treasury.ts

# Publish sample inventory merkle root
npx ts-node scripts/publish_merkle.ts
```

## Program Instructions

### Core Flow

1. **Initialize**: Set up global state with authority and oracle
2. **Publish Merkle Root**: Submit inventory snapshot with merkle tree root
3. **Mint Box**: Create lootbox NFT linked to batch  
4. **Open Box**: Request VRF for random item selection
5. **VRF Callback**: Fulfill randomness and mark box as opened
6. **Assign**: Prove inventory item ownership with merkle proof
7. **Set Price**: Oracle signs and publishes market prices
8. **Sell Back**: Exchange assigned item for USDC payout

### Admin Functions

- `set_oracle`: Update price oracle public key
- `toggle_buyback`: Enable/disable buyback functionality  
- `set_min_treasury_balance`: Set circuit breaker threshold
- `deposit_treasury`: Add USDC to buyback vault

## Testing

```bash
# Run full test suite
anchor test

# Run specific test file
anchor test --skip-deploy tests/skinvault.spec.ts

# Run with verbose logging
anchor test -- --verbose
```

### Test Coverage

- ✅ Program initialization
- ✅ Merkle root publishing
- ✅ Box minting and opening  
- ✅ VRF callback processing
- ✅ Inventory assignment with proofs
- ✅ Price oracle integration
- ✅ USDC buyback execution
- ✅ Admin controls and toggles
- ✅ Error cases and reverts

## Scripts

### Merkle Tree Generator

```bash
# Generate and publish merkle tree for inventory
npx ts-node scripts/publish_merkle.ts [inventory.json]

# Example inventory.json format:
[
  {
    "id": "weapon_ak47_redline",
    "name": "AK-47 | Redline", 
    "rarity": "classified",
    "metadata": "https://example.com/metadata/ak47_redline.json"
  }
]
```

### Treasury Management

```bash
# Initialize and fund treasury
npx ts-node scripts/seed_treasury.ts [config.json]

# Example config.json:
{
  "initialDeposit": 50000,
  "createNewMint": true,
  "existingMintAddress": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
}
```

## SDK Usage

```typescript
import { SkinVaultClient } from './app/sdk/client';
import { Connection, PublicKey } from '@solana/web3.js';

// Initialize client
const connection = new Connection('https://api.devnet.solana.com');
const programId = new PublicKey('SKINVault1111111111111111111111111111111111');
const client = SkinVaultClient.create(connection, wallet, programId);

// Mint a lootbox
const signature = await client.mintBox(
  userKeypair,
  batchId,
  nftMint,
  nftAta,
  'https://example.com/metadata.json'
);

// Open the box
await client.openBox(userKeypair, nftMint, poolSize);

// Assign inventory item 
await client.assign(
  userKeypair,
  nftMint,
  inventoryHash,
  merkleProof
);

// Sell back for USDC
await client.sellBack(
  userKeypair,
  nftMint,
  usdcMint,
  userUsdcAta,
  minPrice
);
```

## Security Features

### Circuit Breakers
- Minimum treasury balance requirements
- Buyback enable/disable toggle
- Price staleness checks (5 minute timeout)

### Verification
- Merkle proof validation for inventory claims
- Oracle signature verification for prices
- VRF randomness validation
- Owner authorization checks

### Access Control
- Authority-only admin functions
- Box owner restrictions
- Oracle-signed price updates

## Deployment Addresses

### Devnet
- **Program**: `SKINVault1111111111111111111111111111111111`
- **USDC Mint**: *Generated per deployment*
- **Authority**: *Your keypair*

### Mainnet  
- **Program**: *TBD*
- **USDC Mint**: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`

## Environment Variables

```bash
# .env
RPC_URL=https://api.devnet.solana.com
WALLET_PATH=~/.config/solana/id.json
PROGRAM_ID=SKINVault1111111111111111111111111111111111
```

## Development Roadmap

### Phase 1 ✅ (Current)
- [x] Core lootbox mechanics
- [x] Mock VRF implementation  
- [x] Basic merkle tree validation
- [x] USDC buyback system
- [x] Admin controls

### Phase 2 🚧
- [ ] MagicBlock VRF integration
- [ ] Metaplex metadata CPI
- [ ] Switchboard price feeds
- [ ] Collection verification
- [ ] Advanced admin features

### Phase 3 📋
- [ ] Multi-signature authority
- [ ] Staking mechanics
- [ ] Cross-program composability
- [ ] Enhanced analytics
- [ ] Mobile SDK

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Links

- [Anchor Documentation](https://www.anchor-lang.com/)
- [Solana Documentation](https://docs.solana.com/)
- [MagicBlock VRF](https://docs.magicblock.gg/)
- [Switchboard Oracles](https://docs.switchboard.xyz/)
- [Metaplex Metadata](https://docs.metaplex.com/)
