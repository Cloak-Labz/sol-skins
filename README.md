# PhygiBox - Phygital Loot Boxes on Solana

A complete platform for phygital loot boxes on Solana, featuring VRF reveals, instant buyback options, and transparent Merkle proofs.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- Docker and Docker Compose
- Solana CLI tools
- Anchor CLI

### Setup

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Start infrastructure**
   ```bash
   docker compose up -d
   ```

3. **Setup database**
   ```bash
   pnpm db:migrate
   pnpm db:seed
   ```

4. **Build and test Anchor program**
   ```bash
   pnpm anchor:build
   pnpm anchor:test
   ```

5. **Start development servers**
   ```bash
   pnpm dev
   ```

This will start:
- Web app: http://localhost:3000
- API: http://localhost:3001
- Worker: Background jobs

## 📁 Project Structure

```
phygibox-monorepo/
├── apps/
│   ├── web/                # Next.js frontend
│   ├── api/                # Fastify API server
│   └── worker/             # Background jobs
├── packages/
│   ├── anchor/             # Solana program
│   ├── ui/                 # Shared React components
│   ├── types/              # TypeScript types
│   └── config/             # Shared configurations
└── docker-compose.yml      # Infrastructure
```

## 🎮 Core Features

### Loot Box System
- **VRF Reveals**: Transparent, verifiable randomness
- **Merkle Proofs**: Cryptographic verification of inventory
- **Instant Buyback**: Sell back skins at market price
- **Phygital Items**: Digital skins backed by real inventory

### Technical Stack
- **Blockchain**: Solana + Anchor framework
- **Frontend**: Next.js + React + Tailwind CSS
- **Backend**: Fastify + Prisma + PostgreSQL (API port 3002, DB port 5433)
- **Workers**: Node.js + Cron jobs
- **Monorepo**: Turborepo + pnpm

## 🔧 Development

### Available Scripts

```bash
# Development
pnpm dev                 # Start all services
pnpm build              # Build all packages
pnpm lint               # Lint all packages
pnpm test               # Run all tests

# Database
pnpm db:migrate         # Run migrations
pnpm db:seed            # Seed database
pnpm db:reset           # Reset database

# Anchor
pnpm anchor:build       # Build Solana program
pnpm anchor:test        # Test Solana program

# Individual apps
pnpm --filter web dev   # Start web app only
pnpm --filter api dev   # Start API only
pnpm --filter worker dev # Start worker only
```

### Environment Variables

Copy the example files and configure:

```bash
# API
cp apps/api/env.example apps/api/.env

# Worker
cp apps/worker/env.example apps/worker/.env

# Web
cp apps/web/env.local.example apps/web/.env.local

# Anchor
cp packages/anchor/env.example packages/anchor/.env
```

## 🏗️ Architecture

### Solana Program (packages/anchor)
- **GlobalState**: Admin, oracle, treasury configuration
- **Batch**: Merkle root and supply tracking
- **Assignment**: NFT to inventory mapping
- **Instructions**: Initialize, mint, open, assign, buyback

### API (apps/api)
- **RESTful endpoints** for all operations
- **Prisma ORM** with PostgreSQL (port 5433)
- **Zod validation** for request/response
- **JWT authentication** for admin routes

### Worker (apps/worker)
- **Price Oracle**: Aggregates and signs market prices
- **Snapshot Generator**: Creates Merkle trees from inventory
- **On-chain Listener**: Processes Solana events

### Web App (apps/web)
- **Wallet Integration**: Phantom, Solflare support
- **Real-time Updates**: Live price and status updates
- **Responsive Design**: Mobile-first approach

## 🔐 Security Features

- **Multisig Admin**: On-chain admin operations
- **Oracle Verification**: Ed25519 signature validation
- **Circuit Breaker**: Treasury protection
- **Replay Protection**: Nonce-based transaction safety
- **Rate Limiting**: API protection

## 📊 Database Schema

### Core Tables
- `users`: Wallet addresses and metadata
- `loot_boxes`: Available loot box types
- `skins`: Inventory items with rarity and pricing
- `user_skins`: User ownership records
- `transactions`: All platform transactions
- `assignments`: NFT to inventory mappings
- `merkle_snapshots`: Inventory state proofs
- `treasury_ledger`: Financial tracking

## 🧪 Testing

### Unit Tests
```bash
pnpm test
```

### E2E Tests
```bash
pnpm --filter web test:e2e
```

### Anchor Tests
```bash
pnpm anchor:test
```

## 🚀 Deployment

### Local Development
1. Start Solana test validator
2. Deploy Anchor program
3. Update `NEXT_PUBLIC_PROGRAM_ID`
4. Run all services

### Production
1. Deploy to Solana mainnet
2. Configure production database
3. Set up monitoring and alerts
4. Deploy to cloud infrastructure

## 📈 Monitoring

- **Health Checks**: `/health` endpoints
- **Metrics**: Transaction counts, treasury balance
- **Logs**: Structured logging across all services
- **Alerts**: Critical error notifications

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- **Documentation**: [docs/](./docs/)
- **Issues**: [GitHub Issues](./issues)
- **Discord**: [Community Server](./discord)

---

Built with ❤️ for the Solana ecosystem
