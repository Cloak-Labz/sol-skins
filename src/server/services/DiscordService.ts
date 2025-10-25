import axios from 'axios';

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
  transactionHash?: string;
}

export class DiscordService {
  private botToken: string;
  private channelId: string;
  private guildId: string;

  constructor() {
    this.botToken = process.env.DISCORD_BOT_TOKEN || '';
    this.channelId = process.env.DISCORD_TICKET_CHANNEL_ID || '';
    this.guildId = process.env.DISCORD_GUILD_ID || '';
  }

  /**
   * Create a Discord ticket for a skin claim
   */
  async createSkinClaimTicket(data: DiscordTicketData): Promise<void> {
    console.log('🎫 DiscordService.createSkinClaimTicket called with:', {
      skinName: data.skinName,
      rarity: data.skinRarity,
      user: data.walletAddress,
      botToken: this.botToken ? 'SET' : 'NOT SET',
      channelId: this.channelId
    });

    if (!this.botToken || !this.channelId) {
      console.warn('Discord integration not configured - skipping ticket creation');
      return;
    }

    try {
      console.log('🔍 Creating Discord embed...');
      const embed = this.createTicketEmbed(data);
      console.log('✅ Discord embed created:', embed.title);
      
      console.log('📤 Sending Discord message to channel:', this.channelId);
      const response = await axios.post(
        `https://discord.com/api/v10/channels/${this.channelId}/messages`,
        {
          embeds: [embed],
          components: [
            {
              type: 1, // Action Row
              components: [
                {
                  type: 2, // Button
                  style: 3, // Success (Green)
                  label: '✅ Processed',
                  custom_id: `processed_${data.caseOpeningId}`,
                },
                {
                  type: 2, // Button
                  style: 4, // Danger (Red)
                  label: '❌ Issue',
                  custom_id: `issue_${data.caseOpeningId}`,
                },
                {
                  type: 2, // Button
                  style: 2, // Secondary (Gray)
                  label: '📋 View Details',
                  custom_id: `details_${data.caseOpeningId}`,
                }
              ]
            }
          ]
        },
        {
          headers: {
            'Authorization': `Bot ${this.botToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('✅ Discord message sent successfully! Response:', {
        status: response.status,
        messageId: response.data.id,
        channelId: response.data.channel_id
      });
      console.log(`Discord ticket created for skin claim: ${data.skinName}`);
    } catch (error: any) {
      console.error('❌ Failed to create Discord ticket:', error.message);
      console.error('❌ Full error:', error.response?.data || error);
      // Don't throw - we don't want Discord failures to break skin claims
    }
  }

  /**
   * Create a Discord embed for the ticket
   */
  private createTicketEmbed(data: DiscordTicketData) {
    const rarityColors = {
      'common': 0x808080,      // Gray
      'uncommon': 0x00ff00,    // Green
      'rare': 0x0080ff,        // Blue
      'epic': 0x8000ff,        // Purple
      'legendary': 0xffd700,   // Gold
      'mythic': 0xff4500,      // Orange
    };

    const color = rarityColors[data.skinRarity.toLowerCase() as keyof typeof rarityColors] || 0x808080;

    return {
      title: '🎁 New Skin Claim',
      description: `**${data.skinName}** has been claimed!`,
      color: color,
      fields: [
        {
          name: '👤 User',
          value: `Wallet: \`${data.walletAddress}\`\nUser ID: \`${data.userId}\``,
          inline: true
        },
        {
          name: '🔫 Skin Details',
          value: `**Weapon:** ${data.skinWeapon}\n**Rarity:** ${data.skinRarity}\n**Name:** ${data.skinName}`,
          inline: true
        },
        {
          name: '🔗 Links',
          value: data.steamTradeUrl 
            ? `[Steam Trade URL](${data.steamTradeUrl})`
            : 'No Steam trade URL provided',
          inline: false
        },
        {
          name: '⛓️ Blockchain',
          value: `**NFT Mint:** \`${data.nftMintAddress}\`\n**Opened:** <t:${Math.floor(new Date(data.openedAt).getTime() / 1000)}:R>`,
          inline: false
        }
      ],
      footer: {
        text: `Case Opening ID: ${data.caseOpeningId}`,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Update ticket status (processed/issue)
   */
  async updateTicketStatus(caseOpeningId: string, status: 'processed' | 'issue', adminId: string): Promise<void> {
    if (!this.botToken || !this.channelId) {
      return;
    }

    try {
      // This would require storing message IDs in the database
      // For now, we'll just log the status update
      console.log(`Ticket status updated for ${caseOpeningId}: ${status} by ${adminId}`);
    } catch (error) {
      console.error('Failed to update ticket status:', error);
    }
  }

  /**
   * Get user's Discord ID from wallet address (if linked)
   */
  async getUserDiscordId(walletAddress: string): Promise<string | null> {
    // This would require a user linking system
    // For now, return null
    return null;
  }
}

export const discordService = new DiscordService();
