// E2E Test Setup
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from '../config/env';
import { User } from '../entities/User';
import { LootBoxType } from '../entities/LootBoxType';
import { SkinTemplate } from '../entities/SkinTemplate';
import { LootBoxSkinPool } from '../entities/LootBoxSkinPool';
import { UserSkin } from '../entities/UserSkin';
import { Transaction } from '../entities/Transaction';
import { CaseOpening } from '../entities/CaseOpening';
import { PriceHistory } from '../entities/PriceHistory';
import { UserSession } from '../entities/UserSession';
import { SkinListing } from '../entities/SkinListing';
import { SteamInventory } from '../entities/SteamInventory';
import { Inventory } from '../entities/Inventory';
import { Box } from '../entities/Box';
import { BoxSkin } from '../entities/BoxSkin';
import { Metadata } from '../entities/Metadata';
import { PendingSkin } from '../entities/PendingSkin';
import { BuybackRecord } from '../entities/BuybackRecord';
import { AuditLog } from '../entities/AuditLog';
import { RequestNonce } from '../entities/RequestNonce';

// Test database configuration
// Default to Docker port (5433) if not specified, as Docker maps container 5432 to host 5433
const TEST_DB_NAME = process.env.TEST_DB_NAME || 'sol_skins_test';
const TEST_DB_HOST = process.env.TEST_DB_HOST || config.database.host;
const TEST_DB_PORT = parseInt(process.env.TEST_DB_PORT || String(config.database.port === 5432 ? 5433 : config.database.port));
const TEST_DB_USER = process.env.TEST_DB_USER || config.database.username;
const TEST_DB_PASS = process.env.TEST_DB_PASS || config.database.password;

let testDataSource: DataSource;

// Initialize test database connection
export async function setupTestDatabase(): Promise<DataSource> {
  // Always recreate the connection to ensure clean state
  if (testDataSource?.isInitialized) {
    await testDataSource.destroy();
  }

  // Skip manual cleanup if database is already initialized (global setup)
  // The clean-test-db.sh script already handles this

  testDataSource = new DataSource({
    type: 'postgres',
    host: TEST_DB_HOST,
    port: TEST_DB_PORT,
    username: TEST_DB_USER,
    password: TEST_DB_PASS,
    database: TEST_DB_NAME,
    synchronize: false, // Disable synchronize to avoid index conflicts
    logging: false, // Disable logging in tests
    migrationsRun: false, // We'll create tables manually
    entities: [
      User,
      LootBoxType,
      SkinTemplate,
      LootBoxSkinPool,
      UserSkin,
      Transaction,
      CaseOpening,
      PriceHistory,
      UserSession,
      SkinListing,
      SteamInventory,
      Inventory,
      Box,
      BoxSkin,
      Metadata,
      PendingSkin,
      BuybackRecord,
      AuditLog,
      RequestNonce,
    ],
  });

  // Initialize connection
  await testDataSource.initialize();
  
  // Create schema with workaround for TypeORM index bug
  // Patch the query method to catch and handle index creation errors
  const originalQuery = testDataSource.query.bind(testDataSource);
  let queryPatched = false;
  
  const patchedQuery = async function(query: string, parameters?: any[]) {
    try {
      return await originalQuery(query, parameters);
    } catch (error: any) {
      // If it's an index already exists error, drop the index and retry
      if (error.message && error.message.includes('already exists') && error.message.includes('IDX_')) {
        const indexMatch = error.message.match(/relation "([^"]+)" already exists/);
        if (indexMatch) {
          const indexName = indexMatch[1];
          try {
            // Drop the index and retry the query
            await originalQuery(`DROP INDEX IF EXISTS "${indexName}" CASCADE;`);
            return await originalQuery(query, parameters);
          } catch (retryError) {
            // If retry fails, throw original error
            throw error;
          }
        }
      }
      throw error;
    }
  };
  
  // Temporarily patch the query method
  (testDataSource as any).query = patchedQuery;
  queryPatched = true;
  
  try {
    // Create schema
    await testDataSource.synchronize();
  } catch (error: any) {
    // If synchronize fails, try one more time after a delay
    if (error.message && error.message.includes('already exists') && error.message.includes('IDX_')) {
      await new Promise(resolve => setTimeout(resolve, 500));
      await testDataSource.synchronize();
    } else {
      throw error;
    }
  } finally {
    // Restore original query method
    if (queryPatched) {
      (testDataSource as any).query = originalQuery;
    }
  }
  
  return testDataSource;
}

