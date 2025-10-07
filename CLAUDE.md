# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SolSkins is a decentralized CS:GO skin loot box platform built on Solana. Users purchase loot boxes, open them using VRF (Verifiable Random Function) for provably fair randomness, receive CS:GO skins as NFTs, and can either keep them in their inventory or sell via instant buyback at 85% of market value.

## Repository Structure

This is a multi-component monorepo with:

- **`solana/`** - Anchor program (Rust smart contract)
- **`src/client/`** - Next.js 15 frontend with App Router
- **`src/server/`** - Express.js backend API with TypeORM
- **`src/worker/`** - Background worker for blockchain events
- **`deployment/`** - Docker Compose for PostgreSQL and Redis

## Development Commands

### Initial Setup

```bash
# Install dependencies (uses pnpm)
pnpm install

# Start database infrastructure
cd deployment && docker-compose up -d

# Setup database (from src/server/)
cd src/server
npm run schema:sync  # Development only
# OR
npm run migration:run  # Production

# Build Solana program
cd solana
anchor build
```

### Development Workflow

```bash
# Frontend (Next.js)
cd src/client
npm run dev          # http://localhost:3000

# Backend (Express)
cd src/server
npm run dev          # http://localhost:3001

# Solana Program
cd solana
anchor build         # Compile program
anchor test          # Run all tests
anchor test --skip-build  # Run without rebuilding
```

### Solana Testing

```bash
# From solana/ directory

# Run all tests (full suite)
anchor test

# Run specific test suites
npm run test                    # Integration flow
npm run test-integration        # Same as above
npm run test-simple            # Simple VRF test
npm run test-vrf-security      # VRF security tests
npm run test-mainnet           # Mainnet VRF test

# Run with logs
anchor test --skip-local-validator  # If validator already running

# Deploy to devnet
anchor deploy --provider.cluster devnet
```

### Database Management

```bash
# From src/server/
npm run migration:generate  # Generate migration from entity changes
npm run migration:run       # Apply migrations
npm run migration:revert    # Rollback last migration
npm run schema:sync         # Sync schema (dev only - destructive!)
npm run schema:drop         # Drop entire schema
```

## Architecture

### Data Flow

```
User → Frontend (Next.js)
     → Backend API (Express)
     → Solana Program (Anchor)
     → Switchboard VRF (randomness)
     → Backend processes event
     → Update database
     → Notify frontend
```

### Loot Box Opening Flow

1. **Purchase**: User initiates box opening via frontend
2. **Backend**: Creates transaction record, calls Solana program
3. **On-chain**: `open_box` instruction requests VRF randomness
4. **VRF Callback**: Switchboard calls `vrf_callback` with random seed
5. **Reveal**: `reveal_and_claim` mints NFT from Candy Machine based on random index
6. **Backend**: Processes events, determines skin, updates database
7. **Frontend**: Polls status, shows result animation
8. **User Decision**: Keep (add to inventory) or sell (instant buyback)

### Buyback Flow

1. User selects skin from inventory
2. Backend determines current price (from off-chain data)
3. Backend calls `sell_back` on Solana program
4. Program applies 85% rate + 1% spread fee
5. Program transfers USDC to user, burns/redeems NFT
6. Backend updates database, creates transaction record

## Solana Program (Anchor)

**Program ID**: `6cSLcQ5RCyzPKeFWux2UMjm3SWf3tD41vHK5qsuphzKZ`
**Location**: `solana/programs/solana/src/`

### Key Instructions

- **`initialize`** - Set up global state
- **`publish_merkle_root`** - Publish new inventory batch with Merkle root
- **`create_box`** - Create box state account before minting
- **`open_box`** - Request VRF randomness for box opening
- **`vrf_callback`** - VRF callback with randomness
- **`reveal_and_claim`** - Mint NFT from Candy Machine using random index
- **`sell_back`** - Execute buyback, transfer USDC, burn NFT

### Admin Instructions

- **`toggle_buyback`** - Enable/disable buyback system
- **`set_min_treasury_balance`** - Circuit breaker threshold
- **`deposit_treasury`** / **`withdraw_treasury`** - Treasury management
- **`emergency_pause`** - Pause all user operations
- **`initiate_authority_transfer`** / **`accept_authority`** - 2-step authority transfer

