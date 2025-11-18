# SolSkins Backend

Complete backend platform for SolSkins implemented with Express.js + TypeScript + TypeORM + PostgreSQL.

## Installation

### 1. Install Dependencies

```bash
cd src/server
npm install
```

### 2. Configure Database

```bash
# Start PostgreSQL and Redis via Docker
cd ../../deployment
docker-compose up -d
```

### 3. Configure Environment Variables

```bash
# Copy example file
cp .env.example .env

# Edit variables as needed
nano .env
```

### 4. Run Migrations

```bash
# Sync database schema (development)
npm run schema:sync

# Or run migrations (production)
npm run migration:run
```

### 5. Start Server

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## Project Structure

```
src/server/
├── config/          # Configurations (DB, Swagger, Env)
├── controllers/     # API Controllers
├── entities/        # TypeORM Entities
├── middlewares/     # Middlewares (Auth, Security, Validation)
├── repositories/    # Data Access Layer
├── routes/          # Route Definitions
├── services/        # Business Logic
├── utils/           # Utilities
├── app.ts           # Express Configuration
├── index.ts         # Entry Point
└── package.json     # Dependencies
```

## Available Scripts

```bash
npm run dev           # Development with hot reload
npm run build         # Build for production
npm start             # Run built version
npm run typeorm       # TypeORM CLI
npm run migration:generate  # Generate migration
npm run migration:run       # Run migrations
npm run schema:sync         # Sync schema (dev only)
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/connect` - Connect wallet
- `POST /api/v1/auth/disconnect` - Disconnect

### Marketplace
- `GET /api/v1/marketplace/loot-boxes` - List loot boxes
- `GET /api/v1/marketplace/loot-boxes/:id` - Loot box details

### Cases
- `POST /api/v1/cases/open` - Open case
- `GET /api/v1/cases/opening/:id/status` - Opening status
- `POST /api/v1/cases/opening/:id/decision` - Post-opening decision

### Inventory
- `GET /api/v1/inventory` - List inventory
- `POST /api/v1/inventory/:skinId/buyback` - Skin buyback

### History
- `GET /api/v1/history/transactions` - Transaction history

### Social
- `GET /api/v1/leaderboard` - User rankings
- `GET /api/v1/activity/recent` - Recent activity

### Admin
- `GET /api/v1/admin/stats/overview` - Platform statistics

## Documentation

- **Swagger UI**: http://localhost:4000/api-docs
- **API Testing Guide**: `docs/api-testing-guide.md`
- **Backend Knowledge Base**: `docs/backend-knowledge-base.md`

## Technologies Used

- **Express.js** - Web framework
- **TypeScript** - Static typing
- **TypeORM** - ORM for PostgreSQL
- **PostgreSQL** - Database
- **Redis** - Cache and sessions
- **JWT** - Authentication
- **Joi** - Data validation
- **Winston** - Logging
- **Helmet** - Security
- **Swagger** - API documentation

## Solana Integration

The backend integrates with:
- **Anchor Program** - Smart contracts (buyback program)
- **Solana Web3.js** - Blockchain interaction
- **NFT Minting** - Creating skins as NFTs

## Monitoring and Logs

- Logs in `logs/` (error.log, combined.log)
- Correlation ID for request tracking
- Health check at `/health`
- Performance metrics via Winston

## Security

- Rate limiting by IP and wallet
- Input validation and sanitization
- CORS configured
- Security headers
- Wallet signature authentication
- Protection against common attacks
