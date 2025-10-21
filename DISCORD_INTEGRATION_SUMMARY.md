# Discord Integration for Skin Claims

## 🎯 Overview

This integration automatically creates Discord tickets whenever users claim skins from case openings. Each ticket contains comprehensive information about the skin, user, and transaction details.

## 🚀 Features Implemented

### ✅ Core Functionality
- **Automatic Ticket Creation**: Tickets are created when skins are claimed
- **Rich Embeds**: Beautiful Discord embeds with skin information
- **Interactive Buttons**: Process, Issue, and View Details buttons
- **Steam Integration**: Includes Steam trade URLs when available
- **Blockchain Data**: NFT mint addresses and transaction details

### ✅ Ticket Information
Each ticket includes:
- **User Details**: Wallet address, user ID
- **Skin Information**: Name, weapon, rarity, condition
- **Steam Trade URL**: If provided by user
- **Blockchain Data**: NFT mint address, timestamp
- **Case Opening ID**: For tracking and reference

### ✅ Interactive Elements
- **✅ Processed Button**: Mark ticket as completed
- **❌ Issue Button**: Flag for manual review
- **📋 View Details Button**: Get additional information

## 📁 Files Created/Modified

### New Files:
1. **`src/server/services/DiscordService.ts`** - Core Discord integration service
2. **`src/server/controllers/DiscordController.ts`** - Handle Discord interactions
3. **`src/server/routes/discord.ts`** - Discord webhook routes
4. **`src/server/scripts/test-discord.ts`** - Test script for Discord integration
5. **`DISCORD_SETUP.md`** - Complete setup guide
6. **`DISCORD_INTEGRATION_SUMMARY.md`** - This summary

### Modified Files:
1. **`src/server/services/CaseOpeningService.ts`** - Added Discord ticket creation
2. **`src/server/config/env.ts`** - Added Discord environment variables
3. **`src/server/routes/index.ts`** - Added Discord routes

## 🔧 Environment Variables

Add these to your `.env` file:

```env
# Discord Integration
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_TICKET_CHANNEL_ID=your_channel_id_here
DISCORD_GUILD_ID=your_server_id_here
```

## 🎨 Ticket Format

Each ticket is a rich Discord embed with:

```
🎁 New Skin Claim
**AK-47 | Fire Serpent** has been claimed!

👤 User
Wallet: `v1t1nCTfxttsTFW3t7zTQFUsdpznu8kggzYSg7SDJMs`
User ID: `test-user-123`

🔫 Skin Details
**Weapon:** AK-47
**Rarity:** Legendary
**Name:** AK-47 | Fire Serpent

🔗 Links
[Steam Trade URL](https://steamcommunity.com/tradeoffer/new/?partner=123456789&token=abcdefgh)

⛓️ Blockchain
**NFT Mint:** `EyqcQ4n3Pr7BoqycXQj6hmyqmxZzwFzpFasQq55GEGkR`
**Opened:** 2 minutes ago

Case Opening ID: test-case-456
```

## 🎨 Rarity Colors

Tickets use color-coded embeds based on skin rarity:
- **Common**: Gray (#808080)
- **Uncommon**: Green (#00ff00)
- **Rare**: Blue (#0080ff)
- **Epic**: Purple (#8000ff)
- **Legendary**: Gold (#ffd700)
- **Mythic**: Orange (#ff4500)

## 🔄 Integration Flow

1. **User Opens Case** → Solana program processes payment
2. **Skin Revealed** → Backend creates UserSkin record
3. **Discord Ticket Created** → Automatic ticket with all details
4. **Admin Processing** → Use buttons to manage tickets
5. **Status Updates** → Track ticket progress

## 🛠️ Setup Instructions

### 1. Discord Bot Setup
1. Create Discord application at [Discord Developer Portal](https://discord.com/developers/applications)
2. Create bot and copy token
3. Get server and channel IDs
4. Invite bot to server with proper permissions

### 2. Environment Configuration
1. Add Discord environment variables to `.env`
2. Restart server to load new configuration
3. Test integration with provided test script

### 3. Testing
```bash
# Run Discord integration test
npm run test:discord
# or
node src/server/scripts/test-discord.ts
```

## 🔒 Security Considerations

- **Bot Token Security**: Never expose bot tokens in code
- **Signature Verification**: Implement Discord signature verification for production
- **Rate Limiting**: Discord API has rate limits
- **Error Handling**: Discord failures don't break skin claims

## 🚀 Future Enhancements

### Planned Features:
1. **Slash Commands**: `/ticket status <id>`, `/ticket close <id>`
2. **Database Integration**: Store ticket message IDs for updates
3. **Status Tracking**: Track ticket processing status
4. **Notifications**: Ping admins for high-value skins
5. **Analytics**: Track ticket processing metrics

### Advanced Features:
1. **Auto-Processing**: Automatic ticket closure for verified claims
2. **Bulk Operations**: Process multiple tickets at once
3. **Integration with MEE6**: Use existing MEE6 bot for enhanced functionality
4. **Custom Commands**: Server-specific ticket management commands

## 🐛 Troubleshooting

### Common Issues:
1. **Bot not posting**: Check token and permissions
2. **Invalid channel ID**: Verify Developer Mode is enabled
3. **Permission errors**: Ensure bot has Send Messages permission
4. **Rate limits**: Discord API has strict rate limits

### Debug Steps:
1. Check server logs for Discord API errors
2. Verify environment variables are set correctly
3. Test bot permissions in Discord
4. Use test script to verify integration

## 📊 Monitoring

Monitor Discord integration with:
- Server logs for Discord API calls
- Ticket creation success rates
- Button interaction analytics
- Error tracking and alerts

## 🎉 Benefits

### For Users:
- **Transparency**: See all skin claims in Discord
- **Steam Integration**: Easy access to trade URLs
- **Status Tracking**: Know when skins are processed

### For Admins:
- **Centralized Management**: All claims in one Discord channel
- **Quick Processing**: Interactive buttons for fast handling
- **Rich Information**: All details in one place
- **Audit Trail**: Complete history of all claims

### For Development:
- **Automated Workflow**: No manual ticket creation
- **Error Resilience**: Discord failures don't break core functionality
- **Scalable**: Handles high volume of claims
- **Extensible**: Easy to add new features

## 📝 Next Steps

1. **Set up Discord bot** using the provided guide
2. **Configure environment variables**
3. **Test the integration** with the test script
4. **Deploy to production** and monitor
5. **Add advanced features** as needed

The Discord integration is now ready to automatically create tickets for every skin claim! 🎉
