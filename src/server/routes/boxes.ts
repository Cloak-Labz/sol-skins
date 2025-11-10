import { Router } from "express";
import { BoxController } from "../controllers/BoxController";
import { adminMiddleware } from "../middlewares/admin";
import { getAuth } from "../middlewares/auth";
import { adminLimiter, publicEndpointsLimiter } from "../middlewares/security";

export const boxRoutes = Router();
const boxController = new BoxController();

// Public read endpoints
// SECURITY: Rate limited to prevent API abuse (100 req/min per IP)
boxRoutes.get("/", publicEndpointsLimiter, boxController.getAllBoxes);
boxRoutes.get("/active", publicEndpointsLimiter, boxController.getActiveBoxes);
boxRoutes.get("/stats", publicEndpointsLimiter, boxController.getBoxStats);
boxRoutes.get("/:id", publicEndpointsLimiter, boxController.getBoxById);
boxRoutes.get("/:id/collection-files", publicEndpointsLimiter, boxController.getCollectionFiles);
boxRoutes.get("/batch/:batchId", publicEndpointsLimiter, boxController.getBoxByBatchId);

// Admin-only write endpoints - require authentication and admin access
// Use lazy loading to avoid initialization order issues
const adminBoxRoutes = Router();
adminBoxRoutes.use((req, res, next) => {
  const authMiddleware = getAuth();
  authMiddleware.protect(req, res, next);
});

// SECURITY: Apply strict rate limiting to admin endpoints (5 req/min)
adminBoxRoutes.use(adminLimiter);

adminBoxRoutes.use(adminMiddleware);

// Admin-only write endpoints
adminBoxRoutes.post("/generate-collection-files", boxController.generateCollectionFiles);
adminBoxRoutes.post("/", boxController.createBox);
adminBoxRoutes.put("/:id", boxController.updateBox);
adminBoxRoutes.delete("/:id", boxController.deleteBox);

// Mount admin routes
boxRoutes.use(adminBoxRoutes);
