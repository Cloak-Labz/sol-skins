import { apiClient } from "./api";
import { LeaderboardEntry, UserRank, LeaderboardFilters } from "../types/api";
import { MOCK_CONFIG } from "../config/mock";
import { mockLeaderboardService } from "../mocks/services";

class LeaderboardService {
  // Get leaderboard rankings
  async getLeaderboard(filters?: LeaderboardFilters): Promise<{
    success: boolean;
    data: LeaderboardEntry[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    if (MOCK_CONFIG.ENABLE_MOCK) {
      return mockLeaderboardService.getLeaderboard(filters);
    }
    const params = new URLSearchParams();

    if (filters?.period) params.append("period", filters.period);
    if (filters?.metric) params.append("metric", filters.metric);
    if (filters?.limit) params.append("limit", filters.limit.toString());
    if (filters?.page) params.append("page", filters.page.toString());

    const queryString = params.toString();
    const url = queryString ? `/leaderboard?${queryString}` : "/leaderboard";

    const response = await apiClient.get<LeaderboardEntry[]>(url);
    
    // apiClient.get already unwraps the response and returns just the data array
    return { success: true, data: response };
  }

  // Get user's current rank
  async getUserRank(metric?: string): Promise<UserRank> {
    if (MOCK_CONFIG.ENABLE_MOCK) {
      return {
        rank: 1,
        metric: metric || 'inventoryValue',
        value: '1250.75',
        totalUsers: 5000
      };
    }
    const params = new URLSearchParams();
    if (metric) params.append("metric", metric);

    const queryString = params.toString();
    const url = queryString
      ? `/leaderboard/rank?${queryString}`
      : "/leaderboard/rank";

    const response = await apiClient.get<UserRank>(url);
    return response;
  }

  // Get leaderboard statistics
  async getLeaderboardStats(): Promise<{
    totalUsers: number;
    totalValue: number;
    averageValue: number;
    topRarity: string;
  }> {
    if (MOCK_CONFIG.ENABLE_MOCK) {
      return {
        totalUsers: 5000,
        totalValue: 125_000_000,
        averageValue: 25_000,
        topRarity: "Legendary",
      };
    }
    const response = await apiClient.get<{
      totalUsers: number;
      totalValue: number;
      averageValue: number;
      topRarity: string;
    }>("/leaderboard/stats");
    return response;
  }
}

export const leaderboardService = new LeaderboardService();
export default leaderboardService;
