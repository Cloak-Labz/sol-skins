import { DataSource } from "typeorm";
import { config } from "./env";
import { User } from "../entities/User";
import { LootBoxType } from "../entities/LootBoxType";
import { SkinTemplate } from "../entities/SkinTemplate";
import { LootBoxSkinPool } from "../entities/LootBoxSkinPool";
import { UserSkin } from "../entities/UserSkin";
import { Transaction } from "../entities/Transaction";
import { CaseOpening } from "../entities/CaseOpening";
import { PriceHistory } from "../entities/PriceHistory";
import { UserSession } from "../entities/UserSession";
import { SkinListing } from "../entities/SkinListing";
import { SteamInventory } from "../entities/SteamInventory";
import { Inventory } from "../entities/Inventory";
import { Box } from "../entities/Box";
import { BoxSkin } from "../entities/BoxSkin";
import { Metadata } from "../entities/Metadata";
import { PendingSkin } from "../entities/PendingSkin";
import { BuybackRecord } from "../entities/BuybackRecord";
import { AuditLog } from "../entities/AuditLog";
import { RequestNonce } from "../entities/RequestNonce";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: config.database.host,
  port: config.database.port,
  username: config.database.username,
  password: config.database.password,
  database: config.database.database,
  synchronize: false,
  logging: config.database.logging,
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
  migrations: ["src/server/database/migrations/*{.ts,.js}"],
  // subscribers: ["src/server/database/subscribers/*{.ts,.js}"],
  // SECURITY: Database query timeout protection
  extra: {
    // Connection timeout (how long to wait for initial connection)
    connectionTimeoutMillis: 10000, // 10 seconds
    // Statement timeout (how long a query can run before being cancelled)
    statement_timeout: 5000, // 5 seconds (PostgreSQL specific)
    // Query timeout (TypeORM specific, applies to all queries)
    query_timeout: 5000, // 5 seconds
    // Connection pool settings
    max: 20, // Maximum number of connections in pool
    idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  },
});

export const initializeDatabase = async (): Promise<void> => {
  try {
    await AppDataSource.initialize();
    console.log("✅ Database connection established successfully");
  } catch (error) {
    console.error("❌ Error during database initialization:", error);
    throw error;
  }
};
