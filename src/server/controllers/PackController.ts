import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { LootBoxType } from '../entities/LootBoxType';

export class PackController {
  /**
   * GET /admin/packs
   * List all packs (loot boxes)
   */
  static async list(req: Request, res: Response) {
    try {
      const lootBoxRepository = AppDataSource.getRepository(LootBoxType);
      
      const packs = await lootBoxRepository.find({
        order: { createdAt: 'DESC' },
      });

      return res.json({
        success: true,
        data: packs,
      });
    } catch (error) {
      console.error('[PackController] Error listing packs:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to list packs',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * POST /admin/packs
   * Create a new pack (loot box)
   */
  static async create(req: Request, res: Response) {
    try {
      const lootBoxRepository = AppDataSource.getRepository(LootBoxType);
      
      const newPack = lootBoxRepository.create({
        name: req.body.name,
        description: req.body.description,
        priceSol: req.body.priceSol,
        priceUsdc: req.body.priceUsdc,
        imageUrl: req.body.imageUrl,
        rarity: req.body.rarity,
        isActive: req.body.isActive !== undefined ? req.body.isActive : true,
        isFeatured: req.body.isFeatured || false,
        candyMachineId: req.body.candyMachineId || null,
        chanceCommon: req.body.chanceCommon || 0,
        chanceUncommon: req.body.chanceUncommon || 0,
        chanceRare: req.body.chanceRare || 0,
        chanceEpic: req.body.chanceEpic || 0,
        chanceLegendary: req.body.chanceLegendary || 0,
        maxSupply: req.body.maxSupply || null,
        remainingSupply: req.body.remainingSupply || (req.body.maxSupply || 0),
      });

      await lootBoxRepository.save(newPack);

      return res.status(201).json({
        success: true,
        data: newPack,
        message: 'Pack created successfully',
      });
    } catch (error) {
      console.error('[PackController] Error creating pack:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create pack',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * PUT /admin/packs/:id
   * Update an existing pack
   */
  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const lootBoxRepository = AppDataSource.getRepository(LootBoxType);
      
      const pack = await lootBoxRepository.findOne({ where: { id } });
      
      if (!pack) {
        return res.status(404).json({
          success: false,
          message: 'Pack not found',
        });
      }

      // Update fields
      if (req.body.name !== undefined) pack.name = req.body.name;
      if (req.body.description !== undefined) pack.description = req.body.description;
      if (req.body.priceSol !== undefined) pack.priceSol = req.body.priceSol;
      if (req.body.priceUsd !== undefined) pack.priceUsd = req.body.priceUsd;
      if (req.body.imageUrl !== undefined) pack.imageUrl = req.body.imageUrl;
      if (req.body.rarity !== undefined) pack.rarity = req.body.rarity;
      if (req.body.isActive !== undefined) pack.isActive = req.body.isActive;
      if (req.body.candyMachineId !== undefined) pack.candyMachineId = req.body.candyMachineId;

      await lootBoxRepository.save(pack);

      return res.json({
        success: true,
        data: pack,
        message: 'Pack updated successfully',
      });
    } catch (error) {
      console.error('[PackController] Error updating pack:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update pack',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * DELETE /admin/packs/:id
   * Delete a pack
   */
  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const lootBoxRepository = AppDataSource.getRepository(LootBoxType);
      
      const pack = await lootBoxRepository.findOne({ where: { id } });
      
      if (!pack) {
        return res.status(404).json({
          success: false,
          message: 'Pack not found',
        });
      }

      await lootBoxRepository.remove(pack);

      return res.json({
        success: true,
        message: 'Pack deleted successfully',
      });
    } catch (error) {
      console.error('[PackController] Error deleting pack:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete pack',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

