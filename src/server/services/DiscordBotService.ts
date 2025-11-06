import { Client, GatewayIntentBits, TextChannel, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { config } from '../config/env';

interface DiscordTicketData {
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

class DiscordBotService {
  private client: Client;
  private isReady: boolean = false;

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });

    if (config.discord.botToken) {
      this.client.login(config.discord.botToken)
        .then(() => console.log('Discord bot logged in successfully!'))
        .catch(error => console.error('Failed to log in Discord bot:', error));

      this.client.on('ready', () => {
        console.log(`Discord bot logged in as ${this.client.user?.tag}!`);
        this.isReady = true;
      });

      // Handle button interactions
      this.client.on('interactionCreate', async interaction => {
        if (!interaction.isButton()) return;

        const [action, caseOpeningId] = interaction.customId.split('_');

        if (!caseOpeningId) {
          await interaction.reply({ content: 'Invalid ticket ID.', ephemeral: true });
          return;
        }

        console.log(`Discord button clicked: ${action} for case ${caseOpeningId} by ${interaction.user.tag}`);

        // Handle different button actions
        let responseMessage = '';
        let newColor: number | undefined;
        let isTicketClosed = false;

        switch (action) {
          case 'processed':
            responseMessage = `✅ Ticket #${caseOpeningId} marked as **Processed** by ${interaction.user.tag}`;
            newColor = 0x00ff00; // Green
            isTicketClosed = true;
            break;
          case 'issue':
            responseMessage = `❌ Ticket #${caseOpeningId} marked as **Issue** by ${interaction.user.tag}`;
            newColor = 0xff0000; // Red
            isTicketClosed = true;
            break;
          default:
            responseMessage = 'Unknown action.';
        }

        // Reply to the interaction
        await interaction.reply({ content: responseMessage, ephemeral: true });

        // If ticket is closed, disable all buttons and update embed
        if (isTicketClosed) {
          try {
            const originalEmbed = EmbedBuilder.from(interaction.message.embeds[0]);
            if (newColor !== undefined) {
              originalEmbed.setColor(newColor);
            }
            
            // Add closed status to embed
            originalEmbed.addFields({
              name: '🔒 Status',
              value: `**Ticket Closed** by ${interaction.user.tag}`,
              inline: false
            });

            // Create disabled buttons
            const disabledRow = new ActionRowBuilder<ButtonBuilder>()
              .addComponents(
                new ButtonBuilder()
                  .setCustomId(`processed_${caseOpeningId}`)
                  .setLabel('✅ Processed')
                  .setStyle(ButtonStyle.Success)
                  .setDisabled(true),
                new ButtonBuilder()
                  .setCustomId(`issue_${caseOpeningId}`)
                  .setLabel('❌ Issue')
                  .setStyle(ButtonStyle.Danger)
                  .setDisabled(true)
              );

            await interaction.message.edit({ 
              embeds: [originalEmbed], 
              components: [disabledRow] 
            });
            
            console.log(`🔒 Ticket ${caseOpeningId} closed by ${interaction.user.tag}`);
          } catch (error) {
            console.error('Failed to close ticket:', error);
          }
        }
      });

      this.client.on('error', error => {
        console.error('Discord bot error:', error);
      });
    } else {
      console.warn('DISCORD_BOT_TOKEN is not set. Discord bot will not start.');
    }
  }

  private getRarityColor(rarity: string): number {
    const rarityColors = {
      'common': 0x808080,      // Gray
      'uncommon': 0x00ff00,    // Green
      'rare': 0x0080ff,        // Blue
      'epic': 0x8000ff,        // Purple
      'legendary': 0xffd700,   // Gold
      'mythic': 0xff4500,      // Orange
    };

    return rarityColors[rarity.toLowerCase() as keyof typeof rarityColors] || 0x808080;
  }

  async createSkinClaimTicket(data: DiscordTicketData): Promise<void> {
    console.log('🎫 DiscordBotService.createSkinClaimTicket called with:', {
      skinName: data.skinName,
      rarity: data.skinRarity,
      user: data.walletAddress,
      steamTradeUrl: data.steamTradeUrl || 'NOT PROVIDED',
      hasSteamTradeUrl: !!data.steamTradeUrl,
      isReady: this.isReady,
      channelId: config.discord.ticketChannelId,
      allFields: Object.keys(data),
    });

    if (!this.isReady || !config.discord.ticketChannelId) {
      console.warn('Discord bot not ready or channel ID not configured. Skipping ticket creation.');
      return;
    }

    try {
      console.log('🔍 Fetching Discord channel...');
      const channel = await this.client.channels.fetch(config.discord.ticketChannelId);

      if (!channel || !(channel instanceof TextChannel)) {
        console.error(`Discord channel with ID ${config.discord.ticketChannelId} not found or is not a text channel.`);
        return;
      }

      console.log('✅ Discord channel found:', channel.name);

      const embed = new EmbedBuilder()
        .setColor(this.getRarityColor(data.skinRarity))
        .setTitle(`🎁 New Skin Claim: ${data.skinName}`)
        .setDescription(`A new **${data.skinRarity}** skin has been claimed!`)
        .addFields(
          { name: '👤 User', value: `Wallet: \`${data.walletAddress}\`\nUser ID: \`${data.userId}\``, inline: false },
          { name: '🔫 Skin Details', value: `**Weapon:** ${data.skinWeapon}\n**Rarity:** ${data.skinRarity}\n**Name:** ${data.skinName}`, inline: false },
          { name: '🔗 Links', value: data.steamTradeUrl ? `[Steam Trade URL](${data.steamTradeUrl})` : 'No Steam Trade URL provided.', inline: false },
          { name: '⛓️ Blockchain', value: `**NFT Mint:** \`${data.nftMintAddress}\`\n**Opened:** <t:${Math.floor(new Date(data.openedAt).getTime() / 1000)}:R>`, inline: false },
        )
        .setTimestamp()
        .setFooter({ text: `Case Opening ID: ${data.caseOpeningId}` });

      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`processed_${data.caseOpeningId}`)
            .setLabel('✅ Processed')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`issue_${data.caseOpeningId}`)
            .setLabel('❌ Issue')
            .setStyle(ButtonStyle.Danger)
        );

      console.log('📤 Sending Discord message...');
      const message = await channel.send({ embeds: [embed], components: [row] });
      console.log('✅ Discord message sent successfully! Message ID:', message.id);
      console.log(`Discord ticket created for skin claim: ${data.skinName}`);
    } catch (error: any) {
      console.error('❌ Failed to send Discord message:', error.message);
      console.error('❌ Full error:', error);
      throw error;
    }
  }
}

export const discordBotService = new DiscordBotService();
