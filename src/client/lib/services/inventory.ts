import { apiClient } from './api';
import {
  UserSkin,
  InventorySummary,
  InventoryFilters,
  BuybackRequest
} from '../types/api';
import { MOCK_CONFIG } from '../config/mock';
import { mockInventoryService } from '../mocks/services';

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
    if (MOCK_CONFIG.ENABLE_MOCK) {
      return mockInventoryService.getInventory(filters);
    }

    const params = new URLSearchParams();
    
    if (filters?.search) params.append('search', filters.search);
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.filterBy) params.append('filterBy', filters.filterBy);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const url = queryString ? `/inventory?${queryString}` : '/inventory';
    
    const response = await apiClient.get(url);
    console.log('InventoryService: Received response:', response);
    console.log('InventoryService: Response type:', typeof response);
    console.log('InventoryService: Full response structure:', JSON.stringify(response, null, 2));
    
    // Check if response is already the data object (from interceptor) or if it's the full response
    if (response && !response.success && !response.data) {
      console.log('InventoryService: Response is already the data object, returning directly');
      return response;
    }
    
    return response.data;
  }

  // Get inventory value
  async getInventoryValue(): Promise<{
    totalValue: number;
    totalItems: number;
    rarityBreakdown: {
      [key: string]: number;
    };
  }> {
    if (MOCK_CONFIG.ENABLE_MOCK) {
      return mockInventoryService.getInventoryValue();
    }

    const response = await apiClient.get('/inventory/stats');
    
    // Check if response is already the data object (from interceptor) or if it's the full response
    if (response && !response.success && !response.data) {
      console.log('InventoryService: Response is already the data object, returning directly');
      return response;
    }
    
    return response.data;
  }

  // Get specific skin details
  async getSkinDetails(skinId: string): Promise<UserSkin> {
    const response = await apiClient.get(`/inventory/${skinId}`);
    
    // Check if response is already the data object (from interceptor) or if it's the full response
    if (response && !response.success && !response.data) {
      console.log('InventoryService: Response is already the data object, returning directly');
      return response;
    }
    
    return response.data;
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
    if (MOCK_CONFIG.ENABLE_MOCK) {
      return mockInventoryService.sellSkin(skinId, request);
    }

    const response = await apiClient.post(`/inventory/${skinId}/buyback`, request);
    
    // Check if response is already the data object (from interceptor) or if it's the full response
    if (response && !response.success && !response.data) {
      console.log('InventoryService: Response is already the data object, returning directly');
      return response;
    }
    
    return response.data;
  }
}

export const inventoryService = new InventoryService();
export default inventoryService;
