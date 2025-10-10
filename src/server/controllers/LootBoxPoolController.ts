import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { LootBoxSkinPool } from '../entities/LootBoxSkinPool';

export class LootBoxPoolController {
  /**
   * GET /admin/loot-box-pools
   * List all loot box pools
   */
  static async list(req: Request, res: Response) {
    try {
      const poolRepository = AppDataSource.getRepository(LootBoxSkinPool);
      
      const pools = await poolRepository.find({
        relations: ['lootBoxType', 'skinTemplate'],
        order: { createdAt: 'DESC' },
      });

      return res.json({
        success: true,
        data: pools,
      });
    } catch (error) {
      console.error('[LootBoxPoolController] Error listing pools:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to list loot box pools',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * POST /admin/loot-box-pools
   * Create a new loot box pool entry
   */
  static async create(req: Request, res: Response) {
    try {
      const poolRepository = AppDataSource.getRepository(LootBoxSkinPool);
      
      const newPool = poolRepository.create({
        lootBoxTypeId: req.body.lootBoxTypeId,
        skinTemplateId: req.body.skinTemplateId,
        dropChance: req.body.dropChance,
      });

      await poolRepository.save(newPool);

      return res.status(201).json({
        success: true,
        data: newPool,
        message: 'Loot box pool entry created successfully',
      });
    } catch (error) {
      console.error('[LootBoxPoolController] Error creating pool:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create loot box pool entry',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * DELETE /admin/loot-box-pools/:id
   * Delete a loot box pool entry
   */
  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const poolRepository = AppDataSource.getRepository(LootBoxSkinPool);
      
      const pool = await poolRepository.findOne({ where: { id } });
      
      if (!pool) {
        return res.status(404).json({
          success: false,
          message: 'Loot box pool entry not found',
        });
      }

      await poolRepository.remove(pool);

      return res.json({
        success: true,
        message: 'Loot box pool entry deleted successfully',
      });
    } catch (error) {
      console.error('[LootBoxPoolController] Error deleting pool:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete loot box pool entry',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

