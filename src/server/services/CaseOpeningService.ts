import { CaseOpeningRepository } from '../repositories/CaseOpeningRepository';
import { LootBoxTypeRepository } from '../repositories/LootBoxTypeRepository';
import { UserSkinRepository } from '../repositories/UserSkinRepository';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { UserRepository } from '../repositories/UserRepository';
import { AppError } from '../middlewares/errorHandler';
import { TransactionType, TransactionStatus } from '../entities/Transaction';
import { UserDecision } from '../entities/CaseOpening';
import { v4 as uuidv4 } from 'uuid';

export class CaseOpeningService {
  private caseOpeningRepository: CaseOpeningRepository;
  private lootBoxRepository: LootBoxTypeRepository;
  private userSkinRepository: UserSkinRepository;
  private transactionRepository: TransactionRepository;
  private userRepository: UserRepository;

  constructor() {
    this.caseOpeningRepository = new CaseOpeningRepository();
    this.lootBoxRepository = new LootBoxTypeRepository();
    this.userSkinRepository = new UserSkinRepository();
    this.transactionRepository = new TransactionRepository();
    this.userRepository = new UserRepository();
  }

  async openCase(userId: string, data: {
    lootBoxTypeId: string;
    paymentMethod: 'SOL' | 'USDC';
  }) {
    const lootBox = await this.lootBoxRepository.findById(data.lootBoxTypeId);

    if (!lootBox) {
      throw new AppError('Loot box not found', 404, 'LOOT_BOX_NOT_FOUND');
    }

    if (!lootBox.isActive) {
      throw new AppError('Loot box is not available', 400, 'LOOT_BOX_NOT_AVAILABLE');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Generate unique NFT mint address and VRF request ID
    const nftMintAddress = uuidv4().replace(/-/g, ''); // Simple mock for now
    const vrfRequestId = `vrf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create case opening record
    const caseOpening = await this.caseOpeningRepository.create({
      userId,
      lootBoxTypeId: data.lootBoxTypeId,
      vrfRequestId,
      openedAt: new Date(),
    });

    // Create transaction record
    const amount = data.paymentMethod === 'SOL' ? lootBox.priceSol : (lootBox.priceUsdc || 0);
    const transaction = await this.transactionRepository.create({
      userId,
      transactionType: TransactionType.OPEN_CASE,
      amountSol: data.paymentMethod === 'SOL' ? -amount : undefined,
      amountUsdc: data.paymentMethod === 'USDC' ? -amount : undefined,
      amountUsd: data.paymentMethod === 'SOL' ? -amount * 100 : -amount, // Mock SOL price
      lootBoxTypeId: data.lootBoxTypeId,
      status: TransactionStatus.PENDING,
    });

    // Simulate VRF completion after a short delay (in real implementation, this would be handled by blockchain events)
    setTimeout(() => this.simulateVrfCompletion(caseOpening.id, lootBox.id, nftMintAddress), 2000);

    const estimatedCompletionTime = new Date();
    estimatedCompletionTime.setSeconds(estimatedCompletionTime.getSeconds() + 30);

    return {
      caseOpeningId: caseOpening.id,
      nftMintAddress,
      vrfRequestId,
      transactionId: transaction.id,
      estimatedCompletionTime,
    };
  }

  async getCaseOpeningStatus(userId: string, caseOpeningId: string) {
    const caseOpening = await this.caseOpeningRepository.findById(caseOpeningId);

    if (!caseOpening) {
      throw new AppError('Case opening not found', 404, 'CASE_OPENING_NOT_FOUND');
    }

    if (caseOpening.userId !== userId) {
      throw new AppError('Unauthorized to view this case opening', 403, 'UNAUTHORIZED');
    }

    const status = caseOpening.completedAt ? 'completed' : 'processing';

    const response: any = {
      id: caseOpening.id,
      status,
      vrfRequestId: caseOpening.vrfRequestId,
      randomnessSeed: caseOpening.randomnessSeed,
      openedAt: caseOpening.openedAt,
      completedAt: caseOpening.completedAt,
    };

    if (caseOpening.skinTemplate && caseOpening.userSkin) {
      response.skinResult = {
        id: caseOpening.skinTemplate.id,
        weapon: caseOpening.skinTemplate.weapon,
        skinName: caseOpening.skinTemplate.skinName,
        rarity: caseOpening.skinTemplate.rarity,
        condition: caseOpening.skinTemplate.condition,
        currentPriceUsd: caseOpening.userSkin.currentPriceUsd,
        imageUrl: caseOpening.skinTemplate.imageUrl,
        nftMintAddress: caseOpening.userSkin.nftMintAddress,
      };
    }

    return response;
  }

  async makeDecision(userId: string, caseOpeningId: string, decision: 'keep' | 'buyback') {
    const caseOpening = await this.caseOpeningRepository.findById(caseOpeningId);

    if (!caseOpening) {
      throw new AppError('Case opening not found', 404, 'CASE_OPENING_NOT_FOUND');
    }

    if (caseOpening.userId !== userId) {
      throw new AppError('Unauthorized to make decision on this case opening', 403, 'UNAUTHORIZED');
    }

    if (!caseOpening.completedAt) {
      throw new AppError('Case opening is not yet completed', 400, 'CASE_NOT_COMPLETED');
    }

    if (caseOpening.userDecision) {
      throw new AppError('Decision has already been made', 400, 'DECISION_ALREADY_MADE');
    }

    const userDecision = decision === 'keep' ? UserDecision.KEEP : UserDecision.BUYBACK;
    await this.caseOpeningRepository.updateUserDecision(caseOpeningId, userDecision);

    let result: any = {
      decision,
      nftMintAddress: caseOpening.userSkin?.nftMintAddress,
    };

    if (decision === 'keep') {
      result.addedToInventory = true;
    } else if (decision === 'buyback' && caseOpening.userSkin) {
      // Process immediate buyback
      const currentPrice = caseOpening.userSkin.currentPriceUsd || 0;
      const buybackPrice = currentPrice * 0.85;

      await this.userSkinRepository.markAsSold(caseOpening.userSkin.id, buybackPrice);

      // Create buyback transaction
      await this.transactionRepository.create({
        userId,
        transactionType: TransactionType.BUYBACK,
        amountUsd: buybackPrice,
        amountUsdc: buybackPrice,
        userSkinId: caseOpening.userSkin.id,
        status: TransactionStatus.CONFIRMED,
      });

      result.buybackPrice = buybackPrice;
      result.addedToInventory = false;
    }

    return result;
  }

  async getUserCaseOpenings(userId: string, options: {
    page?: number;
    limit?: number;
  }) {
    const page = options.page || 1;
    const limit = Math.min(options.limit || 20, 100);
    const skip = (page - 1) * limit;

    const [caseOpenings, total] = await this.caseOpeningRepository.findByUser(userId, {
      skip,
      take: limit,
    });

    return {
      data: caseOpenings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Simulate VRF completion (in real implementation, this would be triggered by blockchain events)
  private async simulateVrfCompletion(caseOpeningId: string, lootBoxTypeId: string, nftMintAddress: string) {
    try {
      const lootBox = await this.lootBoxRepository.findById(lootBoxTypeId);
      if (!lootBox || !lootBox.skinPools?.length) return;

      // Simple weighted random selection
      const randomSeed = `0x${Math.random().toString(16).substr(2, 64)}`;
      const totalWeight = lootBox.skinPools.reduce((sum, pool) => sum + pool.weight, 0);
      const randomValue = Math.random() * totalWeight;
      
      let currentWeight = 0;
      let selectedSkin = lootBox.skinPools[0].skinTemplate;
      
      for (const pool of lootBox.skinPools) {
        currentWeight += pool.weight;
        if (randomValue <= currentWeight) {
          selectedSkin = pool.skinTemplate;
          break;
        }
      }

      // Create user skin
      const userSkin = await this.userSkinRepository.create({
        userId: (await this.caseOpeningRepository.findById(caseOpeningId))?.userId,
        skinTemplateId: selectedSkin.id,
        nftMintAddress,
        lootBoxTypeId,
        openedAt: new Date(),
        currentPriceUsd: selectedSkin.basePriceUsd,
        lastPriceUpdate: new Date(),
        isInInventory: true,
        name: `${selectedSkin.weapon} | ${selectedSkin.skinName}`,
        symbol: 'SKIN',
      });

      // Update case opening with results
      await this.caseOpeningRepository.updateWithVrfResult(caseOpeningId, {
        randomnessSeed: randomSeed,
        skinTemplateId: selectedSkin.id,
        userSkinId: userSkin.id,
        completedAt: new Date(),
      });

      // Update user stats
      const caseOpening = await this.caseOpeningRepository.findById(caseOpeningId);
      if (caseOpening?.userId) {
        const user = await this.userRepository.findById(caseOpening.userId);
        if (user) {
          await this.userRepository.updateStats(caseOpening.userId, {
            casesOpened: user.casesOpened + 1,
          });
        }
      }
    } catch (error) {
      console.error('Error in VRF simulation:', error);
    }
  }
} 