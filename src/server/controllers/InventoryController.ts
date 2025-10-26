import { Request, Response } from "express";
import { InventoryRepository } from "../repositories/InventoryRepository";

export type InventoryItem = {
  id: string;
  name: string;
  description?: string;
  imageUrl: string;
  metadataUri?: string;
  rarity?: string;
  attributes?: Record<string, any>;
  createdAt: number;
  mintedAsset?: string;
  mintedAt?: number;
  mintTx?: string;
};

const repo = new InventoryRepository();

export class InventoryController {
  static async list(_req: Request, res: Response) {
    try {
      console.log("🔍 Attempting to fetch inventory items...");
      const items = await repo.findAll();
      console.log("✅ Successfully fetched inventory items:", items.length);
      res.json({ success: true, data: items });
    } catch (e: any) {
      console.error("❌ Error fetching inventory:", e);
      console.error("❌ Error stack:", e.stack);
      res.status(500).json({ success: false, error: e?.message || "Failed to fetch inventory" });
    }
  }

  static async add(req: Request, res: Response): Promise<Response> {
    const {
      name,
      description,
      imageUrl,
      rarity,
      attributes,
      metadataUri,
      mintedAsset,
      mintTx,
    } = req.body || {};
    if (!name) {
      return res
        .status(400)
        .json({ success: false, error: "name is required" });
    }
    try {
      const created = await repo.create({
        name,
        description,
        imageUrl,
        rarity: rarity || "Common",
        attributes,
        metadataUri,
        mintedAsset,
        mintTx,
        mintedAt: mintedAsset ? new Date() : undefined,
      } as any);
      return res.json({ success: true, data: created });
    } catch (e: any) {
      return res
        .status(500)
        .json({ success: false, error: e?.message || "Failed" });
    }
  }

  static async updateMint(req: Request, res: Response): Promise<Response> {
    const { id } = req.params;
    const { metadataUri, mintedAsset, mintTx } = req.body || {};

    if (!id) {
      return res.status(400).json({ success: false, error: "id is required" });
    }

    if (!metadataUri || !mintedAsset || !mintTx) {
      return res.status(400).json({
        success: false,
        error: "metadataUri, mintedAsset and mintTx are required",
      });
    }

    try {
      const updated = await repo.update(id, {
        metadataUri,
        mintedAsset,
        mintTx,
        mintedAt: new Date(),
      } as any);
      if (!updated) {
        return res
          .status(404)
          .json({ success: false, error: "Item not found" });
      }
      return res.json({ success: true, data: updated });
    } catch (e: any) {
      return res
        .status(500)
        .json({ success: false, error: e?.message || "Failed" });
    }
  }

  // Instance handlers expected by routes/inventory.ts
  public getInventory = async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    try {
      const search =
        typeof req.query?.search === "string" ? req.query.search : "";
      const items = search ? await repo.search(search) : await repo.findAll();
      return res.json({ success: true, data: items });
    } catch (e: any) {
      return res
        .status(500)
        .json({ success: false, error: e?.message || "Failed" });
    }
  };

  public getInventoryValue = async (
    _req: Request,
    res: Response
  ): Promise<Response> => {
    try {
      const items = await repo.findAll();
      return res.json({
        success: true,
        data: { totalItems: items.length, totalValue: 0, currency: "USD" },
      });
    } catch (e: any) {
      return res
        .status(500)
        .json({ success: false, error: e?.message || "Failed" });
    }
  };

  public getInventoryStats = async (
    _req: Request,
    res: Response
  ): Promise<Response> => {
    try {
      const byRarity = await repo.countByRarity();
      return res.json({ success: true, data: { byRarity } });
    } catch (e: any) {
      return res
        .status(500)
        .json({ success: false, error: e?.message || "Failed" });
    }
  };

  public getSteamInventoryStats = (_req: Request, res: Response): Response => {
    return res.json({ success: true, data: { totalItems: 0, byType: {} } });
  };

  public getSteamInventory = (_req: Request, res: Response): Response => {
    return res.json({ success: true, data: [] });
  };

  public importSteamInventory = (_req: Request, res: Response): Response => {
    return res.json({ success: true, data: { imported: 0 } });
  };

  public getSkinDetails = async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    const { skinId } = req.params as { skinId?: string };
    if (!skinId) {
      return res
        .status(400)
        .json({ success: false, error: "skinId is required" });
    }
    const item = await repo.findById(skinId);
    if (!item) {
      return res.status(404).json({ success: false, error: "Skin not found" });
    }
    return res.json({ success: true, data: item });
  };

  public sellSkin = (req: Request, res: Response): Response => {
    const { skinId } = req.params as { skinId?: string };
    if (!skinId) {
      return res
        .status(400)
        .json({ success: false, error: "skinId is required" });
    }
    const minAcceptablePrice =
      (req.body?.minAcceptablePrice as number | undefined) ?? null;
    return res.json({
      success: true,
      data: { skinId, status: "queued", minAcceptablePrice },
    });
  };
}
