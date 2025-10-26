import { Router } from "express";
import { authRoutes } from "./auth";
import { marketplaceRoutes } from "./marketplace";
import { skinMarketplaceRoutes } from "./skinMarketplace";
import { casesRoutes } from "./cases";
import { inventoryRoutes } from "./inventory";
import { historyRoutes } from "./history";
import { leaderboardRoutes } from "./leaderboard";
import { activityRoutes } from "./activity";
import { adminRoutes } from "./admin";
import { boxRoutes } from "./boxes";
import irysRoutes from "./irys";
import metadataRoutes from "./metadata";
import discordRoutes from "./discord";
import pendingSkinsRoutes from "./pending-skins";

export async function createRoutes(): Promise<Router> {
  const router = Router();

  // Mount route modules
  router.use("/auth", authRoutes);
  router.use("/marketplace", marketplaceRoutes); // Loot boxes
  router.use("/skin-marketplace", skinMarketplaceRoutes); // P2P skin trading
  router.use("/cases", casesRoutes);
  router.use("/inventory", inventoryRoutes);
  router.use("/history", historyRoutes);
  router.use("/leaderboard", leaderboardRoutes);
  router.use("/activity", activityRoutes);
  router.use("/admin", adminRoutes);
  router.use("/boxes", boxRoutes);
  router.use("/irys", irysRoutes);
  router.use("/metadata", metadataRoutes);
  router.use("/discord", discordRoutes);
  router.use("/pending-skins", pendingSkinsRoutes);

  return router;
}