// Clean up test database
export async function teardownTestDatabase(): Promise<void> {
  if (testDataSource?.isInitialized) {
    await testDataSource.destroy();
  }
}

// Run migrations on test database (not needed if using synchronize)
export async function runMigrations(): Promise<void> {
  if (!testDataSource?.isInitialized) {
    await setupTestDatabase();
  }
  
  // With synchronize: true, migrations are not needed
  // But we can still run them if needed in the future
  // await testDataSource.runMigrations();
}

// Revert all migrations
export async function revertMigrations(): Promise<void> {
  if (!testDataSource?.isInitialized) {
    return;
  }
  
  // Revert migrations in reverse order
  const migrations = await testDataSource.migrations;
  for (let i = migrations.length - 1; i >= 0; i--) {
    await testDataSource.undoLastMigration();
  }
}

// Clean all tables (useful for E2E tests)
export async function cleanDatabase(): Promise<void> {
  if (!testDataSource?.isInitialized) {
    await setupTestDatabase();
  }

  // Get all entity metadata
  const entityMetadatas = testDataSource.entityMetadatas;

  // Disable foreign key checks temporarily
  await testDataSource.query('SET session_replication_role = replica;');

  // Truncate all tables
  for (const metadata of entityMetadatas) {
    const tableName = metadata.tableName;
    await testDataSource.query(`TRUNCATE TABLE "${tableName}" CASCADE;`);
  }

  // Re-enable foreign key checks
  await testDataSource.query('SET session_replication_role = DEFAULT;');
}

// Global setup - only run once for all test suites
let globalSetupDone = false;

// Setup AppDataSource to use test database before any imports
export async function setupAppDataSourceForTests() {
  if (globalSetupDone) return;
  
  await setupTestDatabase();
  
  // Replace AppDataSource with testDataSource for tests
  // This ensures all services use the test database
  const { AppDataSource } = await import('../config/database');
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
  
  // Replace AppDataSource's methods to use testDataSource
  // This ensures all services that use AppDataSource will use the test database
  (AppDataSource as any).getRepository = function(entity: any) {
    return testDataSource.getRepository(entity);
  };
  
  (AppDataSource as any).manager = testDataSource.manager;
  
  // Mark as initialized so services can use it
  Object.defineProperty(AppDataSource, 'isInitialized', {
    get: () => true,
    configurable: true,
    enumerable: true,
  });
  
  // Also ensure entityMetadatas are available
  Object.defineProperty(AppDataSource, 'entityMetadatas', {
    get: () => testDataSource.entityMetadatas,
    configurable: true,
    enumerable: true,
  });
  
  globalSetupDone = true;
}

beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
  process.env.ALLOWED_ORIGINS = 'http://localhost:3000';
  
  // Disable Discord bot during tests
  process.env.DISCORD_BOT_TOKEN = '';
  process.env.DISCORD_CHANNEL_ID = '';
  
  // Setup AppDataSource before any services are created
  await setupAppDataSourceForTests();
}, 60000); // 60 second timeout for database setup

afterAll(async () => {
  // Clean up database connection
  await teardownTestDatabase();
  
  // Give time for any pending operations to complete
  await new Promise(resolve => setTimeout(resolve, 1000));
}, 30000);

// Clean database before each test suite
beforeEach(async () => {
  await cleanDatabase();
});

// Export testDataSource for use in tests
export { testDataSource };

