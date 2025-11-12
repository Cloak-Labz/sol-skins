import { Router } from "express";
import { BoxSkinController } from "../controllers/BoxSkinController";
import { adminMiddleware } from "../middlewares/admin";
import { getAuth } from "../middlewares/auth";
import { adminLimiter, publicEndpointsLimiter } from "../middlewares/security";

export const boxSkinRoutes = Router();
const boxSkinController = new BoxSkinController();

// Public read endpoints
// SECURITY: Rate limited to prevent API abuse (100 req/min per IP)
boxSkinRoutes.get("/box/:boxId", publicEndpointsLimiter, boxSkinController.getBoxSkinsByBoxId);
boxSkinRoutes.get("/:id", publicEndpointsLimiter, boxSkinController.getBoxSkinById);
boxSkinRoutes.get("/box/:boxId/distribution", publicEndpointsLimiter, boxSkinController.getRarityDistribution);
boxSkinRoutes.get("/box/:boxId/random", publicEndpointsLimiter, boxSkinController.getRandomSkin);
boxSkinRoutes.get("/templates", publicEndpointsLimiter, boxSkinController.getAvailableSkinTemplates);
boxSkinRoutes.get("/box/:boxId/with-templates", publicEndpointsLimiter, boxSkinController.getBoxSkinsWithTemplates);

// Admin-only write endpoints - require authentication and admin access
// Use lazy loading to avoid initialization order issues
const adminBoxSkinRoutes = Router();
adminBoxSkinRoutes.use((req, res, next) => {
  const authMiddleware = getAuth();
  authMiddleware.protect(req, res, next);
});

// SECURITY: Apply strict rate limiting to admin endpoints (5 req/min)
adminBoxSkinRoutes.use(adminLimiter);

adminBoxSkinRoutes.use(adminMiddleware);

// Admin-only write endpoints
adminBoxSkinRoutes.post("/", boxSkinController.createBoxSkin);
adminBoxSkinRoutes.post("/batch", boxSkinController.createBoxSkinsBatch);

// Admin-only write endpoints (continued)
adminBoxSkinRoutes.put("/:id", boxSkinController.updateBoxSkin);
adminBoxSkinRoutes.delete("/:id", boxSkinController.deleteBoxSkin);
adminBoxSkinRoutes.delete("/box/:boxId", boxSkinController.deleteBoxSkinsByBoxId);
adminBoxSkinRoutes.post("/from-template", boxSkinController.createBoxSkinFromTemplate);

// Mount admin routes
boxSkinRoutes.use(adminBoxSkinRoutes);
