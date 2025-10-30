import { apiClient } from './api.service';
import {
  LeaderboardEntry,
  UserRank,
  ActivityItem,
  LeaderboardFilters
} from '../types/api';
// Mocks removed for production build

class SocialService {
  // Get leaderboard
  async getLeaderboard(filters?: LeaderboardFilters): Promise<LeaderboardEntry[]> {
    // Always call API (mocks removed)

    const params = new URLSearchParams();
    
    if (filters?.period) params.append('period', filters.period);
    if (filters?.metric) params.append('metric', filters.metric);
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const url = queryString ? `/leaderboard?${queryString}` : '/leaderboard';
    
    const response = await apiClient.get<LeaderboardEntry[]>(url);
    return response;
  }

  // Get user's rank
  async getUserRank(metric?: string): Promise<UserRank> {
    const params = new URLSearchParams();
    if (metric) params.append('metric', metric);
    
    const queryString = params.toString();
    const url = queryString ? `/leaderboard/rank?${queryString}` : '/leaderboard/rank';
    
    const response = await apiClient.get<UserRank>(url);
    return response;
  }

  // Get recent activity
  async getRecentActivity(limit?: number): Promise<ActivityItem[]> {
    // Always call API (mocks removed)

    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());

    const queryString = params.toString();
    const url = queryString ? `/activity/recent?${queryString}` : '/activity/recent';

    // apiClient.get unwraps the response and returns just the data
    const activities = await apiClient.get<ActivityItem[]>(url);
    return activities;
  }

  // Get activity stats
  async getActivityStats(): Promise<{
    totalActivities: number;
    recentCaseOpenings: number;
    recentBuybacks: number;
    topUsers: string[];
  }> {
    const response = await apiClient.get<{
      totalActivities: number; recentCaseOpenings: number; recentBuybacks: number; topUsers: string[]
    }>(`/activity/stats`);
    return response;
  }
}

export const socialService = new SocialService();
export default socialService;
