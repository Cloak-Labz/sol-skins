import { Request, Response } from "express";
import { InventoryRepository } from "../repositories/InventoryRepository";
import { AppDataSource } from "../config/database";
import { UserSkin } from "../entities/UserSkin";

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
      const userId = req.user!.id;
      const search = typeof req.query?.search === "string" ? req.query.search : "";
      const sortBy = typeof req.query?.sortBy === "string" ? req.query.sortBy : "date";
      const filterBy = typeof req.query?.filterBy === "string" ? req.query.filterBy : "all";
      const page = parseInt(req.query?.page as string) || 1;
      const limit = parseInt(req.query?.limit as string) || 20;
      
      // Get user's skins from the database
      const userSkinRepo = AppDataSource.getRepository(UserSkin);
      const queryBuilder = userSkinRepo.createQueryBuilder('userSkin')
        .leftJoinAndSelect('userSkin.skinTemplate', 'skinTemplate')
        .where('userSkin.userId = :userId', { userId })
        .andWhere('userSkin.isInInventory = :inInventory', { inInventory: true });

      if (search) {
        queryBuilder.andWhere(
          '(skinTemplate.weapon ILIKE :search OR skinTemplate.skinName ILIKE :search)',
          { search: `%${search}%` }
        );
      }

      if (filterBy !== 'all') {
        queryBuilder.andWhere('skinTemplate.rarity = :rarity', { rarity: filterBy });
      }

      // Sorting
      switch (sortBy) {
        case 'date':
          queryBuilder.orderBy('userSkin.openedAt', 'DESC');
          break;
        case 'price-high':
          queryBuilder.orderBy('userSkin.currentPriceUsd', 'DESC');
          break;
        case 'price-low':
          queryBuilder.orderBy('userSkin.currentPriceUsd', 'ASC');
          break;
        case 'name':
          queryBuilder.orderBy('skinTemplate.weapon', 'ASC').addOrderBy('skinTemplate.skinName', 'ASC');
          break;
        case 'rarity':
          queryBuilder.orderBy('skinTemplate.rarity', 'ASC');
          break;
        default:
          queryBuilder.orderBy('userSkin.openedAt', 'DESC');
      }

      queryBuilder.skip((page - 1) * limit).take(limit);

      const [userSkins, total] = await queryBuilder.getManyAndCount();

      // Calculate summary
      const totalValue = userSkins.reduce((sum, skin) => {
        return sum + (skin.currentPriceUsd || skin.skinTemplate?.basePriceUsd || 0);
      }, 0);

      const rarityBreakdown = userSkins.reduce((acc, skin) => {
        const rarity = skin.skinTemplate?.rarity || 'Unknown';
        acc[rarity.toLowerCase()] = (acc[rarity.toLowerCase()] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const summary = {
        totalValue,
        totalItems: total,
        rarityBreakdown,
      };

      const pagination = {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      };

      return res.json({ 
        success: true, 
        data: userSkins,
        summary,
        pagination
      });
    } catch (e: any) {
      return res
        .status(500)
        .json({ success: false, error: e?.message || "Failed" });
    }
  };

  public getInventoryValue = async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    try {
      const userId = req.user!.id;
      
      // Get user's skins from the database
      const userSkinRepo = AppDataSource.getRepository(UserSkin);
      const userSkins = await userSkinRepo.find({
        where: { userId },
        relations: ['skinTemplate'],
      });

      // Calculate real inventory stats
      const totalItems = userSkins.length;
      const totalValue = userSkins.reduce((sum, skin) => {
        const price = parseFloat(skin.currentPriceUsd || skin.skinTemplate?.basePriceUsd || '0');
        return sum + price;
      }, 0);

      // Calculate rarity breakdown
      const rarityBreakdown = userSkins.reduce((acc, skin) => {
        const rarity = skin.skinTemplate?.rarity || 'Unknown';
        acc[rarity.toLowerCase()] = (acc[rarity.toLowerCase()] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return res.json({
        success: true,
        data: {
          totalValue,
          totalItems,
          rarityBreakdown,
          currency: "USD"
        },
      });
    } catch (e: any) {
      return res
        .status(500)
        .json({ success: false, error: e?.message || "Failed" });
    }
  };

  public getInventoryStats = async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    try {
      const userId = req.user!.id;
      
      // Get user's skins from the database
      const userSkinRepo = AppDataSource.getRepository(UserSkin);
      const userSkins = await userSkinRepo.find({
        where: { userId },
        relations: ['skinTemplate'],
      });

      // Calculate rarity breakdown
      const byRarity = userSkins.reduce((acc, skin) => {
        const rarity = skin.skinTemplate?.rarity || 'Unknown';
        acc[rarity.toLowerCase()] = (acc[rarity.toLowerCase()] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

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
