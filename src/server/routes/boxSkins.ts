import { Router } from "express";
import { BoxSkinController } from "../controllers/BoxSkinController";

export const boxSkinRoutes = Router();
const boxSkinController = new BoxSkinController();

// POST /box-skins - Create new box skin
boxSkinRoutes.post("/", boxSkinController.createBoxSkin);

// GET /box-skins/box/:boxId - Get all skins for a box
boxSkinRoutes.get("/box/:boxId", boxSkinController.getBoxSkinsByBoxId);

// GET /box-skins/:id - Get box skin by ID
boxSkinRoutes.get("/:id", boxSkinController.getBoxSkinById);

// PUT /box-skins/:id - Update box skin
boxSkinRoutes.put("/:id", boxSkinController.updateBoxSkin);

// DELETE /box-skins/:id - Delete box skin
boxSkinRoutes.delete("/:id", boxSkinController.deleteBoxSkin);

// DELETE /box-skins/box/:boxId - Delete all skins for a box
boxSkinRoutes.delete("/box/:boxId", boxSkinController.deleteBoxSkinsByBoxId);

// GET /box-skins/box/:boxId/distribution - Get rarity distribution
boxSkinRoutes.get("/box/:boxId/distribution", boxSkinController.getRarityDistribution);

// GET /box-skins/box/:boxId/random - Get random skin (weighted)
boxSkinRoutes.get("/box/:boxId/random", boxSkinController.getRandomSkin);

// POST /box-skins/from-template - Create box skin from skin template
boxSkinRoutes.post("/from-template", boxSkinController.createBoxSkinFromTemplate);

// GET /box-skins/templates - Get available skin templates
boxSkinRoutes.get("/templates", boxSkinController.getAvailableSkinTemplates);

// GET /box-skins/box/:boxId/with-templates - Get box skins with template info
boxSkinRoutes.get("/box/:boxId/with-templates", boxSkinController.getBoxSkinsWithTemplates);
