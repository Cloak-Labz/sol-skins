import { apiClient } from "./api.service";
import type { ActivityItem } from "../types/api";

class ActivityService {
  async getRecent(limit: number = 12): Promise<ActivityItem[]> {
    return apiClient.get<ActivityItem[]>(`/activity/recent?limit=${limit}`);
  }
}

export const activityService = new ActivityService();
export default activityService;
