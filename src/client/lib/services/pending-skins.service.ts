import { apiClient } from './api';

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
      console.log('💾 Creating pending skin via API:', data.skinName);
      const response = await apiClient.post('/pending-skins', data);
      console.log('🔍 Full API response:', response);
      console.log('🔍 Response type:', typeof response);
      console.log('🔍 Response keys:', Object.keys(response || {}));
      
      // The API client returns the extracted data directly: { pendingSkin: {...} }
      const apiResponse = response as any;
      console.log('🔍 API response structure:', apiResponse);
      if (apiResponse.pendingSkin) {
        console.log('✅ Pending skin created successfully:', apiResponse.pendingSkin.id);
        return apiResponse.pendingSkin;
      }
      
      throw new Error('Invalid API response structure');
    } catch (error) {
      console.error('❌ Failed to create pending skin:', error);
      throw error;
    }
  }

  async getUserPendingSkins(userId: string): Promise<PendingSkin[]> {
    try {
      console.log('📦 Fetching user pending skins for:', userId);
      const response = await apiClient.get(`/pending-skins/user/${userId}`);
      const apiResponse = response as any;
      if (apiResponse.pendingSkins) {
        console.log(`✅ Found ${apiResponse.pendingSkins.length} pending skins`);
        return apiResponse.pendingSkins;
      }
      return [];
    } catch (error) {
      console.error('❌ Failed to fetch user pending skins:', error);
      throw error;
    }
  }

  async claimPendingSkin(pendingSkinId: string, userId: string): Promise<PendingSkin> {
    try {
      console.log('🎫 Claiming pending skin:', pendingSkinId);
      const response = await apiClient.post(`/pending-skins/${pendingSkinId}/claim`, { userId });
      const apiResponse = response as any;
      if (apiResponse.claimedSkin) {
        console.log('✅ Pending skin claimed successfully:', apiResponse.claimedSkin.id);
        return apiResponse.claimedSkin;
      }
      throw new Error('Invalid API response structure');
    } catch (error) {
      console.error('❌ Failed to claim pending skin:', error);
      throw error;
    }
  }

  async getPendingSkinById(id: string): Promise<PendingSkin> {
    try {
      console.log('🔍 Fetching pending skin by ID:', id);
      const response = await apiClient.get(`/pending-skins/${id}`);
      const apiResponse = response as any;
      if (apiResponse.pendingSkin) {
        console.log('✅ Pending skin fetched successfully');
        return apiResponse.pendingSkin;
      }
      throw new Error('Invalid API response structure');
    } catch (error) {
      console.error('❌ Failed to fetch pending skin:', error);
      throw error;
    }
  }
}

export const pendingSkinsService = new PendingSkinsService();
