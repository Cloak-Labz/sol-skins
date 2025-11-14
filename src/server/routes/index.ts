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
import { boxSkinRoutes } from "./boxSkins";
import { buybackRoutes } from "./buyback";
import { claimRoutes } from "./claim";
import { revealRoutes } from "./reveal";
import irysRoutes from "./irys";
import metadataRoutes from "./metadata";
import discordRoutes from "./discord";
import pendingSkinsRoutes from "./pending-skins";
import { packOpeningRoutes } from "./pack-opening";
import { imageProxyRoutes } from "./image-proxy";
import { initializeAuth } from "../middlewares/auth";
import { UserService } from "../services/UserService";
import { generateCSRFToken } from "../middlewares/security";

export async function createRoutes(): Promise<Router> {
  // Initialize auth middleware before creating routes
  const userService = new UserService();
  initializeAuth(userService);
  
  const router = Router();

  // CSRF token endpoint (must be before other routes)
  router.get("/csrf-token", generateCSRFToken);

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
  router.use("/box-skins", boxSkinRoutes);
  router.use("/buyback", buybackRoutes);
  router.use("/claim", claimRoutes);
  router.use("/reveal", revealRoutes);
  router.use("/irys", irysRoutes);
  router.use("/metadata", metadataRoutes);
  router.use("/discord", discordRoutes);
  router.use("/pending-skins", pendingSkinsRoutes);
  router.use("/pack-opening", packOpeningRoutes);
  router.use("/image-proxy", imageProxyRoutes);

  return router;
}
