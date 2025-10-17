import { apiClient } from './api';

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
    const response = await apiClient.get(this.baseUrl);
    return response || [];
  }

  async getActiveBoxes(): Promise<Box[]> {
    const response = await apiClient.get(`${this.baseUrl}/active`);
    return response || [];
  }

  async getBoxById(id: string): Promise<Box> {
    const response = await apiClient.get(`${this.baseUrl}/${id}`);
    return response;
  }

  async getBoxByBatchId(batchId: number): Promise<Box> {
    const response = await apiClient.get(`${this.baseUrl}/batch/${batchId}`);
    return response;
  }

  async createBox(data: Partial<Box>): Promise<Box> {
    const response = await apiClient.post(this.baseUrl, data);
    return response;
  }

  async updateBox(id: string, data: Partial<Box>): Promise<Box> {
    const response = await apiClient.put(`${this.baseUrl}/${id}`, data);
    return response;
  }

  async syncBox(batchId: number): Promise<Box> {
    const response = await apiClient.post(`${this.baseUrl}/${batchId}/sync`);
    return response;
  }

  async syncAllBoxes(): Promise<{ synced: number; failed: number; errors: string[] }> {
    const response = await apiClient.post(`${this.baseUrl}/sync-all`);
    return response;
  }

  async deleteBox(id: string): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/${id}`);
  }

  async getBoxStats(): Promise<BoxStats> {
    const response = await apiClient.get(`${this.baseUrl}/stats`);
    return response.data;
  }
}

export const boxesService = new BoxesService();
