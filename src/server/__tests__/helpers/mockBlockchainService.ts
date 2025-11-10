import { IBlockchainService } from '../../services/BuybackService';
import { AppDataSource } from '../../config/database';
import { UserSkinRepository } from '../../repositories/UserSkinRepository';

/**
 * Mock blockchain service for testing
 * Verifies ownership from database instead of blockchain
 */
export class MockBlockchainService implements IBlockchainService {
  async buildTransaction(
    userWallet: string,
    nftMint: string,
    buybackAmountLamports: string
  ): Promise<string> {
    // Return mock transaction
    const mockTransaction = Buffer.from(JSON.stringify({
      type: 'buyback',
      nftMint,
      userWallet,
      buybackAmount: buybackAmountLamports,
    })).toString('base64');
    
    return mockTransaction;
  }

  async verifyNFTOwnership(nftMint: string, userWallet: string): Promise<boolean> {
    // Verify ownership from database instead of blockchain
    const userSkinRepo = new UserSkinRepository();
    const userRepo = AppDataSource.getRepository(require('../../entities/User').User);
    
    const user = await userRepo.findOne({ where: { walletAddress: userWallet } });
    if (!user) {
      return false;
    }
    
    const userSkin = await userSkinRepo.findByNftMintAddress(nftMint);
    
    // Also verify it belongs to the user
    if (userSkin && userSkin.userId !== user.id) {
      return false;
    }
    
    if (userSkin && !userSkin.isInInventory) {
      return false;
    }
    
    return !!userSkin && !userSkin.soldViaBuyback;
  }
}

