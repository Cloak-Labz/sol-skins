import { Request, Response } from "express";
import fs from "fs";
import path from "path";

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

function getDbPath(): string {
  return path.join(__dirname, "../data/inventory.json");
}

function readDb(): InventoryItem[] {
  const file = getDbPath();
  if (!fs.existsSync(file)) return [];
  try {
    const raw = fs.readFileSync(file, "utf-8");
    return JSON.parse(raw) as InventoryItem[];
  } catch {
    return [];
  }
}

function writeDb(items: InventoryItem[]) {
  const file = getDbPath();
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(items, null, 2));
}

export class InventoryController {
  static list(req: Request, res: Response) {
    const items = readDb();
    res.json({ success: true, data: items });
  }

  static add(req: Request, res: Response): Response {
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
    const items = readDb();
    const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const item: InventoryItem = {
      id,
      name,
      description: description || "",
      imageUrl: imageUrl || "",
      rarity: rarity || "Common",
      attributes: attributes || {},
      createdAt: Date.now(),
      metadataUri,
      mintedAsset,
      mintTx,
      mintedAt: mintedAsset ? Date.now() : undefined,
    };
    items.push(item);
    writeDb(items);
    return res.json({ success: true, data: item });
  }

  static updateMint(req: Request, res: Response): Response {
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

    const items = readDb();
    const idx = items.findIndex((i) => i.id === id);

    if (idx === -1) {
      return res.status(404).json({ success: false, error: "Item not found" });
    }

    // Update item with mint info from frontend
    items[idx].metadataUri = metadataUri;
    items[idx].mintedAsset = mintedAsset;
    items[idx].mintedAt = Date.now();
    items[idx].mintTx = mintTx;
    writeDb(items);

    return res.json({
      success: true,
      data: items[idx],
    });
  }

  // Instance handlers expected by routes/inventory.ts
  public getInventory = (req: Request, res: Response): Response => {
    const items = readDb();
    const search =
      typeof req.query?.search === "string"
        ? req.query.search.toLowerCase()
        : "";
    const filtered = search
      ? items.filter((i) => i.name.toLowerCase().includes(search))
      : items;
    return res.json({ success: true, data: filtered });
  };

  public getInventoryValue = (_req: Request, res: Response): Response => {
    const items = readDb();
    return res.json({
      success: true,
      data: { totalItems: items.length, totalValue: 0, currency: "USD" },
    });
  };

  public getInventoryStats = (_req: Request, res: Response): Response => {
    const items = readDb();
    const byRarity: Record<string, number> = {};
    for (const item of items) {
      const rarity = item.rarity || "Common";
      byRarity[rarity] = (byRarity[rarity] || 0) + 1;
    }
    return res.json({ success: true, data: { byRarity } });
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

  public getSkinDetails = (req: Request, res: Response): Response => {
    const { skinId } = req.params as { skinId?: string };
    if (!skinId) {
      return res
        .status(400)
        .json({ success: false, error: "skinId is required" });
    }
    const items = readDb();
    const item = items.find((i) => i.id === skinId);
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