### Important States

- **`Global`** - Program configuration (PDA: `["global"]`)
- **`Batch`** - Inventory batch with Merkle root (PDA: `["batch", batch_id]`)
- **`BoxState`** - Individual box state (PDA: `["box", nft_mint]`)
- **`VrfPending`** - Pending VRF request (PDA: `["vrf", request_id]`)
- **`InventoryAssignment`** - Prevents double-assignment (PDA: `["assignment", inventory_id_hash]`)

### Testing Notes

- Test keypairs stored in `solana/test-keypairs/` (git-ignored)
- Tests use `.accountsPartial()` to leverage Anchor's PDA auto-derivation
- Comprehensive logging with emojis for test progress
- Devnet testing requires manual keypair funding due to airdrop limits
- See `solana/TEST_GUIDE.md` for detailed testing documentation

## Backend (Express + TypeORM)

**Location**: `src/server/`
**Port**: `3001`
**Documentation**: http://localhost:3001/api-docs (Swagger)

### Key Entities

- **Users** - Wallet address, stats (total spent/earned, cases opened)
- **LootBoxTypes** - Case definitions with drop probabilities
- **SkinTemplates** - Base skin data (weapon, name, rarity, condition, price)
- **LootBoxSkinPools** - Weighted skin pools per case type
- **UserSkins** - NFTs owned by users (mint address, opened date, status)
- **Transactions** - All platform transactions (open_case, buyback, payout)
- **CaseOpenings** - Case opening records with VRF data
- **PriceHistory** - Historical price tracking from external sources

### API Structure

```
src/server/
├── controllers/     # Request handlers (thin layer)
├── services/        # Business logic
├── repositories/    # Data access layer
├── entities/        # TypeORM entities
├── routes/          # Route definitions
├── middlewares/     # Auth, validation, security
├── config/          # DB, Swagger, environment
└── utils/           # Helper functions
```

### Key Endpoints

- `POST /api/v1/auth/connect` - Wallet authentication
- `GET /api/v1/marketplace/loot-boxes` - List available cases
- `POST /api/v1/cases/open` - Initiate case opening
- `GET /api/v1/cases/opening/:id/status` - Poll opening status
- `POST /api/v1/cases/opening/:id/decision` - Keep or sell
- `GET /api/v1/inventory` - User's NFT inventory
- `POST /api/v1/inventory/:skinId/buyback` - Sell skin
- `GET /api/v1/history/transactions` - Transaction history
- `GET /api/v1/leaderboard` - User rankings
- `GET /api/v1/activity/recent` - Recent platform activity

See `docs/backend-knowledge-base.md` for complete API documentation.

## Frontend (Next.js)

**Location**: `src/client/`
**Port**: `3000`
**Framework**: Next.js 15 with App Router

### Tech Stack

- Next.js 15 (React 18)
- TypeScript
- Tailwind CSS v4
- ShadCN/UI components
- Solana wallet adapters (@solana/wallet-adapter-react)
- React Hot Toast for notifications
- Framer Motion for animations

### Key Features

- Wallet connection (Phantom, Backpack, etc.)
- Marketplace browser with filters
- Box opening with roulette animation
- Inventory management
- Transaction history
- Leaderboard and activity feed

## Integration Points

### Metaplex NFT Lifecycle

The program uses Metaplex Token Metadata for NFT management:

1. **Mint Box**: Creates NFT with mystery box metadata
2. **Open Box**: BoxState updated, metadata unchanged
3. **Reveal & Claim**: Mints actual skin NFT from Candy Machine
4. **Assign** (optional): Updates metadata to show skin details

All NFTs are mutable to allow metadata updates. See `solana/METAPLEX_INTEGRATION.md` for details.

### Walrus Integration

Metadata storage uses Walrus (Sui-based decentralized storage). Upload scripts in `scripts/upload-to-walrus.ts` and `solana/upload-to-walrus.ts`.

### VRF Security

Switchboard VRF provides verifiable randomness:
- VrfPending account prevents callback replay
- Random index calculated: `randomness % pool_size`
- See `solana/SECURITY_REVIEW.md` and `solana/vrf-security.test.ts`

### Candy Machine

