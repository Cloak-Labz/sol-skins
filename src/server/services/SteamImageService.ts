import { AppDataSource } from '../config/database';
import { SkinTemplate } from '../entities/SkinTemplate';

interface SteamMarketResponse {
  success: boolean;
  assets?: Array<{
    icon_url?: string;
    icon_url_large?: string;
  }>;
}

interface SteamSearchResponse {
  success: boolean;
  results?: Array<{
    asset_description?: {
      icon_url?: string;
      icon_url_large?: string;
    };
  }>;
}

export class SteamImageService {
  private static readonly STEAM_CDN_BASE = 'https://community.fastly.steamstatic.com/economy/image';
  private static readonly STEAM_MARKET_API = 'https://steamcommunity.com/market/listings/730';

  /**
   * Build full Steam CDN URL from icon hash
   */
  static buildImageUrl(iconHash: string, size: 'normal' | 'large' = 'normal'): string {
    // Use the hash as-is (already in correct format from Steam)
    if (size === 'large') {
      return `${this.STEAM_CDN_BASE}/${iconHash}/360fx360f`;
    }
    return `${this.STEAM_CDN_BASE}/${iconHash}/360fx360f`;
  }

  /**
   * Build Steam Market Hash Name from skin details
   */
  static buildMarketHashName(weapon: string, skinName: string, condition: string): string {
    // Steam format: "Weapon | Skin (Condition)"
    // Normalize condition to Steam format
    const conditionMap: Record<string, string> = {
      'factory_new': 'Factory New',
      'minimal_wear': 'Minimal Wear',
      'field_tested': 'Field-Tested',
      'well_worn': 'Well-Worn',
      'battle_scarred': 'Battle-Scarred',
      'Factory New': 'Factory New',
      'Minimal Wear': 'Minimal Wear',
      'Field-Tested': 'Field-Tested',
      'Well-Worn': 'Well-Worn',
      'Battle-Scarred': 'Battle-Scarred',
    };

    const normalizedCondition = conditionMap[condition] || condition;
    return `${weapon} | ${skinName} (${normalizedCondition})`;
  }

