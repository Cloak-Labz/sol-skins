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
  claimedAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export class PendingSkinsService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
  }

  async getPendingSkinsByUserId(userId: string): Promise<PendingSkin[]> {
    const response = await fetch(`${this.baseUrl}/pending-skins/user/${userId}`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error?.message || "Failed to fetch pending skins");
    }

    return data.data;
  }

  async getPendingSkinById(id: string): Promise<PendingSkin> {
    const response = await fetch(`${this.baseUrl}/pending-skins/${id}`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error?.message || "Failed to fetch pending skin");
    }

    return data.data;
  }

  async claimPendingSkin(id: string, walletAddress?: string, tradeUrl?: string): Promise<PendingSkin> {
    const response = await fetch(`${this.baseUrl}/pending-skins/${id}/claim`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        walletAddress,
        tradeUrl,
      }),
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error?.message || "Failed to claim pending skin");
    }

    return data.data;
  }

  async deletePendingSkin(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/pending-skins/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error?.message || "Failed to delete pending skin");
    }
  }

  async createPendingSkin(data: {
    userId: string;
    skinName: string;
    skinRarity: string;
    skinWeapon: string;
    skinValue: number;
    skinImage?: string;
    nftMintAddress?: string;
    transactionHash?: string;
    caseOpeningId?: string;
    expiresAt?: string;
  }): Promise<PendingSkin> {
    const response = await fetch(`${this.baseUrl}/pending-skins`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error?.message || "Failed to create pending skin");
    }

    return result.data;
  }
}

export const pendingSkinsService = new PendingSkinsService();