Uses Metaplex Candy Machine v3 for NFT drops:
- Each batch linked to a Candy Machine
- `reveal_and_claim` uses random index to mint specific item
- See `solana/CANDY_MACHINE_REFERENCE.md`

## Environment Variables

### Backend (`src/server/.env`)

```bash
# Database
DB_HOST=localhost
DB_PORT=5433
DB_NAME=loot
DB_USER=postgres
DB_PASSWORD=postgres

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Solana
SOLANA_RPC_URL=https://api.devnet.solana.com
ANCHOR_WALLET=~/.config/solana/id.json

# API
PORT=3001
NODE_ENV=development
JWT_SECRET=<random-secret>
```

### Solana (`solana/.env` - if needed)

```bash
ANCHOR_PROVIDER_URL=http://127.0.0.1:8899
ANCHOR_WALLET=~/.config/solana/id.json
```

## Important Files

- **`solana/Anchor.toml`** - Anchor configuration, program ID, cluster settings
- **`solana/programs/solana/src/lib.rs`** - Program entry point
- **`solana/programs/solana/src/instructions/`** - All instruction handlers
- **`solana/TEST_GUIDE.md`** - Comprehensive testing guide
- **`docs/backend-knowledge-base.md`** - Complete backend documentation
- **`src/server/README.md`** - Backend setup and API reference

## Common Workflows

### Adding a New Instruction

1. Create handler in `solana/programs/solana/src/instructions/`
2. Define accounts context struct
3. Add to `mod.rs` and `lib.rs`
4. Write test in `solana/tests/`
5. Update TypeScript client if needed

### Adding a New API Endpoint

1. Define entity in `src/server/entities/`
2. Create repository in `src/server/repositories/`
3. Implement service in `src/server/services/`
4. Create controller in `src/server/controllers/`
5. Add route in `src/server/routes/`
6. Add Swagger documentation

### Adding a New Frontend Page

1. Create route in `src/client/app/`
2. Build components in `src/client/components/`
3. Add API calls in `src/client/lib/api/`
4. Update types in `src/client/lib/types/`

## Testing Best Practices

### Solana Tests

- Use persistent keypairs in `solana/test-keypairs/` to avoid airdrop limits
- Use `.accountsPartial()` to let Anchor derive PDAs automatically
- Fund test accounts once, reuse across test runs
- Check `solana/TEST_GUIDE.md` for common issues

### Backend Tests

- Use test database separate from development
- Mock Solana interactions for unit tests
- Test script: `src/server/test-all-endpoints.sh`

## Deployment

### Devnet Deployment

```bash
# Update Anchor.toml
# cluster = "devnet"

# Build and deploy
cd solana
anchor build
anchor deploy --provider.cluster devnet

# Note deployed program ID and update Anchor.toml if changed
```

### Production Considerations

- Use mainnet Candy Machines with real inventory
- Configure production RPC endpoints (Helius, QuickNode)
- Set up proper VRF infrastructure (Switchboard)
- Implement real price feeds from external sources (Steam Market, CSGOFloat, DMarket)
- Configure USDC mint for mainnet
- Set appropriate treasury minimum balance
- Set up Redis cache for price data with appropriate TTL

## Security Notes

- Program authority has admin privileges (pause, treasury withdrawal, etc.)
- 2-step authority transfer prevents accidental transfers
- Emergency pause stops all user operations
- Circuit breaker enforces minimum treasury balance
- Rate limiting on backend API endpoints
- Wallet signature verification for authentication

## Documentation Resources

- **Anchor Book**: https://book.anchor-lang.com
- **Solana Docs**: https://docs.solana.com
- **Metaplex Docs**: https://docs.metaplex.com
- **Switchboard Docs**: https://docs.switchboard.xyz
- **TypeORM Docs**: https://typeorm.io

## Known Issues & TODOs

- Worker service (`src/worker/`) not fully implemented - needs event listeners
- Price data integration from external sources (Steam, CSGOFloat, DMarket) needs implementation
- Redis cache setup for price data not configured
- Collection support for NFTs not yet added (planned)
- Real-time WebSocket notifications not implemented
- Frontend integration with backend API incomplete
- Solana program call in `InventoryService.sellSkinViaBuyback()` needs implementation (line 88-100)
