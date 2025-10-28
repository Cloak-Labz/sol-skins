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

    const normalize = (p: any): PendingSkin => ({
      ...p,
      skinValue: typeof p.skinValue === 'string' ? parseFloat(p.skinValue) : p.skinValue,
    });

    return (data.data || []).map(normalize);
  }

  async getPendingSkinById(id: string): Promise<PendingSkin> {
    const response = await fetch(`${this.baseUrl}/pending-skins/${id}`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error?.message || "Failed to fetch pending skin");
    }

    const normalize = (p: any): PendingSkin => ({
      ...p,
      skinValue: typeof p.skinValue === 'string' ? parseFloat(p.skinValue) : p.skinValue,
    });
    return normalize(data.data);
  }

  async claimPendingSkin(id: string, walletAddress?: string, tradeUrl?: string): Promise<PendingSkin> {
    // Allow calling with either a plain ID (UUID) or an absolute URL that already points to a resource
    // This prevents accidental double-base URL concatenation when older localStorage entries store full URLs.
    const isAbsolute = /^https?:\/\//i.test(id);
    const url = isAbsolute
      ? (id.endsWith('/claim') ? id : `${id}/claim`)
      : `${this.baseUrl}/pending-skins/${id}/claim`;

    const response = await fetch(url, {
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

    const normalize = (p: any): PendingSkin => ({
      ...p,
      skinValue: typeof p.skinValue === 'string' ? parseFloat(p.skinValue) : p.skinValue,
    });
    return normalize(data.data);
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

    // Our backend returns { success, data }, but apiClient may unwrap it.
    const raw = (result && typeof result === 'object' && 'success' in result)
      ? (result.success ? result.data : null)
      : result;

    // Some middlewares log the inner object to console (what you saw), so ensure id exists.
    if (!raw || !raw.id) {
      throw new Error((result && result.error?.message) || 'Invalid API response structure');
    }

    const normalize = (p: any): PendingSkin => ({
      ...p,
      skinValue: typeof p.skinValue === 'string' ? parseFloat(p.skinValue) : p.skinValue,
    });
    return normalize(raw);
  }
}

export const pendingSkinsService = new PendingSkinsService();
