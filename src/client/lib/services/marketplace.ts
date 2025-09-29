import { apiClient } from './api'
import { LootBoxType, LootBoxTypeDetails, LootBoxFilters } from '../types/api'

export class MarketplaceService {
  async getLootBoxes(filters: LootBoxFilters = {}): Promise<{
    success: boolean
    data: LootBoxType[]
    pagination?: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }> {
    const params = new URLSearchParams()
    
    if (filters.search) params.append('search', filters.search)
    if (filters.sortBy) params.append('sortBy', filters.sortBy)
    if (filters.filterBy) params.append('filterBy', filters.filterBy)
    if (filters.page) params.append('page', filters.page.toString())
    if (filters.limit) params.append('limit', filters.limit.toString())

    const response = await apiClient.get(`/marketplace/loot-boxes?${params.toString()}`)
    console.log('MarketplaceService: Received response:', response);
    console.log('MarketplaceService: Response type:', typeof response);
    console.log('MarketplaceService: Full response structure:', JSON.stringify(response, null, 2));
    
    // Check if response is already the data array (from interceptor) or if it's the full response
    if (Array.isArray(response)) {
      console.log('MarketplaceService: Response is already an array, returning directly');
      return { success: true, data: response };
    }
    
    // The API client returns the full Axios response, so we need to access response.data
    // which contains the {success: true, data: [...]} structure
    return response.data
  }

  async getLootBoxById(id: string): Promise<{
    success: boolean
    data: LootBoxTypeDetails
  }> {
    const response = await apiClient.get(`/marketplace/loot-boxes/${id}`)
    
    // Check if response is already the data object (from interceptor) or if it's the full response
    if (response && !response.success && !response.data) {
      console.log('MarketplaceService: Response is already the data object, wrapping it');
      return { success: true, data: response };
    }
    
    return response.data
  }

  async getFeaturedLootBoxes(): Promise<LootBoxType[]> {
    const response = await apiClient.get('/marketplace/loot-boxes?filterBy=featured&limit=6')
    
    // Check if response is already the data array (from interceptor) or if it's the full response
    if (Array.isArray(response)) {
      console.log('MarketplaceService: Response is already an array, returning directly');
      return response;
    }
    
    return response.data.data || []
  }
}

export const marketplaceService = new MarketplaceService()
