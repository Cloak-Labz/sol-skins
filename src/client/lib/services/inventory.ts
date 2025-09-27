import { apiClient } from './api';
import { 
  UserSkin, 
  InventorySummary, 
  InventoryFilters, 
  BuybackRequest 
} from '../types/api';

class InventoryService {
  // Get user inventory
  async getInventory(filters?: InventoryFilters): Promise<{
    skins: UserSkin[];
    summary: InventorySummary;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const params = new URLSearchParams();
    
    if (filters?.search) params.append('search', filters.search);
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.filterBy) params.append('filterBy', filters.filterBy);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const url = queryString ? `/inventory?${queryString}` : '/inventory';
    
    return apiClient.get(url);
  }

  // Get inventory value
  async getInventoryValue(): Promise<{
    totalValue: number;
    totalItems: number;
    rarityBreakdown: {
      [key: string]: number;
    };
  }> {
    return apiClient.get('/inventory/value');
  }

  // Get specific skin details
  async getSkinDetails(skinId: string): Promise<UserSkin> {
    return apiClient.get(`/inventory/${skinId}`);
  }

  // Sell skin via buyback
  async sellSkin(skinId: string, request?: BuybackRequest): Promise<{
    soldSkin: {
      id: string;
      weapon: string;
      skinName: string;
      originalPrice: number;
      buybackPrice: number;
      buybackPercentage: number;
    };
    transaction: {
      id: string;
      amountUsdc: number;
      txHash: string;
      status: string;
    };
  }> {
    return apiClient.post(`/inventory/${skinId}/buyback`, request);
  }
}

export const inventoryService = new InventoryService();
export default inventoryService;
