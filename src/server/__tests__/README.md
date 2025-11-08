# Test Suite Documentation

This directory contains end-to-end (E2E) tests for the SolSkins backend.

## Structure

```
__tests__/
├── setup.ts              # Global setup for unit tests
├── e2e-setup.ts          # Specific setup for E2E tests
├── helpers/
│   ├── test-helpers.ts   # Helper functions for tests
│   └── mockBlockchainService.ts  # Mock blockchain service for testing
└── e2e/
    ├── auth.e2e.test.ts           # Authentication tests
    ├── pack-opening.e2e.test.ts    # Pack opening tests
    ├── buyback.e2e.test.ts         # Buyback tests
    └── inventory.e2e.test.ts        # Inventory tests
```

## Configuration

### Environment Variables

Create a `.env.test` file or configure the following variables:

```bash
# Test database (using Docker - port 5433)
TEST_DB_NAME=sol_skins_test
TEST_DB_HOST=localhost
TEST_DB_PORT=5433  # Docker maps container 5432 to host 5433
TEST_DB_USER=postgres
TEST_DB_PASS=postgres

# JWT Secret for tests
JWT_SECRET=test-jwt-secret-key-for-testing-only

# CORS
ALLOWED_ORIGINS=http://localhost:3000
```

### Test Database

Make sure the test database exists. If you're using Docker (recommended):

```bash
# Make sure PostgreSQL container is running
cd deployment
docker-compose up -d postgres

# Create test database (using Docker)
cd ../src/server
npm run test:setup
```

Or manually via Docker:

```bash
# Create test database via Docker
docker exec -i d3-postgres psql -U postgres -c "CREATE DATABASE sol_skins_test;"
```

**Note:** Docker maps container port 5432 to host port 5433. The test setup detects this automatically.

## Running Tests

### All tests
```bash
npm test
```

### E2E tests only
```bash
npm run test:e2e
```

### With coverage
```bash
npm run test:coverage
```

### Watch mode
```bash
npm run test:watch
```

## Tested Flows

### 1. Authentication (`auth.e2e.test.ts`)
- ✅ Connect wallet and create user
- ✅ Reject invalid signature
- ✅ Return existing user if already connected
- ✅ Get user profile
- ✅ Reject requests without wallet address

### 2. Pack Opening (`pack-opening.e2e.test.ts`)
- ✅ Create pack opening transaction
- ✅ Reject opening without trade URL
- ✅ Reject duplicate nonce (replay attack)
- ✅ List user case openings

### 3. Buyback (`buyback.e2e.test.ts`)
- ✅ Calculate buyback amount
- ✅ Create buyback request
- ✅ Confirm buyback transaction
- ✅ Reject requests without nonce

### 4. Inventory (`inventory.e2e.test.ts`)
- ✅ Get empty inventory
- ✅ Get inventory with user skins
- ✅ Filter inventory by rarity
- ✅ Calculate total inventory value

## Available Helpers

### `generateTestKeypair()`
Generates a Solana keypair for testing.

### `signMessage(message, keypair)`
Signs a message with a keypair.

### `generateNonce()`
Generates a unique nonce for requests.

### `getCSRFToken(app)`
Gets a CSRF token from the API.

### `createTestUser(walletAddress, options)`
Creates a test user in the database.

### `createTestBox(options)`
Creates a test box.

### `createTestBoxSkin(boxId, options)`
Creates a test box skin.

### `createTestSkinTemplate(options)`
Creates a test skin template.

## Important Notes

1. **Isolation**: Each test suite cleans the database before running (`beforeEach`).

2. **Migrations**: Migrations are automatically executed in the E2E setup `beforeAll`.

3. **Timeouts**: E2E tests have a 60-second timeout due to database operations.

4. **Sequential Execution**: E2E tests run sequentially (`maxWorkers: 1`) to avoid database conflicts.

5. **Mocks**: For more complex tests (like Solana transactions), you may need to create mocks for RPC calls. The `MockBlockchainService` is automatically injected in test environment.

## Architecture: Dependency Injection for Testing

The test suite uses dependency injection to avoid polluting production code with test logic:

- **BuybackService** accepts an optional `IBlockchainService` interface
- **MockBlockchainService** implements blockchain operations using the database instead of real Solana calls
- The factory in `routes/buyback.ts` automatically injects the mock in test environment
- Production code remains clean without `if (process.env.NODE_ENV === 'test')` checks

## Adding New Tests

1. Create a new file in `__tests__/e2e/` with suffix `.e2e.test.ts`
2. Import necessary dependencies
3. Use available helpers from `test-helpers.ts`
4. Follow the pattern of existing tests

Example:

```typescript
import request from 'supertest';
import { Express } from 'express';
import { generateTestKeypair, getCSRFToken } from '../helpers/test-helpers';
import { setupAppDataSourceForTests } from '../e2e-setup';

describe('My Feature E2E Tests', () => {
  let app: Express;
  let testKeypair;
  
  beforeAll(async () => {
    // Ensure AppDataSource is set up before creating app
    await setupAppDataSourceForTests();
    
    // Import createApp after AppDataSource is configured
    const { createApp } = await import('../../app');
    app = await createApp();
    testKeypair = generateTestKeypair();
  });
  
  it('should test my feature', async () => {
    // Your test here
  });
});
```

## Troubleshooting

### Error: "Database does not exist"
Make sure the test database was created.

### Error: "Connection refused"
Check if PostgreSQL is running and credentials are correct.

### Error: "Migration failed"
Run migrations manually on the test database:
```bash
npm run migration:run
```

### Tests are too slow
- Check if the database is optimized
- Consider using `synchronize: true` only for tests (not recommended for production)

### Error: "EntityMetadataNotFoundError"
Make sure `setupAppDataSourceForTests()` is called before `createApp()` in your test's `beforeAll`.
