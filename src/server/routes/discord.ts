import { Router } from 'express';
import { discordController } from '../controllers/DiscordController';
import { discordBotService } from '../services/DiscordBotService';
import { ResponseUtil } from '../utils/response';
import { catchAsync } from '../middlewares/errorHandler';
import { validateSchema, schemas } from '../middlewares/validation';

const router = Router();

// Discord webhook endpoint for interactions
router.post('/interactions', discordController.handleInteraction);

// Route for creating skin claim tickets
router.post('/create-ticket', validateSchema(schemas.createTicket), catchAsync(async (req: any, res: any) => {
  const ticketData = req.body;
  
  console.log('🎫 Creating Discord ticket from frontend:', {
    skinName: ticketData.skinName,
    rarity: ticketData.skinRarity,
    user: ticketData.walletAddress,
    steamTradeUrl: ticketData.steamTradeUrl || 'NOT PROVIDED',
    hasSteamTradeUrl: !!ticketData.steamTradeUrl,
    allFields: Object.keys(ticketData),
  });
  
  await discordBotService.createSkinClaimTicket(ticketData);
  
  // Mark UserSkin as waiting transfer
  if (ticketData.nftMintAddress) {
    try {
      const { AppDataSource } = await import('../config/database');
      const { UserSkin } = await import('../entities/UserSkin');
      const userSkinRepo = AppDataSource.getRepository(UserSkin);
      const userSkin = await userSkinRepo.findOne({ 
        where: { nftMintAddress: ticketData.nftMintAddress } 
      });
      if (userSkin) {
        userSkin.isWaitingTransfer = true;
        await userSkinRepo.save(userSkin);
        console.log('✅ UserSkin marked as waiting transfer:', ticketData.nftMintAddress);
      }
    } catch (error) {
      console.error('❌ Failed to mark UserSkin as waiting transfer:', error);
      // Don't fail the ticket creation if this fails
    }
  }
  
  ResponseUtil.success(res, { message: 'Discord ticket created successfully' });
}));

export default router;
