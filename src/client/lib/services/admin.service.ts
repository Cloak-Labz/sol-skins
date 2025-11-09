import { apiClient } from './api.service';

export interface User {
  id: string;
  walletAddress: string;
  username?: string;
  email?: string;
  tradeUrl?: string;
  isActive: boolean;
  totalSpent: number;
  totalEarned: number;
  casesOpened: number;
  inventoryValue: number;
  inventoryCount?: number;
  waitingTransferCount?: number;
  netProfit?: number;
  createdAt: string;
  lastLogin?: string;
  transactionSummary?: any;
}

export interface UserSkin {
  id: string;
  nftMintAddress: string;
  name?: string;
  imageUrl?: string;
  currentPriceUsd?: number;
  isInInventory: boolean;
  isWaitingTransfer: boolean;
  soldViaBuyback: boolean;
  openedAt?: string;
  createdAt: string;
  skinTemplate?: {
    id: string;
    weapon: string;
    skinName: string;
    rarity: string;
  };
  user?: {
    id: string;
    walletAddress: string;
    username?: string;
    tradeUrl?: string;
  };
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

class AdminService {
  private baseUrl = '/admin';

  // Get users list with pagination
  async getUsers(options?: {
    page?: number;
    limit?: number;
    sortBy?: 'createdAt' | 'totalSpent' | 'totalEarned' | 'casesOpened';
    order?: 'ASC' | 'DESC';
  }): Promise<{
    users: User[];
    pagination: Pagination;
  }> {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.sortBy) params.append('sortBy', options.sortBy);
    if (options?.order) params.append('order', options.order);

    const queryString = params.toString();
    const url = queryString ? `${this.baseUrl}/users?${queryString}` : `${this.baseUrl}/users`;
    
    const response = await apiClient.get<{
      users: User[];
      pagination: Pagination;
    }>(url);
    return response;
  }

  // Get user details
  async getUser(userId: string): Promise<User> {
    return apiClient.get<User>(`${this.baseUrl}/users/${userId}`);
  }

  // Get user inventory
  async getUserInventory(
    userId: string,
    options?: {
      page?: number;
      limit?: number;
      filterBy?: 'inventory' | 'waiting-transfer' | 'sold' | 'claimed';
      search?: string;
      sortBy?: 'openedAt' | 'price' | 'name' | 'createdAt';
      order?: 'ASC' | 'DESC';
    }
  ): Promise<{
    skins: UserSkin[];
    pagination: Pagination;
  }> {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.filterBy) params.append('filterBy', options.filterBy);
    if (options?.search) params.append('search', options.search);
    if (options?.sortBy) params.append('sortBy', options.sortBy);
    if (options?.order) params.append('order', options.order);

    const queryString = params.toString();
    const url = queryString 
      ? `${this.baseUrl}/users/${userId}/inventory?${queryString}`
      : `${this.baseUrl}/users/${userId}/inventory`;
    
    const response = await apiClient.get<{
      skins: UserSkin[];
      pagination: Pagination;
    }>(url);
    return response;
  }

  // Get skins waiting for transfer
  async getSkinsWaitingTransfer(options?: {
    page?: number;
    limit?: number;
  }): Promise<{
    skins: UserSkin[];
    pagination: Pagination;
  }> {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());

    const queryString = params.toString();
    const url = queryString 
      ? `${this.baseUrl}/skins/waiting-transfer?${queryString}`
      : `${this.baseUrl}/skins/waiting-transfer`;
    
    const response = await apiClient.get<{
      skins: UserSkin[];
      pagination: Pagination;
    }>(url);
    return response;
  }

  // Update skin status
  async updateSkinStatus(
    skinId: string,
    updates: {
      isWaitingTransfer?: boolean;
      isInInventory?: boolean;
      soldViaBuyback?: boolean;
    }
  ): Promise<UserSkin> {
    return apiClient.patch<UserSkin>(`${this.baseUrl}/skins/${skinId}/status`, updates);
  }

  // Analytics methods
  async getAnalytics(days: number = 30): Promise<AnalyticsData> {
    const params = new URLSearchParams();
    params.append('days', days.toString());
    return apiClient.get<AnalyticsData>(`${this.baseUrl}/analytics?${params.toString()}`);
  }

  async getCaseOpeningsTimeSeries(days: number = 30): Promise<TimeSeriesData[]> {
    const params = new URLSearchParams();
    params.append('days', days.toString());
    return apiClient.get<TimeSeriesData[]>(`${this.baseUrl}/analytics/case-openings?${params.toString()}`);
  }

  async getBuybacksTimeSeries(days: number = 30): Promise<BuybackTimeSeriesData[]> {
    const params = new URLSearchParams();
    params.append('days', days.toString());
    return apiClient.get<BuybackTimeSeriesData[]>(`${this.baseUrl}/analytics/buybacks?${params.toString()}`);
  }

  async getTransfersTimeSeries(days: number = 30): Promise<TimeSeriesData[]> {
    const params = new URLSearchParams();
    params.append('days', days.toString());
    return apiClient.get<TimeSeriesData[]>(`${this.baseUrl}/analytics/transfers?${params.toString()}`);
  }
}

export interface TimeSeriesData {
  date: string;
  count: number;
}

export interface BuybackTimeSeriesData {
  date: string;
  count: number;
  totalAmount: number;
}

export interface AnalyticsData {
  timeSeries: {
    caseOpenings: TimeSeriesData[];
    buybacks: BuybackTimeSeriesData[];
    transfers: TimeSeriesData[];
  };
  overview: {
    users: {
      total: number;
      active30d: number;
      active7d: number;
    };
    revenue: {
      totalSol: number;
      totalUsd: number;
      last30dSol: number;
      last30dUsd: number;
    };
    cases: {
      totalOpened: number;
      last30d: number;
      last7d: number;
    };
    inventory: {
      totalNfts: number;
      totalValueUsd: number;
      buybacksSold: number;
      totalTransfers: number;
      pendingTransfers: number;
    };
  };
  transactions: {
    totalSol: number;
    totalUsd: number;
    transactionCount: number;
    grossRevenueSol?: number;
    grossRevenueUsd?: number;
    buybackCostSol?: number;
    buybackCostUsd?: number;
  };
  caseOpenings: {
    totalOpened: number;
    successfulOpenings: number;
    pendingOpenings: number;
  };
}

export const adminService = new AdminService();

