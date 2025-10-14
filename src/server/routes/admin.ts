import { Router } from "express";
import { AdminController } from "../controllers/AdminController";
import { InventoryController } from "../controllers/InventoryController";

export const adminRoutes = Router();
const adminController = new AdminController();

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
