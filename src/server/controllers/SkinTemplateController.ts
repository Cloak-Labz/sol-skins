import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { SkinTemplate } from '../entities/SkinTemplate';

export class SkinTemplateController {
  /**
   * GET /admin/skin-templates
   * List all skin templates
   */
  static async list(req: Request, res: Response) {
    try {
      const skinTemplateRepository = AppDataSource.getRepository(SkinTemplate);
      
      const skins = await skinTemplateRepository.find({
        order: { createdAt: 'DESC' },
      });

      return res.json({
        success: true,
        data: skins,
      });
    } catch (error) {
      console.error('[SkinTemplateController] Error listing skins:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to list skin templates',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * POST /admin/skin-templates
   * Create a new skin template
   */
  static async create(req: Request, res: Response) {
    try {
      const skinTemplateRepository = AppDataSource.getRepository(SkinTemplate);
      
      const newSkin = skinTemplateRepository.create({
        weapon: req.body.weapon,
        skinName: req.body.skinName,
        rarity: req.body.rarity,
        condition: req.body.condition,
        basePriceUsd: req.body.basePriceUsd,
        imageUrl: req.body.imageUrl,
        exteriorImageUrl: req.body.exteriorImageUrl,
        description: req.body.description,
        collection: req.body.collection,
        isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      });

      await skinTemplateRepository.save(newSkin);

      return res.status(201).json({
        success: true,
        data: newSkin,
        message: 'Skin template created successfully',
      });
    } catch (error) {
      console.error('[SkinTemplateController] Error creating skin:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create skin template',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * PUT /admin/skin-templates/:id
   * Update an existing skin template
   */
  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const skinTemplateRepository = AppDataSource.getRepository(SkinTemplate);
      
      const skin = await skinTemplateRepository.findOne({ where: { id } });
      
      if (!skin) {
        return res.status(404).json({
          success: false,
          message: 'Skin template not found',
        });
      }

      // Update fields
      if (req.body.weapon !== undefined) skin.weapon = req.body.weapon;
      if (req.body.skinName !== undefined) skin.skinName = req.body.skinName;
      if (req.body.rarity !== undefined) skin.rarity = req.body.rarity;
      if (req.body.condition !== undefined) skin.condition = req.body.condition;
      if (req.body.basePriceUsd !== undefined) skin.basePriceUsd = req.body.basePriceUsd;
      if (req.body.imageUrl !== undefined) skin.imageUrl = req.body.imageUrl;
      if (req.body.exteriorImageUrl !== undefined) skin.exteriorImageUrl = req.body.exteriorImageUrl;
      if (req.body.description !== undefined) skin.description = req.body.description;
      if (req.body.collection !== undefined) skin.collection = req.body.collection;
      if (req.body.isActive !== undefined) skin.isActive = req.body.isActive;

      await skinTemplateRepository.save(skin);

      return res.json({
        success: true,
        data: skin,
        message: 'Skin template updated successfully',
      });
    } catch (error) {
      console.error('[SkinTemplateController] Error updating skin:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update skin template',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * DELETE /admin/skin-templates/:id
   * Delete a skin template
   */
  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const skinTemplateRepository = AppDataSource.getRepository(SkinTemplate);
      
      const skin = await skinTemplateRepository.findOne({ where: { id } });
      
      if (!skin) {
        return res.status(404).json({
          success: false,
          message: 'Skin template not found',
        });
      }

      await skinTemplateRepository.remove(skin);

      return res.json({
        success: true,
        message: 'Skin template deleted successfully',
      });
    } catch (error) {
      console.error('[SkinTemplateController] Error deleting skin:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete skin template',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

