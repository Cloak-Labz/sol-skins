import { stringify } from "csv-stringify/sync";
import NodeCache from "node-cache";
import axios from "axios";
import { XMLParser } from "fast-xml-parser";

const cache = new NodeCache();

// Add default headers to avoid 403 errors
axios.defaults.headers.common['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
axios.defaults.headers.common['Accept'] = 'application/json';

// Map common currency codes to Steam currency IDs
const currencyMap: { [key: string]: number } = {
  'USD': 1,  'EUR': 3,  'GBP': 2,  'RUB': 5,  'BRL': 7,
  'CAD': 20, 'AUD': 21, 'CNY': 23, 'INR': 24, 'JPY': 8,
  'KRW': 9,  'TRY': 17, 'UAH': 18, 'MXN': 19, 'ARS': 34, 'CLP': 35,
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export interface ParsedItem {
  Type: string;
  MarketName: string;
  MarketHashName: string;
  Marketable: string;
  Exterior: string;
  ItemSet: string;
  Quality: string;
  Rarity: string;
  Weapon: string;
  LowestPrice: string;
  MedianPrice: string;
  Volume: string;
  Currency: string;
}

interface PriceData {
  success?: boolean;
  lowest_price?: string;
  median_price?: string;
  volume?: string;
  currency?: string;
}

interface Inventory {
  assets: Asset[];
  descriptions: InventoryDescription[];
  total_inventory_count: number;
  success: number;
  rwgrsn: number;
}

interface Asset {
  appid: number;
  contextid: string;
  assetid: string;
  classid: string;
  instanceid: string;
  amount: string;
}

interface InventoryDescription {
  appid: number;
  classid: string;
  instanceid: string;
  currency: number;
  background_color: string;
  icon_url: string;
  icon_url_large?: string;
  tradable: number;
  name: string;
  type: string;
  market_name: string;
  market_hash_name: string;
  commodity: number;
  market_tradable_restriction: number;
  marketable: number;
  tags: Tag[];
}

interface Tag {
  category: string;
  internal_name: string;
  localized_category_name: string;
  localized_tag_name: string;
}

async function getSteamMarketPrice(marketHashName: string, currencyId: number): Promise<any> {
  try {
    const res = await axios.get('https://steamcommunity.com/market/priceoverview/', {
      params: {
        appid: 730,
        currency: currencyId,
        market_hash_name: marketHashName
      },
      headers: { 'Referer': 'https://steamcommunity.com/market/' },
      timeout: 15000
    });

    const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
    
    if (data?.success) {
      return {
        success: true,
        lowest_price: data.lowest_price || '',
        median_price: data.median_price || '',
        volume: data.volume || '',
      };
    }
    
    return { success: false };
  } catch (error: any) {
    throw error;
  }
}

async function getSteamId64(userId: string): Promise<string> {
  const url = `https://steamcommunity.com/id/${userId}?xml=1`;
  const res = await axios.get(url);
  const steamId64 = new XMLParser().parse(res.data).profile.steamID64;
  
  if (!steamId64) {
    throw new Error("Could not parse SteamID64");
  }
  
  return steamId64;
}

async function fetchInventory(steamId64: string): Promise<Inventory> {
  const inventoryUrl = `https://steamcommunity.com/inventory/${steamId64}/730/2?l=english&count=200`;
  const res = await axios.get(inventoryUrl);
  return res.data;
}

export interface GetInventoryOptions {
  userId: string;
  currency?: string;
  includePrices?: boolean;
}

export interface GetInventoryResult {
  items: ParsedItem[];
  steamId64: string;
  csvString: string;
}

export async function getCS2Inventory(options: GetInventoryOptions): Promise<GetInventoryResult> {
  const { userId, currency = 'USD', includePrices = true } = options;
  const steamCurrencyId = currencyMap[currency.toUpperCase()] || 1;

  // Get Steam ID64
  const steamId64 = await getSteamId64(userId);

  // Fetch inventory
  const inventoryItems = await fetchInventory(steamId64);

  const parsedItems: ParsedItem[] = [];

  for (const asset of inventoryItems.assets) {
    const desc = inventoryItems.descriptions.find((d) => asset.classid == d.classid);

    if (!desc) continue;

    const itemId = desc.market_hash_name;
    let priceRes: string | undefined = cache.get(itemId);

    if (includePrices && desc.marketable && !priceRes) {
      try {
        await delay(3000); // Steam rate limit
        
        const priceData = await getSteamMarketPrice(itemId, steamCurrencyId);
        
        if (priceData.success) {
          priceRes = JSON.stringify({
            lowest_price: priceData.lowest_price,
            median_price: priceData.median_price,
            volume: priceData.volume,
            currency: currency.toUpperCase()
          });
        }
      } catch (error: any) {
        if (error?.response?.status === 429) {
          await delay(5000);
          try {
            const priceData = await getSteamMarketPrice(itemId, steamCurrencyId);
            if (priceData.success) {
              priceRes = JSON.stringify({
                lowest_price: priceData.lowest_price,
                median_price: priceData.median_price,
                volume: priceData.volume,
                currency: currency.toUpperCase()
              });
            }
          } catch (retryError) {
            // Failed retry, skip price
          }
        }
      }
    }

    let priceData: PriceData | null = null;

    try {
      priceData = JSON.parse(priceRes ?? "{}");
      if (priceRes) cache.set(itemId, priceRes);
    } catch (error) {
      // Invalid JSON, skip
    }

    parsedItems.push({
      Type: desc.type,
      MarketName: desc.market_name,
      MarketHashName: desc.market_hash_name,
      Marketable: desc.marketable == 1 ? "Yes" : "No",
      Exterior: desc.tags.find((t) => t.category == "Exterior")?.localized_tag_name || "",
      ItemSet: desc.tags.find((t) => t.category == "ItemSet")?.localized_tag_name || "",
      Quality: desc.tags.find((t) => t.category == "Quality")?.localized_tag_name || "",
      Rarity: desc.tags.find((t) => t.category == "Rarity")?.localized_tag_name || "",
      Weapon: desc.tags.find((t) => t.category == "Weapon")?.localized_tag_name || "",
      LowestPrice: priceData?.lowest_price || "",
      MedianPrice: priceData?.median_price || "",
      Volume: priceData?.volume || "",
      Currency: priceData?.currency || "",
    });
  }

  const csvString = stringify(parsedItems, { header: true });

  return {
    items: parsedItems,
    steamId64,
    csvString,
  };
}

