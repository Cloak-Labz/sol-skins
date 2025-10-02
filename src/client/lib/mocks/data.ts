import { ActivityItem, LeaderboardEntry, UserSkin, LootBox } from "@/lib/types/api";

// Mock Users
export const MOCK_USERS = [
  {
    id: "1",
    username: "CryptoGamer",
    walletAddress: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    createdAt: new Date().toISOString(),
  },
  {
    id: "2",
    username: "SkinCollector",
    walletAddress: "9xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsV",
    createdAt: new Date().toISOString(),
  },
  {
    id: "3",
    username: "ProTrader",
    walletAddress: "5xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsW",
    createdAt: new Date().toISOString(),
  },
];

// Mock Skins
export const MOCK_SKINS: UserSkin[] = [
  {
    id: "skin-1",
    userId: "1",
    skinTemplateId: "template-1",
    mintAddress: "Hmkt5VxF4mPq6dD2TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    condition: "Factory New",
    float: 0.007,
    currentPrice: 450.50,
    acquiredAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    status: "owned",
    skinTemplate: {
      id: "template-1",
      weapon: "AK-47",
      skinName: "Neon Rider",
      rarity: "legendary",
      imageUrl: "",
      basePrice: 500,
      createdAt: new Date().toISOString(),
    },
  },
  {
    id: "skin-2",
    userId: "1",
    skinTemplateId: "template-2",
    mintAddress: "Bmkt5VxF4mPq6dD2TXJSDpbD5jBkheTqA83TZRuJosgAsV",
    condition: "Minimal Wear",
    float: 0.12,
    currentPrice: 125.75,
    acquiredAt: new Date(Date.now() - 86400000).toISOString(),
    status: "owned",
    skinTemplate: {
      id: "template-2",
      weapon: "AWP",
      skinName: "Dragon Lore",
      rarity: "epic",
      imageUrl: "",
      basePrice: 150,
      createdAt: new Date().toISOString(),
    },
  },
  {
    id: "skin-3",
    userId: "1",
    skinTemplateId: "template-3",
    mintAddress: "Cmkt5VxF4mPq6dD2TXJSDpbD5jBkheTqA83TZRuJosgAsW",
    condition: "Field-Tested",
    float: 0.25,
    currentPrice: 45.20,
    acquiredAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    status: "owned",
    skinTemplate: {
      id: "template-3",
      weapon: "M4A4",
      skinName: "Howl",
      rarity: "rare",
      imageUrl: "",
      basePrice: 50,
      createdAt: new Date().toISOString(),
    },
  },
];

// Mock Loot Boxes
export const MOCK_LOOT_BOXES: LootBox[] = [
  {
    id: "box-1",
    name: "Starter Pack",
    description: "Perfect for beginners. Contains common to rare skins.",
    price: 5.99,
    imageUrl: "",
    rarity: "common",
    availableCount: 1000,
    totalCount: 1000,
    createdAt: new Date().toISOString(),
  },
  {
    id: "box-2",
    name: "Premium Pack",
    description: "Higher chances for rare and epic skins.",
    price: 19.99,
    imageUrl: "",
    rarity: "rare",
    availableCount: 500,
    totalCount: 500,
    createdAt: new Date().toISOString(),
  },
  {
    id: "box-3",
    name: "Legendary Pack",
    description: "Guaranteed epic or legendary skin!",
    price: 49.99,
    imageUrl: "",
    rarity: "legendary",
    availableCount: 100,
    totalCount: 100,
    createdAt: new Date().toISOString(),
  },
];

// Mock Activity
export const MOCK_ACTIVITY: ActivityItem[] = [
  {
    id: "activity-1",
    type: "case_opening",
    userId: "1",
    user: MOCK_USERS[0],
    skinId: "skin-1",
    skin: {
      id: "skin-1",
      weapon: "AK-47",
      skinName: "Neon Rider",
      rarity: "legendary",
    },
    lootBoxId: "box-3",
    lootBox: MOCK_LOOT_BOXES[2],
    valueUsd: "450.50",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "activity-2",
    type: "case_opening",
    userId: "2",
    user: MOCK_USERS[1],
    skinId: "skin-2",
    skin: {
      id: "skin-2",
      weapon: "AWP",
      skinName: "Dragon Lore",
      rarity: "epic",
    },
    lootBoxId: "box-2",
    lootBox: MOCK_LOOT_BOXES[1],
    valueUsd: "125.75",
    timestamp: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "activity-3",
    type: "buyback",
    userId: "3",
    user: MOCK_USERS[2],
    skinId: "skin-3",
    skin: {
      id: "skin-3",
      weapon: "M4A4",
      skinName: "Asiimov",
      rarity: "rare",
    },
    lootBoxId: null,
    lootBox: null,
    valueUsd: "38.42",
    timestamp: new Date(Date.now() - 10800000).toISOString(),
  },
  {
    id: "activity-4",
    type: "case_opening",
    userId: "1",
    user: MOCK_USERS[0],
    skinId: "skin-4",
    skin: {
      id: "skin-4",
      weapon: "Glock-18",
      skinName: "Fade",
      rarity: "uncommon",
    },
    lootBoxId: "box-1",
    lootBox: MOCK_LOOT_BOXES[0],
    valueUsd: "12.50",
    timestamp: new Date(Date.now() - 14400000).toISOString(),
  },
];

// Mock Leaderboard
export const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  {
    rank: 1,
    user: MOCK_USERS[0],
    casesOpened: 47,
    inventoryValue: "1250.75",
    totalSpent: "980.00",
  },
  {
    rank: 2,
    user: MOCK_USERS[1],
    casesOpened: 35,
    inventoryValue: "890.50",
    totalSpent: "750.00",
  },
  {
    rank: 3,
    user: MOCK_USERS[2],
    casesOpened: 28,
    inventoryValue: "675.25",
    totalSpent: "600.00",
  },
  {
    rank: 4,
    user: {
      id: "4",
      username: "LootMaster",
      walletAddress: "4xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsX",
      createdAt: new Date().toISOString(),
    },
    casesOpened: 22,
    inventoryValue: "520.00",
    totalSpent: "450.00",
  },
  {
    rank: 5,
    user: {
      id: "5",
      username: "SkinHunter",
      walletAddress: "6xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsY",
      createdAt: new Date().toISOString(),
    },
    casesOpened: 18,
    inventoryValue: "385.75",
    totalSpent: "380.00",
  },
];

// Mock User Stats
export const MOCK_USER_STATS = {
  totalValue: 1250.75,
  casesOpened: 47,
  inventoryItems: 3,
  totalSpent: 980.0,
  profitLoss: 270.75,
};

// Mock Marketplace Listings
export const MOCK_MARKETPLACE_LISTINGS = [
  {
    id: "listing-1",
    skinId: "skin-1",
    skin: MOCK_SKINS[0],
    sellerId: "2",
    seller: MOCK_USERS[1],
    price: 480.0,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    status: "active",
  },
  {
    id: "listing-2",
    skinId: "skin-2",
    skin: MOCK_SKINS[1],
    sellerId: "3",
    seller: MOCK_USERS[2],
    price: 135.0,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    status: "active",
  },
];
