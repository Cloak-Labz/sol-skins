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
    return response.data
  }

  async getLootBoxById(id: string): Promise<{
    success: boolean
    data: LootBoxTypeDetails
  }> {
    const response = await apiClient.get(`/marketplace/loot-boxes/${id}`)
    return response.data
  }

  async getFeaturedLootBoxes(): Promise<LootBoxType[]> {
    const response = await apiClient.get('/marketplace/loot-boxes?filterBy=featured&limit=6')
    return response.data.data || []
  }
}

export const marketplaceService = new MarketplaceService()
