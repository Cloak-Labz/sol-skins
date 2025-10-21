# Discord Bot Setup Guide

This guide will help you set up a Discord bot to automatically create tickets when users claim skins.

## 1. Create a Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Give it a name (e.g., "SkinVault Bot")
4. Click "Create"

## 2. Create a Bot

1. In your application, go to the "Bot" section
2. Click "Add Bot"
3. Copy the **Bot Token** (you'll need this for `DISCORD_BOT_TOKEN`)
4. Under "Privileged Gateway Intents", enable:
   - Message Content Intent (if you want the bot to read messages)

## 3. Get Channel and Guild IDs

### Guild (Server) ID:
1. Enable Developer Mode in Discord (User Settings > Advanced > Developer Mode)
2. Right-click on your server name
3. Click "Copy Server ID"
4. This is your `DISCORD_GUILD_ID`

### Channel ID:
1. Right-click on the channel where you want tickets to be posted
2. Click "Copy Channel ID"
3. This is your `DISCORD_TICKET_CHANNEL_ID`

## 4. Invite Bot to Server

1. Go to the "OAuth2" > "URL Generator" section
2. Select scopes:
   - `bot`
   - `applications.commands` (optional, for slash commands)
3. Select bot permissions:
   - `Send Messages`
   - `Use Slash Commands` (if using slash commands)
   - `Embed Links`
   - `Attach Files`
4. Copy the generated URL and open it in your browser
5. Select your server and authorize the bot

## 5. Environment Variables

Add these to your `.env` file:

```env
# Discord Integration
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_TICKET_CHANNEL_ID=your_channel_id_here
DISCORD_GUILD_ID=your_server_id_here
```

## 6. Bot Permissions

Make sure your bot has these permissions in the ticket channel:
- Send Messages
- Embed Links
- Use External Emojis
- Add Reactions

## 7. Testing

Once configured, the bot will automatically create tickets when users claim skins. Each ticket will include:

- User information (wallet address, user ID)
- Skin details (name, weapon, rarity)
- Steam trade URL (if provided)
- NFT mint address
- Timestamp
- Interactive buttons for processing

## 8. Ticket Format

Each ticket will be a rich embed with:
- **Title**: "🎁 New Skin Claim"
- **Skin Information**: Weapon, rarity, name
- **User Information**: Wallet address, user ID
- **Links**: Steam trade URL (if available)
- **Blockchain Info**: NFT mint address, timestamp
- **Action Buttons**: Process, Issue, View Details

## 9. Button Interactions (Future Enhancement)

The tickets include interactive buttons:
- ✅ **Processed**: Mark ticket as completed
- ❌ **Issue**: Flag for manual review
- 📋 **View Details**: Get more information

*Note: Button interactions require additional setup with Discord's interaction webhooks.*

## 10. Troubleshooting

### Bot not posting tickets:
1. Check if `DISCORD_BOT_TOKEN` is correct
2. Verify `DISCORD_TICKET_CHANNEL_ID` is correct
3. Ensure bot has permission to send messages in the channel
4. Check server logs for Discord API errors

### Invalid channel ID:
1. Make sure Developer Mode is enabled
2. Right-click the channel and copy the ID again
3. Ensure the bot is in the server

### Permission errors:
1. Check bot permissions in server settings
2. Ensure bot has "Send Messages" permission in the channel
3. Verify the bot role has necessary permissions

## 11. Security Notes

- Never share your bot token publicly
- Keep the token in environment variables only
- Consider using a separate Discord server for testing
- Regularly rotate bot tokens if compromised

## 12. Advanced Features (Optional)

### Slash Commands
You can add slash commands for manual ticket management:
- `/ticket status <case_id>` - Check ticket status
- `/ticket close <case_id>` - Close a ticket
- `/ticket list` - List open tickets

### Webhooks
For high-volume servers, consider using webhooks instead of bot messages for better performance.

### Database Integration
Store ticket message IDs in your database to enable status updates and button interactions.
