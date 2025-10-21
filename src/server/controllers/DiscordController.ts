import { Request, Response } from 'express';
import { discordService } from '../services/DiscordService';

export class DiscordController {
  /**
   * Handle Discord interaction webhooks (for button clicks)
   */
  handleInteraction = async (req: Request, res: Response): Promise<void> => {
    try {
      const { type, data } = req.body;

      // Verify Discord signature (in production, you should verify the request signature)
      // const signature = req.headers['x-signature-ed25519'] as string;
      // const timestamp = req.headers['x-signature-timestamp'] as string;
      // if (!this.verifySignature(signature, timestamp, JSON.stringify(req.body))) {
      //   return res.status(401).json({ error: 'Invalid signature' });
      // }

      if (type === 3) { // Interaction Type: MESSAGE_COMPONENT (button click)
        const { custom_id } = data;
        const [action, caseOpeningId] = custom_id.split('_');

        switch (action) {
          case 'processed':
            await this.handleProcessedTicket(caseOpeningId, res);
            break;
          case 'issue':
            await this.handleIssueTicket(caseOpeningId, res);
            break;
          case 'details':
            await this.handleDetailsTicket(caseOpeningId, res);
            break;
          default:
            res.status(400).json({ error: 'Unknown action' });
        }
      } else if (type === 1) { // Interaction Type: PING
        res.json({ type: 1 }); // PONG response
      } else {
        res.status(400).json({ error: 'Unknown interaction type' });
      }
    } catch (error) {
      console.error('Discord interaction error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  private async handleProcessedTicket(caseOpeningId: string, res: Response): Promise<void> {
    try {
      // Update ticket status in database
      await discordService.updateTicketStatus(caseOpeningId, 'processed', 'admin');
      
      res.json({
        type: 4, // Interaction Response Type: CHANNEL_MESSAGE_WITH_SOURCE
        data: {
          content: `✅ Ticket for case opening ${caseOpeningId} has been marked as processed.`,
          flags: 64, // EPHEMERAL (only visible to the user who clicked)
        },
      });
    } catch (error) {
      console.error('Error processing ticket:', error);
      res.status(500).json({ error: 'Failed to process ticket' });
    }
  }

  private async handleIssueTicket(caseOpeningId: string, res: Response): Promise<void> {
    try {
      // Update ticket status in database
      await discordService.updateTicketStatus(caseOpeningId, 'issue', 'admin');
      
      res.json({
        type: 4, // Interaction Response Type: CHANNEL_MESSAGE_WITH_SOURCE
        data: {
          content: `❌ Ticket for case opening ${caseOpeningId} has been flagged for manual review.`,
          flags: 64, // EPHEMERAL
        },
      });
    } catch (error) {
      console.error('Error flagging ticket:', error);
      res.status(500).json({ error: 'Failed to flag ticket' });
    }
  }

  private async handleDetailsTicket(caseOpeningId: string, res: Response): Promise<void> {
    try {
      // Get case opening details from database
      // This would require importing your case opening repository
      // const caseOpening = await caseOpeningRepository.findById(caseOpeningId);
      
      res.json({
        type: 4, // Interaction Response Type: CHANNEL_MESSAGE_WITH_SOURCE
        data: {
          content: `📋 **Case Opening Details**\n\`\`\`\nID: ${caseOpeningId}\nStatus: Processing\nTimestamp: ${new Date().toISOString()}\n\`\`\``,
          flags: 64, // EPHEMERAL
        },
      });
    } catch (error) {
      console.error('Error getting ticket details:', error);
      res.status(500).json({ error: 'Failed to get ticket details' });
    }
  }

  /**
   * Verify Discord signature (implement in production)
   */
  private verifySignature(signature: string, timestamp: string, body: string): boolean {
    // Implement Discord signature verification
    // This is important for security in production
    return true; // Placeholder
  }
}

export const discordController = new DiscordController();
