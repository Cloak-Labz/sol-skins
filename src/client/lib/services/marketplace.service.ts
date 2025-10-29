import { apiClient } from './api.service'
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

    const data = await apiClient.get<LootBoxType[]>(`/marketplace/loot-boxes?${params.toString()}`)

    // apiClient.get returns the inner data directly, so wrap it in the expected format
    return { success: true, data }
  }

  async getLootBoxById(id: string): Promise<{
    success: boolean
    data: LootBoxTypeDetails
  }> {
    const data = await apiClient.get<LootBoxTypeDetails>(`/marketplace/loot-boxes/${id}`)

    // apiClient.get returns the inner data directly, so wrap it in the expected format
    return { success: true, data }
  }

  async getFeaturedLootBoxes(): Promise<LootBoxType[]> {
    // apiClient.get returns the inner data directly (the array)
    return apiClient.get<LootBoxType[]>('/marketplace/loot-boxes?filterBy=featured&limit=6')
  }
}

export const marketplaceService = new MarketplaceService()
