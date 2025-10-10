import { Router } from "express";
import { AdminController } from "../controllers/AdminController";
import { InventoryController } from "../controllers/InventoryController";
import { PackController } from "../controllers/PackController";
import { SkinTemplateController } from "../controllers/SkinTemplateController";
import { LootBoxPoolController } from "../controllers/LootBoxPoolController";

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

// Pack management routes
// GET /admin/packs - List all packs (loot boxes)
adminRoutes.get("/packs", PackController.list);

// POST /admin/packs - Create new pack
adminRoutes.post("/packs", PackController.create);

// PUT /admin/packs/:id - Update pack
adminRoutes.put("/packs/:id", PackController.update);

// DELETE /admin/packs/:id - Delete pack
adminRoutes.delete("/packs/:id", PackController.delete);

// Skin Template routes
// GET /admin/skin-templates - List all skin templates
adminRoutes.get("/skin-templates", SkinTemplateController.list);

// POST /admin/skin-templates - Create new skin template
adminRoutes.post("/skin-templates", SkinTemplateController.create);

// PUT /admin/skin-templates/:id - Update skin template
adminRoutes.put("/skin-templates/:id", SkinTemplateController.update);

// DELETE /admin/skin-templates/:id - Delete skin template
adminRoutes.delete("/skin-templates/:id", SkinTemplateController.delete);

// Loot Box Pool routes
// GET /admin/loot-box-pools - List all pool entries
adminRoutes.get("/loot-box-pools", LootBoxPoolController.list);

// POST /admin/loot-box-pools - Create new pool entry
adminRoutes.post("/loot-box-pools", LootBoxPoolController.create);

// DELETE /admin/loot-box-pools/:id - Delete pool entry
adminRoutes.delete("/loot-box-pools/:id", LootBoxPoolController.delete);
