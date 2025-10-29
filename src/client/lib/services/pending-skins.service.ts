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
    try {
      const response = await apiClient.post('/pending-skins', data);
      const apiResponse = response as any;
      
      // Handle both wrapped and unwrapped responses
      if (apiResponse.pendingSkin) {
        return apiResponse.pendingSkin;
      } else if (apiResponse.id) {
        // Direct response without wrapping
        return apiResponse;
      }
      
      throw new Error('Invalid API response structure');
    } catch (error) {
      throw error;
    }
  }

  async getUserPendingSkins(userId: string): Promise<PendingSkin[]> {
    try {
      const response = await apiClient.get(`/pending-skins/user/${userId}`);
      const apiResponse = response as any;
      if (apiResponse.pendingSkins) {
        return apiResponse.pendingSkins;
      }
      return [];
    } catch (error) {
      throw error;
    }
  }

  async claimPendingSkin(pendingSkinId: string, userId: string): Promise<PendingSkin> {
    try {
      const response = await apiClient.post(`/pending-skins/${pendingSkinId}/claim`, { userId });
      const apiResponse = response as any;
      if (apiResponse.claimedSkin) {
        return apiResponse.claimedSkin;
      }
      throw new Error('Invalid API response structure');
    } catch (error) {
      throw error;
    }
  }

  async getPendingSkinById(id: string): Promise<PendingSkin> {
    try {
      const response = await apiClient.get(`/pending-skins/${id}`);
      const apiResponse = response as any;
      if (apiResponse.pendingSkin) {
        return apiResponse.pendingSkin;
      }
      throw new Error('Invalid API response structure');
    } catch (error) {
      throw error;
    }
  }

  async createSkinClaimedActivity(data: {
    userId: string;
    skinName: string;
    skinRarity: string;
    skinWeapon: string;
    nftMintAddress: string;
  }): Promise<void> {
    try {
      const response = await apiClient.post('/pending-skins/claim-activity', data);
    } catch (error) {
      throw error;
    }
  }
}

export const pendingSkinsService = new PendingSkinsService();
