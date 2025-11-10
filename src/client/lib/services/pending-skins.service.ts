import { apiClient } from './api.service';

export interface PendingSkin {
  id: string;
  userId: string;
  skinName: string;
  skinRarity: string;
  skinWeapon: string;
  skinValue: number;
  skinImage: string;
  nftMintAddress?: string;
  transactionHash?: string;
  caseOpeningId?: string;
  status: 'pending' | 'claimed' | 'expired';
  claimedAt?: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePendingSkinRequest {
  userId: string;
  skinName: string;
  skinRarity: string;
  skinWeapon: string;
  skinValue: number;
  skinImage: string;
  nftMintAddress?: string;
  transactionHash?: string;
  caseOpeningId?: string;
}

export class PendingSkinsService {
  async createPendingSkin(data: CreatePendingSkinRequest): Promise<PendingSkin> {
    return apiClient.post<PendingSkin>('/pending-skins', data);
  }

  async getUserPendingSkins(userId: string): Promise<PendingSkin[]> {
    return apiClient.get<PendingSkin[]>(`/pending-skins/user/${userId}`);
  }

  async claimPendingSkin(pendingSkinId: string, walletAddress?: string, tradeUrl?: string): Promise<PendingSkin> {
    return apiClient.post<PendingSkin>(`/pending-skins/${pendingSkinId}/claim`, { walletAddress, tradeUrl });
  }

  async deletePendingSkin(id: string): Promise<void> {
    await apiClient.delete(`/pending-skins/${id}`);
  }

  async getPendingSkinById(id: string): Promise<PendingSkin> {
    return apiClient.get<PendingSkin>(`/pending-skins/${id}`);
  }

  async createSkinClaimedActivity(data: {
    walletAddress: string;
    skinName?: string;
    skinRarity?: string;
    skinWeapon?: string;
    nftMintAddress: string;
  }): Promise<void> {
    await apiClient.post('/pending-skins/claim-activity', data);
  }
}

export const pendingSkinsService = new PendingSkinsService();
