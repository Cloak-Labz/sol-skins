import { apiClient } from "./api.service";
import { UserSkin, InventorySummary, BuybackRequest } from "../types/api";
type InventoryFilters = {
  search?: string;
  sortBy?: string;
  filterBy?: string;
  page?: number;
  limit?: number;
};
// Mocks removed for production build

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
    // Always call API (mocks removed)

    const params = new URLSearchParams();

    if (filters?.search) params.append("search", filters.search);
    if (filters?.sortBy) params.append("sortBy", filters.sortBy);
    if (filters?.filterBy) params.append("filterBy", filters.filterBy);
    if (filters?.page) params.append("page", filters.page.toString());
    if (filters?.limit) params.append("limit", filters.limit.toString());

    const queryString = params.toString();
    const url = queryString ? `/inventory?${queryString}` : "/inventory";

    const response = await apiClient.get<{
      skins: UserSkin[];
      summary: InventorySummary;
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(url);
    return response;
  }

  // Get inventory value
  async getInventoryValue(): Promise<{
    totalValue: number;
    totalItems: number;
    rarityBreakdown: {
      [key: string]: number;
    };
  }> {
    // Always call API (mocks removed)

    const response = await apiClient.get<{
      totalValue: number;
      totalItems: number;
      rarityBreakdown: { [key: string]: number };
    }>("/inventory/value");
    return response;
  }

  // Get specific skin details
  async getSkinDetails(skinId: string): Promise<UserSkin> {
    const response = await apiClient.get<UserSkin>(`/inventory/${skinId}`);
    return response;
  }

  // Sell skin via buyback
  async sellSkin(
    skinId: string,
    request?: BuybackRequest
  ): Promise<{
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
    // Always call API (mocks removed)

    const response = await apiClient.post<{
      soldSkin: {
        id: string; weapon: string; skinName: string; originalPrice: number; buybackPrice: number; buybackPercentage: number;
      };
      transaction: { id: string; amountUsdc: number; txHash: string; status: string };
    }>(
      `/inventory/${skinId}/buyback`,
      request
    );
    return response;
  }
}

export const inventoryService = new InventoryService();
export default inventoryService;
