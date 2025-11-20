import { apiClient } from './api.service';

export interface Box {
  id: string;
  batchId: number;
  candyMachine: string;
  collectionMint: string;
  name: string;
  description?: string;
  imageUrl: string;
  priceSol: number;
  priceUsdc: number;
  priceUsd?: number;
  solPriceUsd?: number;
  totalItems: number;
  itemsAvailable: number;
  itemsOpened: number;
  merkleRoot: string;
  metadataUris: string[];
  snapshotTime: number;
  status: 'active' | 'paused' | 'sold_out' | 'ended';
  createTx?: string;
  updateTx?: string;
  isSynced: boolean;
  lastSyncedAt?: string;
  syncError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BoxStats {
  total: number;
  active: number;
  paused: number;
  soldOut: number;
  ended: number;
  synced: number;
  unsynced: number;
}

class BoxesService {
  private baseUrl = '/boxes';

  async getAllBoxes(): Promise<Box[]> {
    const response = await apiClient.get<Box[]>(this.baseUrl);
    return response ?? [];
  }

  async getActiveBoxes(): Promise<Box[]> {
    const response = await apiClient.get<Box[]>(`${this.baseUrl}/active`);
    return response ?? [];
  }

  async getBoxById(id: string): Promise<Box> {
    const response = await apiClient.get<Box>(`${this.baseUrl}/${id}`);
    return response;
  }

  async getBoxByBatchId(batchId: number): Promise<Box> {
    const response = await apiClient.get<Box>(`${this.baseUrl}/batch/${batchId}`);
    return response;
  }

  async createBox(data: Partial<Box>): Promise<Box> {
    const response = await apiClient.post<Box>(this.baseUrl, data);
    return response;
  }

  async updateBox(id: string, data: Partial<Box>): Promise<Box> {
    const response = await apiClient.put<Box>(`${this.baseUrl}/${id}`, data);
    return response;
  }

  async syncBox(batchId: number): Promise<Box> {
    const response = await apiClient.post<Box>(`${this.baseUrl}/${batchId}/sync`);
    return response;
  }

  async syncAllBoxes(): Promise<{ synced: number; failed: number; errors: string[] }> {
    const response = await apiClient.post<{ synced: number; failed: number; errors: string[] }>(
      `${this.baseUrl}/sync-all`
    );
    return response;
  }

  async deleteBox(id: string): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/${id}`);
  }

  async getBoxStats(): Promise<BoxStats> {
    const response = await apiClient.get<BoxStats>(`${this.baseUrl}/stats`);
    return response;
  }

  // Admin-only method - requires adminMiddleware on backend
  async getAllBoxesAdmin(): Promise<Box[]> {
    const response = await apiClient.get<Box[]>('/admin/packs');
    return response ?? [];
  }
}

export const boxesService = new BoxesService();
