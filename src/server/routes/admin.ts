import { Router } from "express";
import { AdminController } from "../controllers/AdminController";
import { InventoryController } from "../controllers/InventoryController";
import { AuditController } from "../controllers/AuditController";
import { adminMiddleware } from "../middlewares/admin";
import { getAuth } from "../middlewares/auth";
import { adminLimiter } from "../middlewares/security";

export const adminRoutes = Router();
const adminController = new AdminController();
const auditController = new AuditController();

// Apply authentication and admin middleware to all admin routes
// Use lazy loading to avoid initialization order issues
adminRoutes.use((req, res, next) => {
  const authMiddleware = getAuth();
  authMiddleware.protect(req, res, next);
});

// SECURITY: Apply strict rate limiting to admin endpoints (5 req/min)
adminRoutes.use(adminLimiter);

adminRoutes.use(adminMiddleware);

// GET /admin/stats/overview
adminRoutes.get("/stats/overview", adminController.getOverviewStats);

// GET /admin/users
adminRoutes.get("/users", adminController.getUsersStats);

// GET /admin/stats/transactions
adminRoutes.get("/stats/transactions", adminController.getTransactionStats);

// GET /admin/stats/case-openings
adminRoutes.get("/stats/case-openings", adminController.getCaseOpeningStats);

// Inventory admin routes (JSON store for minted NFTs)
// GET /admin/inventory - List all minted NFTs
adminRoutes.get("/inventory", InventoryController.list);

// POST /admin/inventory - Add new minted NFT
adminRoutes.post("/inventory", InventoryController.add);

// PUT /admin/inventory/:id/mint - Update mint info for existing item
adminRoutes.put("/inventory/:id/mint", InventoryController.updateMint);

// GET /admin/packs - List all packs (loot boxes)
adminRoutes.get("/packs", adminController.getPacks);

// POST /admin/packs - Create new pack
adminRoutes.post("/packs", adminController.createPack);

// Audit log routes
// GET /admin/audit-logs - Get audit logs with filters
adminRoutes.get("/audit-logs", auditController.getAuditLogs);

// GET /admin/audit-stats - Get audit log statistics
adminRoutes.get("/audit-stats", auditController.getAuditStats);
