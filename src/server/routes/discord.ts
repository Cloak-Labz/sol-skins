import { Router } from 'express';
import { discordController } from '../controllers/DiscordController';
import { discordBotService } from '../services/DiscordBotService';
import { ResponseUtil } from '../utils/response';
import { catchAsync } from '../middlewares/errorHandler';

const router = Router();

// Discord webhook endpoint for interactions
router.post('/interactions', discordController.handleInteraction);

// Route for creating skin claim tickets
router.post('/create-ticket', catchAsync(async (req: any, res: any) => {
  const ticketData = req.body;
  
  console.log('🎫 Creating Discord ticket from frontend:', {
    skinName: ticketData.skinName,
    rarity: ticketData.skinRarity,
    user: ticketData.walletAddress
  });
  
  await discordBotService.createSkinClaimTicket(ticketData);
  
  ResponseUtil.success(res, { message: 'Discord ticket created successfully' });
}));

export default router;
