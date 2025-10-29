import { apiClient } from './api';

export interface DiscordTicketData {
  userId: string;
  walletAddress: string;
  steamTradeUrl?: string;
  skinName: string;
  skinRarity: string;
  skinWeapon: string;
  nftMintAddress: string;
  openedAt: Date;
  caseOpeningId: string;
}

export class DiscordService {
  async createSkinClaimTicket(data: DiscordTicketData): Promise<void> {
    try {
      await apiClient.post('/discord/create-ticket', data);
    } catch (error) {
      // Don't throw - Discord failures shouldn't break skin claims
    }
  }
}

export const discordService = new DiscordService();
