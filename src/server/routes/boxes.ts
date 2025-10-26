import { Router } from "express";
import { BoxController } from "../controllers/BoxController";

export const boxRoutes = Router();
const boxController = new BoxController();

// GET /boxes - List all boxes
boxRoutes.get("/", boxController.getAllBoxes);

// GET /boxes/active - List active boxes
boxRoutes.get("/active", boxController.getActiveBoxes);

// GET /boxes/stats - Get box statistics
boxRoutes.get("/stats", boxController.getBoxStats);

// GET /boxes/:id - Get box by ID
boxRoutes.get("/:id", boxController.getBoxById);

// GET /boxes/batch/:batchId - Get box by batch ID
boxRoutes.get("/batch/:batchId", boxController.getBoxByBatchId);

// POST /boxes - Create new box
boxRoutes.post("/", boxController.createBox);

// PUT /boxes/:id - Update box
boxRoutes.put("/:id", boxController.updateBox);

// POST /boxes/:batchId/sync - Sync box with on-chain state
boxRoutes.post("/:batchId/sync", boxController.syncBox);

// POST /boxes/sync-all - Sync all boxes with on-chain state
boxRoutes.post("/sync-all", boxController.syncAllBoxes);

// DELETE /boxes/:id - Delete box
boxRoutes.delete("/:id", boxController.deleteBox);
