import { apiClient } from './api.service';

export interface SkinListing {
  id: string
  skinName: string
  weapon: string
  skinDisplayName: string
  condition: string
  rarity: string
  price: number
  priceSol: number | null
  seller: string
  sellerAddress: string
  imageUrl?: string
  listedAt: string
  userSkinId: string
}

export interface ListSkinRequest {
  userSkinId: string
  priceUsd: number
}

class SkinMarketplaceService {
  // Get all listings
  async getListings(filters?: {
    search?: string
    sortBy?: 'newest' | 'price-low' | 'price-high'
    filterBy?: string
    limit?: number
  }): Promise<SkinListing[]> {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.filterBy) params.append('filterBy', filters.filterBy);
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const url = queryString ? `/skin-marketplace?${queryString}` : '/skin-marketplace';

    const listings = await apiClient.get<SkinListing[]>(url);
    return listings;
  }

  // List a skin for sale
  async listSkin(userSkinId: string, priceUsd: number): Promise<any> {
    const response = await apiClient.post('/skin-marketplace/list', {
      userSkinId,
      priceUsd,
    });
    return response;
  }

  // Buy a skin
  async buySkin(listingId: string): Promise<any> {
    const response = await apiClient.post(`/skin-marketplace/buy/${listingId}`, {});
    return response;
  }

  // Cancel a listing
  async cancelListing(listingId: string): Promise<any> {
    const response = await apiClient.delete(`/skin-marketplace/cancel/${listingId}`);
    return response;
  }

  // Get my listings
  async getMyListings(): Promise<SkinListing[]> {
    const listings = await apiClient.get<SkinListing[]>('/skin-marketplace/my-listings');
    return listings;
  }
}

export const skinMarketplaceService = new SkinMarketplaceService();
export default skinMarketplaceService;

