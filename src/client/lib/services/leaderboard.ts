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

    console.log("LeaderboardService: Making request to:", url);
    const response = await apiClient.get(url);
    console.log("LeaderboardService: Received response:", response);
    console.log("LeaderboardService: Response type:", typeof response);
    console.log(
      "LeaderboardService: Response success:",
      response?.data?.success
    );
    console.log("LeaderboardService: Response data:", response?.data?.data);
    console.log(
      "LeaderboardService: Full response structure:",
      JSON.stringify(response, null, 2)
    );

    // Check if response is already the data array (from interceptor) or if it's the full response
    if (Array.isArray(response)) {
      console.log(
        "LeaderboardService: Response is already an array, returning directly"
      );
      return { success: true, data: response };
    }

    // The API client returns the full Axios response, so we need to access response.data
    // which contains the {success: true, data: [...]} structure
    return response.data;
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
