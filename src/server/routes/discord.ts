import { Router } from 'express';
import { discordController } from '../controllers/DiscordController';

const router = Router();

// Discord webhook endpoint for interactions
router.post('/interactions', discordController.handleInteraction);

export default router;
