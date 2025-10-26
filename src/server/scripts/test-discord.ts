import { discordService } from '../services/DiscordService';

async function testDiscordIntegration() {
  console.log('Testing Discord integration...');
  
  const testData = {
    userId: 'test-user-123',
    walletAddress: 'v1t1nCTfxttsTFW3t7zTQFUsdpznu8kggzYSg7SDJMs',
    steamTradeUrl: 'https://steamcommunity.com/tradeoffer/new/?partner=123456789&token=abcdefgh',
    skinName: 'AK-47 | Fire Serpent',
    skinRarity: 'Legendary',
    skinWeapon: 'AK-47',
    nftMintAddress: 'EyqcQ4n3Pr7BoqycXQj6hmyqmxZzwFzpFasQq55GEGkR',
    openedAt: new Date(),
    caseOpeningId: 'test-case-456',
  };

  try {
    await discordService.createSkinClaimTicket(testData);
    console.log('✅ Discord ticket created successfully!');
  } catch (error) {
    console.error('❌ Discord integration test failed:', error);
  }
}

// Run the test
testDiscordIntegration();