  /**
   * Fetch icon hash from Steam Market API (with fallback)
   */
  static async fetchIconHashFromSteam(marketHashName: string): Promise<string | null> {
    try {
      const encodedName = encodeURIComponent(marketHashName);
      
      console.log(`🔍 Fetching Steam image for: ${marketHashName}`);
      
      // Try method 1: JSON API (faster but only works with active listings)
      const apiUrl = `${this.STEAM_MARKET_API}/${encodedName}/render/?start=0&count=1&currency=1`;
      
      const apiResponse = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SolSkinsBot/1.0)',
        },
      });

      if (apiResponse.ok) {
        const data = await apiResponse.json() as SteamMarketResponse;
        if (data.success && data.assets && data.assets.length > 0) {
          const iconHash = data.assets[0].icon_url || data.assets[0].icon_url_large;
          if (iconHash) {
            console.log(`✅ Found icon hash via render API for ${marketHashName}`);
            return iconHash;
          }
        }
      }

      // Method 2: Try Steam Market Search API (works even without active listings)
      console.log(`🔍 Trying Steam Market Search API for ${marketHashName}...`);
      const searchUrl = `https://steamcommunity.com/market/search/render/?query=${encodedName}&appid=730&norender=1&count=1`;
      
      const searchResponse = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SolSkinsBot/1.0)',
        },
      });

      if (searchResponse.ok) {
        try {
          const data = await searchResponse.json() as SteamSearchResponse;
          
          // Check if we got results
          if (data.success && data.results && data.results.length > 0) {
            const item = data.results[0];
            
            // The asset_description contains icon URL info
            if (item.asset_description?.icon_url) {
              const iconHash = item.asset_description.icon_url;
              console.log(`✅ Found icon hash via Search API for ${marketHashName}`);
              return iconHash;
            }
          }
        } catch (e) {
          console.warn(`Failed to parse Search API response: ${e}`);
        }
      }

      console.warn(`❌ Could not find icon hash for ${marketHashName}`);
      console.warn(`This skin might not exist on Steam Market.`);
      return null;

    } catch (error) {
      console.error(`Error fetching from Steam API:`, error);
      return null;
    }
  }

  /**
   * Get or fetch Steam image URL with database caching
   */
  static async getSkinImageUrl(
    weapon: string, 
    skinName: string, 
    condition: string
  ): Promise<string | null> {
    const skinTemplateRepo = AppDataSource.getRepository(SkinTemplate);
    
    // Build market hash name (uses normalized condition for Steam API)
    const marketHashName = this.buildMarketHashName(weapon, skinName, condition);

    // Normalize condition to database enum format for querying
    const conditionMap: Record<string, string> = {
      'factory_new': 'Factory New',
      'minimal_wear': 'Minimal Wear',
      'field_tested': 'Field-Tested',
      'field-tested': 'Field-Tested', // Frontend normalizes with hyphen
      'well_worn': 'Well-Worn',
      'well-worn': 'Well-Worn',
      'battle_scarred': 'Battle-Scarred',
      'battle-scarred': 'Battle-Scarred',
      'Factory New': 'Factory New',
      'Minimal Wear': 'Minimal Wear',
      'Field-Tested': 'Field-Tested',
      'Well-Worn': 'Well-Worn',
      'Battle-Scarred': 'Battle-Scarred',
    };
    
    const dbCondition = conditionMap[condition] || condition;

    try {
      // Step 1: Check if we have it cached in database
      const cachedSkin = await skinTemplateRepo.findOne({
        where: {
          weapon,
          skinName,
          condition: dbCondition as any,
        },
      });

      if (cachedSkin?.imageUrl) {
        console.log(`💾 Using cached image URL for ${marketHashName}`);
        return cachedSkin.imageUrl;
      }

      // Step 2: Not cached, fetch from Steam API
      console.log(`🌐 Fetching from Steam API: ${marketHashName}`);
      const iconHash = await this.fetchIconHashFromSteam(marketHashName);

      if (!iconHash) {
        return null;
      }

      // Step 3: Build full CDN URL
      const imageUrl = this.buildImageUrl(iconHash);
      console.log(`🖼️  Image URL: ${imageUrl}`);

      // Step 4: Cache in database if skin template exists
      if (cachedSkin) {
        cachedSkin.imageUrl = imageUrl;
        await skinTemplateRepo.save(cachedSkin);
        console.log(`✅ Cached image URL in existing SkinTemplate`);
      } else {
        console.log(`ℹ️  Image URL ready (no SkinTemplate to cache in yet)`);
      }

      return imageUrl;

    } catch (error) {
      console.error('Error in getSkinImageUrl:', error);
      return null;
    }
  }

  /**
   * Batch fetch and cache multiple skins
   */
  static async batchFetchSkinImages(
    skins: Array<{ weapon: string; skinName: string; condition: string }>
  ): Promise<Map<string, string>> {
    const results = new Map<string, string>();

    console.log(`🔄 Batch fetching ${skins.length} skin images from Steam...`);

    for (let i = 0; i < skins.length; i++) {
      const skin = skins[i];
      
      // Add delay to avoid rate limiting (Steam has rate limits)
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const imageUrl = await this.getSkinImageUrl(
        skin.weapon,
        skin.skinName,
        skin.condition
      );

      if (imageUrl) {
        const key = `${skin.weapon}|${skin.skinName}|${skin.condition}`;
        results.set(key, imageUrl);
        console.log(`✅ ${i + 1}/${skins.length} - Got image for ${skin.weapon} | ${skin.skinName}`);
      } else {
        console.warn(`❌ ${i + 1}/${skins.length} - Failed to get image for ${skin.weapon} | ${skin.skinName}`);
      }
    }

    console.log(`✅ Batch fetch complete: ${results.size}/${skins.length} successful`);
    return results;
  }
}

