# Dust3

A decentralized CS:GO skin trading platform built on the Solana blockchain, featuring NFT-based skin ownership, loot box mechanics, and peer-to-peer marketplace functionality.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Development](#development)
- [Database](#database)
- [Smart Contracts](#smart-contracts)
- [API Documentation](#api-documentation)
- [Security](#security)
- [Testing](#testing)
- [Deployment](#deployment)
- [License](#license)

## Overview

Dust3 is a full-stack Web3 application that bridges traditional CS:GO skin trading with blockchain technology. The platform enables users to:

- Mint CS:GO skins as Solana NFTs using Metaplex standards
- Open loot boxes with provably fair randomization
- Trade skins on a peer-to-peer marketplace
- Buy back skins for SOL tokens
- Track price history and market analytics
- Manage inventory across wallet and platform holdings

The platform leverages Solana's high throughput and low transaction costs to provide a seamless trading experience, while maintaining full transparency through on-chain verification.

## Architecture

### System Components

The application follows a multi-tier architecture:

```
┌─────────────────┐
│   Next.js Web   │  Frontend (React 18 + Next.js 15)
│   Application   │  Wallet integration, 3D renders
└────────┬────────┘
         │
    ┌────▼────┐
    │   API   │
    │ Gateway │
    └────┬────┘
         │
┌────────▼────────┐
│  Express.js API │  RESTful backend with security layers
│     Server      │  Authentication, rate limiting, CSRF
└────────┬────────┘
         │
    ┌────▼────┐
    │TypeORM  │
    │   ORM   │
    └────┬────┘
         │
┌────────▼────────┐
│   PostgreSQL    │  Relational data store
│    Database     │  Transactions, users, inventory
└─────────────────┘

┌─────────────────┐
│  Solana Network │  Blockchain layer
│   (Devnet/Main) │  NFT minting, on-chain verification
└─────────────────┘

┌─────────────────┐
│  Irys/Arweave   │  Decentralized storage
│   (Metadata)    │  NFT metadata and assets
└─────────────────┘
```

### Data Flow

1. User connects Solana wallet (Phantom, Solflare, etc.)
2. Authentication via cryptographic signature verification
3. Backend validates requests with CSRF tokens and nonce replay protection
4. Database tracks user inventory, transactions, and marketplace listings
5. Smart contracts handle NFT minting and ownership transfers
6. Metadata stored permanently on Arweave via Irys

## Technology Stack

### Frontend

- **Framework**: Next.js 15.5.4 (App Router)
- **UI Library**: React 18.3.1
- **Styling**: Tailwind CSS 4.1.9
- **Component Library**: Radix UI primitives
- **3D Rendering**: Three.js + React Three Fiber
- **Animation**: Framer Motion
- **State Management**: React Context + Hooks
- **Wallet Integration**: Solana Wallet Adapter
- **Forms**: React Hook Form + Zod validation
- **Analytics**: Vercel Analytics

### Backend

- **Runtime**: Node.js with TypeScript 5
- **Framework**: Express.js 4.18.2
- **ORM**: TypeORM 0.3.17
- **Database**: PostgreSQL 14
- **Cache**: Redis 7 (optional), Node-Cache (in-memory)
- **Authentication**: JWT (jsonwebtoken)
- **Security**: Helmet, CORS, Rate Limiting, CSRF protection
- **Validation**: express-validator, Joi
- **Logging**: Winston 3.11.0 + Morgan
- **API Documentation**: Swagger (OpenAPI 3.0)
- **Testing**: Jest 29 + Supertest

### Blockchain

- **Network**: Solana (Devnet/Mainnet)
- **Smart Contracts**: Anchor Framework 0.32.1 (Rust)
- **NFT Standard**: Metaplex Token Metadata v3
- **Web3 SDK**: @solana/web3.js 1.98.4
- **Token Standard**: SPL Token 0.4.14
- **Metadata Storage**: Irys SDK 0.2.11 (Arweave)

### Infrastructure

- **Deployment**: Vercel (frontend), Docker (backend)
- **Database**: PostgreSQL 14
- **Containerization**: Docker Compose
- **Version Control**: Git

## Project Structure

```
dust3fun/
├── src/
│   ├── client/                  # Next.js frontend application
│   │   ├── app/                 # Next.js App Router
│   │   │   ├── api/             # API routes (waitlist, etc.)
│   │   │   ├── app-dashboard/   # Dashboard pages
│   │   │   │   ├── activity/    # User activity tracking
│   │   │   │   ├── admin/       # Admin panel
│   │   │   │   ├── inventory/   # User inventory management
│   │   │   │   ├── leaderboard/ # Platform leaderboards
│   │   │   │   ├── marketplace/ # Skin marketplace
│   │   │   │   ├── packs/       # Loot box opening
│   │   │   │   └── profile/     # User profiles
│   │   │   ├── privacy/         # Privacy policy
│   │   │   ├── terms/           # Terms of service
│   │   │   ├── layout.tsx       # Root layout
│   │   │   └── page.tsx         # Landing page
│   │   ├── components/          # React components
│   │   ├── lib/                 # Utility functions
│   │   ├── hooks/               # Custom React hooks
│   │   ├── public/              # Static assets
│   │   ├── next.config.mjs      # Next.js configuration
│   │   ├── tailwind.config.ts   # Tailwind CSS config
│   │   └── package.json
│   │
│   ├── server/                  # Express.js backend API
│   │   ├── config/              # Configuration files
│   │   │   ├── database.ts      # Database connection
│   │   │   ├── env.ts           # Environment variables
│   │   │   └── swagger.ts       # API documentation
│   │   ├── controllers/         # Request handlers
│   │   ├── services/            # Business logic layer
│   │   ├── repositories/        # Data access layer
│   │   ├── entities/            # TypeORM database models
│   │   │   ├── User.ts          # User accounts
│   │   │   ├── Box.ts           # Loot box definitions
│   │   │   ├── SkinTemplate.ts  # Skin metadata templates
│   │   │   ├── UserSkin.ts      # User-owned skins
│   │   │   ├── Transaction.ts   # Financial transactions
│   │   │   ├── Inventory.ts     # Inventory management
│   │   │   ├── SkinListing.ts   # Marketplace listings
│   │   │   ├── CaseOpening.ts   # Loot box opening records
│   │   │   ├── AuditLog.ts      # Security audit trail
│   │   │   └── ...
│   │   ├── routes/              # API route definitions
│   │   │   ├── auth.ts          # Authentication endpoints
│   │   │   ├── boxes.ts         # Loot box operations
│   │   │   ├── inventory.ts     # Inventory management
│   │   │   ├── marketplace.ts   # Marketplace trading
│   │   │   ├── buyback.ts       # Skin buyback system
│   │   │   ├── leaderboard.ts   # Leaderboards
│   │   │   ├── admin.ts         # Admin operations
│   │   │   └── ...
│   │   ├── middlewares/         # Express middleware
│   │   │   ├── auth.ts          # JWT authentication
│   │   │   ├── security.ts      # Security headers, CSRF, rate limiting
│   │   │   ├── logger.ts        # Request logging
│   │   │   ├── errorHandler.ts  # Global error handling
│   │   │   ├── validation.ts    # Input sanitization
│   │   │   └── nonceValidation.ts # Replay attack prevention
│   │   ├── database/
│   │   │   ├── config.ts        # TypeORM configuration
│   │   │   └── migrations/      # Database migrations
│   │   ├── utils/               # Utility functions
│   │   ├── __tests__/           # Test files
│   │   ├── index.ts             # Server entry point
│   │   ├── app.ts               # Express app configuration
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── cs2-inventory-to-csv/    # CS:GO inventory export utility
│
├── programs/                    # Solana smart contracts (Anchor)
│   ├── programs/                # Program source code (Rust)
│   ├── tests/                   # Contract tests
│   ├── Anchor.toml              # Anchor configuration
│   └── Cargo.toml               # Rust dependencies
│
├── deployment/                  # Deployment configurations
│   ├── docker-compose.yml       # Docker services (PostgreSQL, Redis)
│   └── init-db.sql              # Database initialization
│
├── docs/
│   └── SECURITY_AUDIT.md        # Security audit documentation
│
├── .github/                     # GitHub workflows
├── package.json                 # Root package.json
├── vercel.json                  # Vercel deployment config
└── .gitignore
```

## Prerequisites

### Required Software

- **Node.js**: >= 18.0.0 (LTS recommended)
- **npm**: >= 9.0.0 or **yarn**: >= 1.22.0
- **PostgreSQL**: >= 14.0
- **Redis**: >= 7.0 (optional, uses in-memory cache if unavailable)
- **Rust**: >= 1.70.0 (for smart contract development)
- **Solana CLI**: >= 1.17.0
- **Anchor CLI**: >= 0.32.1
- **Docker**: >= 20.10 (optional, for containerized database)

### Solana Wallet

- Phantom, Solflare, or any Solana-compatible wallet
- Funded with SOL for devnet/mainnet transactions

## Installation

### Clone Repository

```bash
git clone https://github.com/Machine-Labz/dust3fun.git
cd dust3fun
```

### Install Dependencies

#### Root Dependencies

```bash
npm install
```

#### Frontend Setup

```bash
cd src/client
npm install
```

#### Backend Setup

```bash
cd src/server
npm install
```

#### Smart Contracts Setup

```bash
cd programs
yarn install
```

### Database Setup

#### Option 1: Docker Compose (Recommended)

```bash
cd deployment
docker-compose up -d
```

This starts PostgreSQL on port 5433 and Redis on port 6379.

#### Option 2: Manual Setup

1. Install PostgreSQL 14
2. Create database:

```sql
CREATE DATABASE loot;
CREATE USER postgres WITH PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE loot TO postgres;
```

3. Install Redis (optional):

```bash
# macOS
brew install redis
redis-server

# Ubuntu
sudo apt-get install redis-server
sudo systemctl start redis
```

## Configuration

### Backend Environment Variables

Create `src/server/.env` file:

```env
# Server Configuration
NODE_ENV=development
PORT=4000
API_PREFIX=/api/v1

# Database
DB_HOST=localhost
DB_PORT=5433
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=loot
DB_SYNCHRONIZE=false
DB_LOGGING=false

# Redis (optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_REFRESH_EXPIRES_IN=30d

# Security
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
SESSION_SECRET=your-session-secret-key
CSRF_SECRET=your-csrf-secret-key

# Solana
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_ADMIN_KEYPAIR_PATH=/path/to/keypair.json

# Irys/Arweave
IRYS_NETWORK=devnet
IRYS_TOKEN=solana
IRYS_WALLET_PATH=/path/to/wallet.json

# Discord (optional notifications)
DISCORD_WEBHOOK_URL=

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=./logs

# Steam API (for skin data)
STEAM_API_KEY=your-steam-api-key
```

### Frontend Environment Variables

Create `src/client/.env.local`:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_API_PREFIX=/api/v1

# Solana Configuration
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com

# Candy Machine (if using Metaplex Candy Machine)
NEXT_PUBLIC_CANDY_MACHINE_ID=

# Analytics
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=

# Feature Flags
NEXT_PUBLIC_ENABLE_MARKETPLACE=true
NEXT_PUBLIC_ENABLE_LOOTBOXES=true
```

### Smart Contract Configuration

Update `programs/Anchor.toml`:

```toml
[toolchain]

[features]
resolution = true
skip-lint = false

[programs.devnet]
programs = "YOUR_PROGRAM_ID"

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "devnet"
wallet = "~/.config/solana/id.json"

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
```

## Development

### Start Development Services

#### Terminal 1: Database (if using Docker)

```bash
cd deployment
docker-compose up
```

#### Terminal 2: Backend Server

```bash
cd src/server
npm run dev
```

Server runs on `http://localhost:4000`

#### Terminal 3: Frontend Application

```bash
cd src/client
npm run dev
```

Application runs on `http://localhost:3000`

### Development Workflow

1. Backend API available at: `http://localhost:4000/api/v1`
2. API documentation (Swagger): `http://localhost:4000/api-docs`
3. Frontend proxies API requests via Next.js rewrites

### Hot Reload

- Frontend: Next.js Fast Refresh enabled
- Backend: tsx watch mode for automatic restarts

## Database

### Schema Management

The application uses TypeORM for database management with a code-first approach.

#### Run Migrations

```bash
cd src/server
npm run migration:run
```

#### Generate Migration

```bash
npm run migration:generate -- src/database/migrations/MigrationName
```

#### Revert Migration

```bash
npm run migration:revert
```

#### Sync Schema (Development Only)

```bash
npm run schema:sync
```

### Database Entities

Key entities include:

- **User**: User accounts and authentication
- **UserSkin**: NFT skin ownership records
- **SkinTemplate**: Skin metadata and rarity definitions
- **Box**: Loot box configurations
- **BoxSkin**: Skin pool for each box
- **CaseOpening**: Loot box opening history
- **SkinListing**: Marketplace listings
- **Transaction**: Financial transaction records
- **Inventory**: Inventory management
- **AuditLog**: Security audit trail
- **RequestNonce**: Replay attack prevention
- **PriceHistory**: Historical pricing data

### Indexing

Critical indexes are defined on:
- User wallet addresses
- Transaction timestamps
- Marketplace listing status
- Audit log event types
- Nonce timestamps for cleanup

## Smart Contracts

### Anchor Program Structure

The Solana program handles:
- NFT minting with Metaplex standards
- Ownership verification
- On-chain randomness (if implemented)

### Build Contracts

```bash
cd programs
anchor build
```

### Deploy Contracts

#### Devnet

```bash
anchor deploy --provider.cluster devnet
```

#### Mainnet

```bash
anchor deploy --provider.cluster mainnet
```

### Test Contracts

```bash
anchor test
```

### Program ID

After deployment, update the program ID in:
- `programs/Anchor.toml`
- Frontend configuration files
- Backend service configuration

## API Documentation

### Swagger/OpenAPI

Interactive API documentation available at:
```
http://localhost:4000/api-docs
```

### API Endpoints Overview

#### Authentication
- `POST /api/v1/auth/login` - Wallet signature authentication
- `POST /api/v1/auth/logout` - User logout
- `POST /api/v1/auth/refresh` - Refresh JWT token

#### Loot Boxes
- `GET /api/v1/boxes` - List available boxes
- `GET /api/v1/boxes/:id` - Get box details
- `POST /api/v1/boxes/:id/open` - Open loot box
- `GET /api/v1/boxes/stats` - Box statistics

#### Inventory
- `GET /api/v1/inventory` - Get user inventory
- `GET /api/v1/inventory/stats` - Inventory statistics
- `POST /api/v1/inventory/withdraw` - Withdraw skin to wallet

#### Marketplace
- `GET /api/v1/marketplace/listings` - Browse listings
- `POST /api/v1/marketplace/list` - Create listing
- `POST /api/v1/marketplace/buy` - Purchase skin
- `DELETE /api/v1/marketplace/listing/:id` - Cancel listing

#### Buyback
- `POST /api/v1/buyback/calculate` - Calculate buyback price
- `POST /api/v1/buyback/sell` - Sell skin for SOL

#### Leaderboard
- `GET /api/v1/leaderboard/top-openers` - Top box openers
- `GET /api/v1/leaderboard/top-traders` - Top traders

#### Admin (Protected)
- `POST /api/v1/admin/boxes` - Create box
- `PUT /api/v1/admin/boxes/:id` - Update box
- `POST /api/v1/admin/skins` - Add skin template
- `GET /api/v1/admin/audit-logs` - View audit logs

### Rate Limits

- General: 100 requests per 15 minutes
- Authentication: 5 requests per 15 minutes
- Box opening: 10 requests per minute
- Marketplace: 30 requests per minute

## Security

### Security Features

1. **Authentication**
   - Cryptographic signature verification (wallet-based)
   - JWT token with refresh mechanism
   - Session management with secure cookies

2. **Request Protection**
   - CSRF token validation on state-changing operations
   - Nonce-based replay attack prevention
   - Request timeout (30 seconds)
   - Input sanitization and validation

3. **Rate Limiting**
   - Global rate limiter
   - Endpoint-specific rate limits
   - IP-based tracking

4. **Headers & CORS**
   - Helmet.js security headers
   - Strict CORS policy (no wildcards in production)
   - Content Security Policy

5. **Audit Logging**
   - Comprehensive audit trail
   - Security event tracking
   - Failed authentication logging
   - Admin action logging

6. **Database Security**
   - Prepared statements (SQL injection prevention)
   - Connection encryption
   - Credential encryption at rest

### Security Audit

Detailed security audit available at: [docs/SECURITY_AUDIT.md](docs/SECURITY_AUDIT.md)

### Best Practices

- Never commit `.env` files
- Rotate JWT secrets regularly
- Use strong, unique secrets in production
- Enable HTTPS in production
- Monitor audit logs for suspicious activity
- Keep dependencies updated
- Run security scans regularly

## Testing

### Backend Tests

#### Run All Tests

```bash
cd src/server
npm test
```

#### Watch Mode

```bash
npm run test:watch
```

#### Coverage Report

```bash
npm run test:coverage
```

#### End-to-End Tests

```bash
npm run test:e2e
```

### Test Database Setup

```bash
# Create test database
npm run test:setup

# Clean test database
npm run test:clean
```

### Frontend Tests

```bash
cd src/client
npm test
```

### Smart Contract Tests

```bash
cd programs
anchor test
```

## Deployment

### Frontend Deployment (Vercel)

The frontend is configured for Vercel deployment:

1. Connect GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

```bash
# Manual deployment
cd src/client
vercel --prod
```

### Backend Deployment

#### Docker Deployment

1. Build Docker image:

```bash
cd src/server
docker build -t dust3-api .
```

2. Run container:

```bash
docker run -d \
  --name dust3-api \
  -p 4000:4000 \
  --env-file .env \
  dust3-api
```

#### Production Environment

1. Set `NODE_ENV=production`
2. Configure production database
3. Set strong JWT secrets
4. Configure production CORS origins
5. Enable HTTPS
6. Set up monitoring and logging
7. Configure backup strategy

### Database Migration in Production

```bash
# Run migrations
npm run migration:run

# Verify
npm run typeorm migration:show
```

### Smart Contract Deployment

```bash
cd programs
anchor build
anchor deploy --provider.cluster mainnet
```

Update program IDs across frontend and backend after deployment.

## Performance Optimization

### Backend
- PostgreSQL connection pooling
- Redis caching layer (optional)
- In-memory Node-Cache fallback
- Response compression (gzip/brotli)
- Database query optimization with indexes

### Frontend
- Next.js static generation where possible
- Image optimization disabled (set `unoptimized: true`)
- Code splitting and lazy loading
- Three.js performance optimization
- Wallet adapter caching

### Blockchain
- Batch RPC requests where possible
- Transaction optimization
- Minimize on-chain data storage
- Use Arweave for large metadata

## Monitoring & Logging

### Application Logs

Winston logger with multiple transports:
- Console output (development)
- File rotation (production)
- Error logs separately tracked

### Log Levels

```
error: 0
warn: 1
info: 2
http: 3
debug: 4
```

### Metrics to Monitor

- API response times
- Database query performance
- Failed authentication attempts
- Rate limit hits
- Box opening statistics
- Transaction success rates
- Blockchain confirmation times

## Troubleshooting

### Common Issues

#### Database Connection Failed

```bash
# Check PostgreSQL is running
docker-compose ps

# Check connection parameters in .env
# Verify DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD
```

#### Frontend API Calls Failing

```bash
# Verify backend is running on port 4000
# Check NEXT_PUBLIC_API_URL in .env.local
# Verify CORS configuration in backend
```

#### Wallet Connection Issues

- Ensure Solana network matches (devnet/mainnet)
- Check RPC URL is accessible
- Verify wallet has sufficient SOL for transactions

#### Migration Errors

```bash
# Revert last migration
npm run migration:revert

# Check migration status
npm run typeorm migration:show
```

## Contributing

### Development Guidelines

1. Follow TypeScript strict mode
2. Use ESLint and Prettier configurations
3. Write tests for new features
4. Update API documentation
5. Follow conventional commits
6. Create feature branches from `master`

### Code Style

- TypeScript for frontend and backend
- Rust for Solana smart contracts
- Functional components in React
- Async/await over promises
- Descriptive variable names
- Comprehensive error handling

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:

- GitHub Issues: [Repository Issues](https://github.com/Machine-Labz/dust3fun/issues)
- Documentation: [Project Wiki](https://github.com/Machine-Labz/dust3fun/wiki)

## Acknowledgments

- Solana Foundation
- Metaplex Foundation
- Anchor Framework
- Next.js Team
- TypeORM Contributors
