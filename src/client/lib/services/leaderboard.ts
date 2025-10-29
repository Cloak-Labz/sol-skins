import { apiClient } from "./api";
import { LeaderboardEntry, UserRank, LeaderboardFilters } from "../types/api";
// Mocks removed for production build

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
    // Always call API (mocks removed)
    const params = new URLSearchParams();

    if (filters?.period) params.append("period", filters.period);
    if (filters?.metric) params.append("metric", filters.metric);
    if (filters?.limit) params.append("limit", filters.limit.toString());
    if (filters?.page) params.append("page", filters.page.toString());

    const queryString = params.toString();
    const url = queryString ? `/leaderboard?${queryString}` : "/leaderboard";

    const response = await apiClient.get<LeaderboardEntry[]>(url);
    return { success: true, data: response };
  }

  // Get user's current rank
  async getUserRank(metric?: string): Promise<UserRank> {
    // Always call API (mocks removed)
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
    // Always call API (mocks removed)
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
