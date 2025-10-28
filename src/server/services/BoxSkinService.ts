import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { BoxSkin } from '../entities/BoxSkin';
import { SkinTemplate } from '../entities/SkinTemplate';
import { AppError } from '../middlewares/errorHandler';
import { logger } from '../middlewares/logger';

export interface CreateBoxSkinDTO {
  boxId: string;
  name: string;
  weapon: string;
  rarity: string;
  condition: string;
  imageUrl?: string;
  basePriceUsd?: number;
  metadataUri?: string;
  weight?: number;
  skinTemplateId?: string;
}

export interface UpdateBoxSkinDTO {
  name?: string;
  weapon?: string;
  rarity?: string;
  condition?: string;
  imageUrl?: string;
  basePriceUsd?: number;
  metadataUri?: string;
  weight?: number;
  skinTemplateId?: string;
}

export class BoxSkinService {
  private repository: Repository<BoxSkin>;
  private skinTemplateRepository: Repository<SkinTemplate>;

  constructor() {
    this.repository = AppDataSource.getRepository(BoxSkin);
    this.skinTemplateRepository = AppDataSource.getRepository(SkinTemplate);
  }

  async createBoxSkin(data: CreateBoxSkinDTO): Promise<BoxSkin> {
    try {
      const boxSkin = this.repository.create({
        ...data,
        basePriceUsd: data.basePriceUsd || 0,
        weight: data.weight || 1,
      });

      const saved = await this.repository.save(boxSkin);
      logger.info('BoxSkin created:', { id: saved.id, boxId: saved.boxId, name: saved.name });
      return saved;
    } catch (error) {
      logger.error('Error creating BoxSkin:', error);
      throw new AppError('Failed to create box skin', 500);
    }
  }

  async getBoxSkinsByBoxId(boxId: string): Promise<BoxSkin[]> {
    try {
      return await this.repository.find({
        where: { boxId },
        order: { weight: 'DESC', createdAt: 'ASC' },
      });
    } catch (error) {
      logger.error('Error fetching box skins:', error);
      throw new AppError('Failed to fetch box skins', 500);
    }
  }

  async getBoxSkinById(id: string): Promise<BoxSkin> {
    try {
      const boxSkin = await this.repository.findOne({ where: { id } });
      if (!boxSkin) {
        throw new AppError('Box skin not found', 404, 'BOX_SKIN_NOT_FOUND');
      }
      return boxSkin;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error fetching box skin by ID:', error);
      throw new AppError('Failed to fetch box skin', 500);
    }
  }

  async updateBoxSkin(id: string, data: UpdateBoxSkinDTO): Promise<BoxSkin> {
    try {
      const boxSkin = await this.getBoxSkinById(id);
      
      Object.assign(boxSkin, data);
      const updated = await this.repository.save(boxSkin);
      
      logger.info('BoxSkin updated:', { id, updates: Object.keys(data) });
      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating box skin:', error);
      throw new AppError('Failed to update box skin', 500);
    }
  }

  async deleteBoxSkin(id: string): Promise<void> {
    try {
      const boxSkin = await this.getBoxSkinById(id);
      await this.repository.remove(boxSkin);
      logger.info('BoxSkin deleted:', { id, boxId: boxSkin.boxId });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error deleting box skin:', error);
      throw new AppError('Failed to delete box skin', 500);
    }
  }

  async deleteBoxSkinsByBoxId(boxId: string): Promise<void> {
    try {
      await this.repository.delete({ boxId });
      logger.info('All box skins deleted for box:', { boxId });
    } catch (error) {
      logger.error('Error deleting box skins by box ID:', error);
      throw new AppError('Failed to delete box skins', 500);
    }
  }

  async getRarityDistribution(boxId: string): Promise<{ [rarity: string]: number }> {
    try {
      const boxSkins = await this.getBoxSkinsByBoxId(boxId);
      const distribution: { [rarity: string]: number } = {};
      
      boxSkins.forEach(skin => {
        distribution[skin.rarity] = (distribution[skin.rarity] || 0) + 1;
      });
      
      return distribution;
    } catch (error) {
      logger.error('Error calculating rarity distribution:', error);
      throw new AppError('Failed to calculate rarity distribution', 500);
    }
  }

  async getWeightedRandomSkin(boxId: string): Promise<BoxSkin> {
    try {
      const boxSkins = await this.getBoxSkinsByBoxId(boxId);
      if (boxSkins.length === 0) {
        throw new AppError('No skins available for this box', 404, 'NO_SKINS_AVAILABLE');
      }

      // Calculate total weight
      const totalWeight = boxSkins.reduce((sum, skin) => sum + skin.weight, 0);
      
      // Generate random number
      const random = Math.random() * totalWeight;
      
      // Find the skin based on weighted random
      let currentWeight = 0;
      for (const skin of boxSkins) {
        currentWeight += skin.weight;
        if (random <= currentWeight) {
          return skin;
        }
      }
      
      // Fallback to last skin (shouldn't happen)
      return boxSkins[boxSkins.length - 1];
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error selecting random skin:', error);
      throw new AppError('Failed to select random skin', 500);
    }
  }

  /**
   * Create a box skin from a skin template
   */
  async createBoxSkinFromTemplate(
    boxId: string,
    skinTemplateId: string,
    weight: number = 1,
    metadataUri?: string
  ): Promise<BoxSkin> {
    try {
      const skinTemplate = await this.skinTemplateRepository.findOneBy({ id: skinTemplateId });
      if (!skinTemplate) {
        throw new AppError('Skin template not found', 404, 'SKIN_TEMPLATE_NOT_FOUND');
      }

      const boxSkin = this.repository.create({
        boxId,
        skinTemplateId,
        name: skinTemplate.skinName,
        weapon: skinTemplate.weapon,
        rarity: skinTemplate.rarity,
        condition: skinTemplate.condition,
        imageUrl: skinTemplate.imageUrl,
        basePriceUsd: skinTemplate.basePriceUsd,
        metadataUri,
        weight,
      });

      const saved = await this.repository.save(boxSkin);
      logger.info('BoxSkin created from template:', { 
        id: saved.id, 
        boxId: saved.boxId, 
        skinTemplateId: saved.skinTemplateId,
        name: saved.name 
      });
      return saved;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error creating BoxSkin from template:', error);
      throw new AppError('Failed to create BoxSkin from template', 500);
    }
  }

  /**
   * Get all available skin templates that can be added to a box
   */
  async getAvailableSkinTemplates(): Promise<SkinTemplate[]> {
    try {
      return await this.skinTemplateRepository.find({
        where: { isActive: true },
        order: { rarity: 'ASC', weapon: 'ASC', skinName: 'ASC' }
      });
    } catch (error) {
      logger.error('Error fetching skin templates:', error);
      throw new AppError('Failed to fetch skin templates', 500);
    }
  }

  /**
   * Get box skins with their template information
   */
  async getBoxSkinsWithTemplates(boxId: string): Promise<BoxSkin[]> {
    try {
      return await this.repository.find({
        where: { boxId },
        relations: ['skinTemplate'],
        order: { weight: 'DESC', rarity: 'ASC' }
      });
    } catch (error) {
      logger.error('Error fetching box skins with templates:', error);
      throw new AppError('Failed to fetch box skins with templates', 500);
    }
  }
}
