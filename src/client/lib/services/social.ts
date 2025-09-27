import { apiClient } from './api';
import { 
  LeaderboardEntry, 
  UserRank, 
  ActivityItem, 
  LeaderboardFilters 
} from '../types/api';

class SocialService {
  // Get leaderboard
  async getLeaderboard(filters?: LeaderboardFilters): Promise<LeaderboardEntry[]> {
    const params = new URLSearchParams();
    
    if (filters?.period) params.append('period', filters.period);
    if (filters?.metric) params.append('metric', filters.metric);
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const url = queryString ? `/leaderboard?${queryString}` : '/leaderboard';
    
    return apiClient.get(url);
  }

  // Get user's rank
  async getUserRank(metric?: string): Promise<UserRank> {
    const params = new URLSearchParams();
    if (metric) params.append('metric', metric);
    
    const queryString = params.toString();
    const url = queryString ? `/leaderboard/rank?${queryString}` : '/leaderboard/rank';
    
    return apiClient.get(url);
  }

  // Get recent activity
  async getRecentActivity(limit?: number): Promise<ActivityItem[]> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    
    const queryString = params.toString();
    const url = queryString ? `/activity/recent?${queryString}` : '/activity/recent';
    
    return apiClient.get(url);
  }

  // Get activity stats
  async getActivityStats(): Promise<{
    totalActivities: number;
    recentCaseOpenings: number;
    recentBuybacks: number;
    topUsers: string[];
  }> {
    return apiClient.get('/activity/stats');
  }
}

export const socialService = new SocialService();
export default socialService;
