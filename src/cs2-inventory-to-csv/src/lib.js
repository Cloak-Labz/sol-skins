"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCS2Inventory = getCS2Inventory;
const sync_1 = require("csv-stringify/sync");
const node_cache_1 = __importDefault(require("node-cache"));
const axios_1 = __importDefault(require("axios"));
const fast_xml_parser_1 = require("fast-xml-parser");
const cache = new node_cache_1.default();
axios_1.default.defaults.headers.common['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
axios_1.default.defaults.headers.common['Accept'] = 'application/json';
const currencyMap = {
    'USD': 1, 'EUR': 3, 'GBP': 2, 'RUB': 5, 'BRL': 7,
    'CAD': 20, 'AUD': 21, 'CNY': 23, 'INR': 24, 'JPY': 8,
    'KRW': 9, 'TRY': 17, 'UAH': 18, 'MXN': 19, 'ARS': 34, 'CLP': 35,
};
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
async function getSteamMarketPrice(marketHashName, currencyId) {
    try {
        const res = await axios_1.default.get('https://steamcommunity.com/market/priceoverview/', {
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
    }
    catch (error) {
        throw error;
    }
}
async function getSteamId64(userId) {
    const url = `https://steamcommunity.com/id/${userId}?xml=1`;
    const res = await axios_1.default.get(url);
    const steamId64 = new fast_xml_parser_1.XMLParser().parse(res.data).profile.steamID64;
    if (!steamId64) {
        throw new Error("Could not parse SteamID64");
    }
    return steamId64;
}
async function fetchInventory(steamId64) {
    const inventoryUrl = `https://steamcommunity.com/inventory/${steamId64}/730/2?l=english&count=200`;
    const res = await axios_1.default.get(inventoryUrl);
    return JSON.parse(res.data);
}
async function getCS2Inventory(options) {
    const { userId, currency = 'USD', includePrices = true } = options;
    const steamCurrencyId = currencyMap[currency.toUpperCase()] || 1;
    const steamId64 = await getSteamId64(userId);
    const inventoryItems = await fetchInventory(steamId64);
    const parsedItems = [];
    for (const asset of inventoryItems.assets) {
        const desc = inventoryItems.descriptions.find((d) => asset.classid == d.classid);
        if (!desc)
            continue;
        const itemId = desc.market_hash_name;
        let priceRes = cache.get(itemId);
        if (includePrices && desc.marketable && !priceRes) {
            try {
                await delay(3000);
                const priceData = await getSteamMarketPrice(itemId, steamCurrencyId);
                if (priceData.success) {
                    priceRes = JSON.stringify({
                        lowest_price: priceData.lowest_price,
                        median_price: priceData.median_price,
                        volume: priceData.volume,
                        currency: currency.toUpperCase()
                    });
                }
            }
            catch (error) {
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
                    }
                    catch (retryError) {
                    }
                }
            }
        }
        let priceData = null;
        try {
            priceData = JSON.parse(priceRes ?? "{}");
            if (priceRes)
                cache.set(itemId, priceRes);
        }
        catch (error) {
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
    const csvString = (0, sync_1.stringify)(parsedItems, { header: true });
    return {
        items: parsedItems,
        steamId64,
        csvString,
    };
}
//# sourceMappingURL=lib.js.map