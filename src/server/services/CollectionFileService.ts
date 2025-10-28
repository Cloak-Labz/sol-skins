import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { AppError } from '../middlewares/errorHandler';
import { logger } from '../middlewares/logger';

export interface CollectionData {
  name: string;
  symbol: string;
  description: string;
  image: string;
  attributes: any[];
  properties: {
    files: Array<{
      uri: string;
      type: string;
    }>;
    category: string;
  };
}

export class CollectionFileService {
  private basePath: string;

  constructor() {
    this.basePath = path.join(process.cwd(), 'programs', 'candy-machine-random', 'assets', 'boxes');
  }

  async generateCollectionFiles(
    boxId: string,
    collectionData: CollectionData,
    imageUrl: string
  ): Promise<{
    boxId: string;
    collectionJsonPath: string;
    collectionImagePath: string;
    collectionData: CollectionData;
  }> {
    try {
      // Create box directory
      const boxDir = path.join(this.basePath, boxId);
      await this.ensureDirectoryExists(boxDir);

      // Generate collection.json
      const collectionJsonPath = path.join(boxDir, 'collection.json');
      await this.writeCollectionJson(collectionJsonPath, collectionData);

      // Download and save collection image
      const collectionImagePath = path.join(boxDir, 'collection.png');
      await this.downloadAndSaveImage(imageUrl, collectionImagePath);

      logger.info('Collection files generated:', {
        boxId,
        collectionJsonPath,
        collectionImagePath,
      });

      return {
        boxId,
        collectionJsonPath: `programs/candy-machine-random/assets/boxes/${boxId}/collection.json`,
        collectionImagePath: `programs/candy-machine-random/assets/boxes/${boxId}/collection.png`,
        collectionData,
      };
    } catch (error) {
      logger.error('Error generating collection files:', error);
      throw new AppError('Failed to generate collection files', 500);
    }
  }

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.promises.mkdir(dirPath, { recursive: true });
    } catch (error) {
      logger.error('Failed to create directory:', error);
      throw new AppError('Failed to create directory', 500);
    }
  }

  private async writeCollectionJson(filePath: string, data: CollectionData): Promise<void> {
    try {
      const jsonContent = JSON.stringify(data, null, 2);
      await fs.promises.writeFile(filePath, jsonContent, 'utf8');
      logger.info('Collection JSON written:', filePath);
    } catch (error) {
      logger.error('Failed to write collection JSON:', error);
      throw new AppError('Failed to write collection JSON', 500);
    }
  }

  private async downloadAndSaveImage(imageUrl: string, filePath: string): Promise<void> {
    try {
      if (!imageUrl || imageUrl.trim() === '') {
        // Use default image if no URL provided
        await this.copyDefaultImage(filePath);
        return;
      }

      const response = await axios.get(imageUrl, {
        responseType: 'stream',
        timeout: 30000, // 30 second timeout
      });

      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          logger.info('Image downloaded and saved:', filePath);
          resolve();
        });
        writer.on('error', (error) => {
          logger.error('Failed to save image:', error);
          reject(error);
        });
      });
    } catch (error) {
      logger.error('Failed to download image:', error);
      // Fallback to default image
      await this.copyDefaultImage(filePath);
    }
  }

  private async copyDefaultImage(filePath: string): Promise<void> {
    try {
      const defaultImagePath = path.join(process.cwd(), 'programs', 'candy-machine-random', 'assets', 'collection.png');
      
      if (fs.existsSync(defaultImagePath)) {
        await fs.promises.copyFile(defaultImagePath, filePath);
        logger.info('Default image copied:', filePath);
      } else {
        // Create a placeholder image if default doesn't exist
        await this.createPlaceholderImage(filePath);
      }
    } catch (error) {
      logger.error('Failed to copy default image:', error);
      throw new AppError('Failed to copy default image', 500);
    }
  }

  private async createPlaceholderImage(filePath: string): Promise<void> {
    try {
      // Create a simple placeholder PNG (1x1 transparent pixel)
      const placeholderBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, // RGBA, 8-bit
        0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, // IDAT chunk
        0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00, // Compressed data
        0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, // CRC
        0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, // IEND chunk
        0x42, 0x60, 0x82
      ]);
      
      await fs.promises.writeFile(filePath, placeholderBuffer);
      logger.info('Placeholder image created:', filePath);
    } catch (error) {
      logger.error('Failed to create placeholder image:', error);
      throw new AppError('Failed to create placeholder image', 500);
    }
  }

  async getCollectionFiles(boxId: string): Promise<{
    collectionJsonPath: string;
    collectionImagePath: string;
    exists: boolean;
  }> {
    try {
      const collectionJsonPath = path.join(this.basePath, boxId, 'collection.json');
      const collectionImagePath = path.join(this.basePath, boxId, 'collection.png');

      const jsonExists = fs.existsSync(collectionJsonPath);
      const imageExists = fs.existsSync(collectionImagePath);

      return {
        collectionJsonPath: `programs/candy-machine-random/assets/boxes/${boxId}/collection.json`,
        collectionImagePath: `programs/candy-machine-random/assets/boxes/${boxId}/collection.png`,
        exists: jsonExists && imageExists,
      };
    } catch (error) {
      logger.error('Error checking collection files:', error);
      throw new AppError('Failed to check collection files', 500);
    }
  }

  async deleteCollectionFiles(boxId: string): Promise<void> {
    try {
      const boxDir = path.join(this.basePath, boxId);
      
      if (fs.existsSync(boxDir)) {
        await fs.promises.rmdir(boxDir, { recursive: true });
        logger.info('Collection files deleted:', boxDir);
      }
    } catch (error) {
      logger.error('Error deleting collection files:', error);
      throw new AppError('Failed to delete collection files', 500);
    }
  }
}

export const collectionFileService = new CollectionFileService();
