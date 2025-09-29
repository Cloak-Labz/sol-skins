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
    
    const response = await apiClient.get(url);
    console.log('SocialService: Received response:', response);
    console.log('SocialService: Response type:', typeof response);
    console.log('SocialService: Full response structure:', JSON.stringify(response, null, 2));
    
    // Check if response is already the data array (from interceptor) or if it's the full response
    if (Array.isArray(response)) {
      console.log('SocialService: Response is already an array, returning directly');
      return response;
    }
    
    return response.data;
  }

  // Get user's rank
  async getUserRank(metric?: string): Promise<UserRank> {
    const params = new URLSearchParams();
    if (metric) params.append('metric', metric);
    
    const queryString = params.toString();
    const url = queryString ? `/leaderboard/rank?${queryString}` : '/leaderboard/rank';
    
    const response = await apiClient.get(url);
    
    // Check if response is already the data object (from interceptor) or if it's the full response
    if (response && !response.success && !response.data) {
      console.log('SocialService: Response is already the data object, returning directly');
      return response;
    }
    
    return response.data;
  }

  // Get recent activity
  async getRecentActivity(limit?: number): Promise<ActivityItem[]> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    
    const queryString = params.toString();
    const url = queryString ? `/activity/recent?${queryString}` : '/activity/recent';
    
    const response = await apiClient.get(url);
    
    // Check if response is already the data array (from interceptor) or if it's the full response
    if (Array.isArray(response)) {
      console.log('SocialService: Response is already an array, returning directly');
      return response;
    }
    
    return response.data;
  }

  // Get activity stats
  async getActivityStats(): Promise<{
    totalActivities: number;
    recentCaseOpenings: number;
    recentBuybacks: number;
    topUsers: string[];
  }> {
    const response = await apiClient.get('/activity/stats');
    
    // Check if response is already the data object (from interceptor) or if it's the full response
    if (response && !response.success && !response.data) {
      console.log('SocialService: Response is already the data object, returning directly');
      return response;
    }
    
    return response.data;
  }
}

export const socialService = new SocialService();
export default socialService;
