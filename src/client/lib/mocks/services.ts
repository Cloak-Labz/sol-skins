import { mockDelay } from "@/lib/config/mock";
import {
  MOCK_ACTIVITY,
  MOCK_LEADERBOARD,
  MOCK_LOOT_BOXES,
  MOCK_MARKETPLACE_LISTINGS,
  MOCK_SKINS,
  MOCK_USERS,
  MOCK_USER_STATS,
} from "./data";

/**
 * Mock Services - Simulates API responses with realistic delays
 */

export const mockAuthService = {
  async connectWallet(walletAddress: string) {
    await mockDelay("SHORT");
    return {
      success: true,
      data: {
        user: MOCK_USERS[0],
        token: "mock-jwt-token-" + Date.now(),
      },
    };
  },

  async disconnectWallet() {
    await mockDelay("SHORT");
    return { success: true };
  },
};

export const mockInventoryService = {
  async getInventory(params?: any) {
    await mockDelay("MEDIUM");
    return {
      skins: MOCK_SKINS,
      summary: {
        totalValue: MOCK_USER_STATS.totalValue,
        totalItems: MOCK_SKINS.length,
      },
      pagination: {
        page: 1,
        limit: 20,
        total: MOCK_SKINS.length,
        totalPages: 1,
      },
    };
  },

  async sellSkin(skinId: string, params: any) {
    await mockDelay("LONG");
    const skin = MOCK_SKINS.find((s) => s.id === skinId);
    if (!skin) {
      throw new Error("Skin not found");
    }
    return {
      soldSkin: {
        id: skinId,
        weapon: skin.skinTemplate.weapon,
        skinName: skin.skinTemplate.skinName,
        originalPrice: skin.currentPrice,
        buybackPrice: skin.currentPrice * 0.85,
        buybackPercentage: 85,
      },
      transaction: {
        id: "tx-" + Date.now(),
        amountUsdc: skin.currentPrice * 0.85,
        txHash: "mock-tx-hash-" + Date.now(),
        status: "completed",
      },
    };
  },
};

export const mockLootBoxService = {
  async getLootBoxes() {
    await mockDelay("MEDIUM");
    return {
      success: true,
      data: MOCK_LOOT_BOXES,
    };
  },

  async getLootBox(id: string) {
    await mockDelay("SHORT");
    const box = MOCK_LOOT_BOXES.find((b) => b.id === id);
    if (!box) {
      throw new Error("Loot box not found");
    }
    return {
      success: true,
      data: box,
    };
  },

  async openLootBox(id: string) {
    await mockDelay("LONG");
    // Simulate random skin drop
    const randomSkin = MOCK_SKINS[Math.floor(Math.random() * MOCK_SKINS.length)];
    return {
      success: true,
      data: {
        skin: randomSkin,
        transaction: "mock-tx-" + Date.now(),
      },
    };
  },
};

export const mockMarketplaceService = {
  async getListings(params?: any) {
    await mockDelay("MEDIUM");
    return {
      success: true,
      data: MOCK_MARKETPLACE_LISTINGS,
    };
  },

  async getListing(id: string) {
    await mockDelay("SHORT");
    const listing = MOCK_MARKETPLACE_LISTINGS.find((l) => l.id === id);
    if (!listing) {
      throw new Error("Listing not found");
    }
    return {
      success: true,
      data: listing,
    };
  },

  async createListing(skinId: string, price: number) {
    await mockDelay("LONG");
    return {
      success: true,
      data: {
        id: "listing-" + Date.now(),
        skinId,
        price,
        createdAt: new Date().toISOString(),
      },
    };
  },

  async buyListing(id: string) {
    await mockDelay("LONG");
    return {
      success: true,
      data: {
        transaction: "mock-tx-" + Date.now(),
      },
    };
  },
};

export const mockSocialService = {
  async getRecentActivity(limit: number = 10) {
    await mockDelay("MEDIUM");
    return MOCK_ACTIVITY.slice(0, limit);
  },

  async getUserActivity(userId: string, limit: number = 10) {
    await mockDelay("MEDIUM");
    return MOCK_ACTIVITY.filter((a) => a.userId === userId).slice(0, limit);
  },
};

export const mockLeaderboardService = {
  async getLeaderboard(params?: any) {
    await mockDelay("MEDIUM");
    const limit = params?.limit || 10;
    return {
      success: true,
      data: MOCK_LEADERBOARD.slice(0, limit),
    };
  },
};

export const mockUserService = {
  async getProfile() {
    await mockDelay("SHORT");
    return {
      success: true,
      data: {
        user: MOCK_USERS[0],
        stats: MOCK_USER_STATS,
      },
    };
  },

  async updateProfile(data: any) {
    await mockDelay("MEDIUM");
    return {
      success: true,
      data: {
        ...MOCK_USERS[0],
        ...data,
      },
    };
  },

  async getUserStats() {
    await mockDelay("SHORT");
    return {
      success: true,
      data: MOCK_USER_STATS,
    };
  },
};

export const mockHistoryService = {
  async getHistory(params?: any) {
    await mockDelay("MEDIUM");
    return {
      success: true,
      data: {
        transactions: MOCK_ACTIVITY,
        summary: {
          totalTransactions: MOCK_ACTIVITY.length,
          totalVolume: "621.67",
          averageTransaction: "155.42"
        },
        pagination: {
          page: 1,
          limit: 10,
          total: MOCK_ACTIVITY.length,
          totalPages: 1
        }
      }
    };
  },
};
