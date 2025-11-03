import { DataSource } from "typeorm";
import "dotenv/config";
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
import { BuybackRecord } from "../entities/BuybackRecord";

// DataSource for TypeORM CLI (migrations)
const dbHost = process.env.DB_HOST || "localhost";
const dbPort = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432;
const dbUser = process.env.DB_USERNAME || "postgres";
const dbPass = process.env.DB_PASSWORD || "postgres";
const dbName = process.env.DB_DATABASE || "postgres";
const dbLogging = String(process.env.DB_LOGGING || "false").toLowerCase() === "true";

export default new DataSource({
  type: "postgres",
  host: dbHost,
  port: dbPort,
  username: dbUser,
  password: dbPass,
  database: dbName,
  synchronize: false,
  logging: dbLogging,
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
    BuybackRecord,
  ],
  // Paths are relative to process.cwd() (the server package root when running npm scripts)
  migrations: [__dirname + "/migrations/*{.ts,.js}"],
  subscribers: [__dirname + "/subscribers/*{.ts,.js}"],
});


