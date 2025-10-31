import { Router } from 'express';
import { SteamImageService } from '../services/SteamImageService';
import { AppError } from '../middlewares/errorHandler';

const router = Router();

/**
 * GET /api/v1/steam/skin-image
 * Fetch Steam CDN image URL for a CS2 skin with database caching
 */
router.get('/skin-image', async (req, res) => {
  try {
    const { weapon, skinName, condition } = req.query;

    if (!weapon || !skinName || !condition) {
      throw new AppError('Required parameters: weapon, skinName, condition', 400, 'MISSING_PARAMETERS');
    }

    const imageUrl = await SteamImageService.getSkinImageUrl(
      weapon as string,
      skinName as string,
      condition as string
    );

    if (!imageUrl) {
      throw new AppError(
        `Could not find Steam image for ${weapon} | ${skinName} (${condition}). Check that the skin name and condition are correct.`,
        404,
        'IMAGE_NOT_FOUND'
      );
    }

    res.json({
      success: true,
      data: {
        imageUrl,
        weapon,
        skinName,
        condition,
        marketHashName: SteamImageService.buildMarketHashName(
          weapon as string,
          skinName as string,
          condition as string
        ),
      }
    });

  } catch (error: any) {
    console.error('Steam image fetch error:', error);
    
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code,
          message: error.message
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'STEAM_API_ERROR',
          message: error?.message || 'Failed to fetch Steam image'
        }
      });
    }
  }
});

/**
 * POST /api/v1/steam/batch-skin-images
 * Batch fetch multiple skin images with rate limiting
 */
router.post('/batch-skin-images', async (req, res) => {
  try {
    const { skins } = req.body;

    if (!Array.isArray(skins) || skins.length === 0) {
      throw new AppError('Body must contain an array of skins', 400, 'INVALID_REQUEST');
    }

    // Validate each skin has required fields
    for (const skin of skins) {
      if (!skin.weapon || !skin.skinName || !skin.condition) {
        throw new AppError(
          'Each skin must have weapon, skinName, and condition',
          400,
          'INVALID_SKIN_DATA'
        );
      }
    }

    const results = await SteamImageService.batchFetchSkinImages(skins);

    res.json({
      success: true,
      data: {
        found: results.size,
        total: skins.length,
        images: Object.fromEntries(results)
      }
    });

  } catch (error: any) {
    console.error('Batch fetch error:', error);
    
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code,
          message: error.message
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'BATCH_FETCH_ERROR',
          message: error?.message || 'Failed to batch fetch images'
        }
      });
    }
  }
});

export default router;

