import { CaseOpeningRepository } from '../repositories/CaseOpeningRepository';
import { LootBoxTypeRepository } from '../repositories/LootBoxTypeRepository';
import { UserSkinRepository } from '../repositories/UserSkinRepository';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { UserRepository } from '../repositories/UserRepository';
import { AppError } from '../middlewares/errorHandler';
import { TransactionType, TransactionStatus } from '../entities/Transaction';
import { UserDecision } from '../entities/CaseOpening';
import { v4 as uuidv4 } from 'uuid';
import { randomizationService } from './randomization.service';
import { simpleSolanaService } from './simpleSolana.service';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplCore } from '@metaplex-foundation/mpl-core';
import { create } from '@metaplex-foundation/mpl-core';
import { generateSigner, signerIdentity, createSignerFromKeypair } from '@metaplex-foundation/umi';
import bs58 from 'bs58';
import axios from 'axios';

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

    // Check supply before opening
    if (lootBox.maxSupply && lootBox.remainingSupply <= 0) {
      throw new AppError('Pack is sold out', 400, 'PACK_SOLD_OUT');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    if (!lootBox.skinPools || lootBox.skinPools.length === 0) {
      throw new AppError('Pack has no skin pool configured', 500, 'NO_SKIN_POOL');
    }

    // ═══════════════════════════════════════════════════════════
    //  PAYMENT VERIFICATION (Real Blockchain Check)
    // ═══════════════════════════════════════════════════════════

    console.log(`💳 [PAYMENT VERIFICATION] Checking payment from ${user.walletAddress}`);
    console.log(`   Expected amount: ${lootBox.priceSol} SOL`);

    const paymentVerified = await simpleSolanaService.verifyPayment({
      userWallet: user.walletAddress,
      expectedAmount: lootBox.priceSol,
      timeWindow: 120, // 2 minutes to find payment
    });

    if (!paymentVerified.verified) {
      throw new AppError(
        `Payment not found. Please ensure you sent ${lootBox.priceSol} SOL to the admin wallet.`,
        402,
        'PAYMENT_REQUIRED'
      );
    }

    console.log(`✅ [PAYMENT VERIFIED] Transaction: ${paymentVerified.transaction}`);
    console.log(`   Amount: ${paymentVerified.amount} SOL`);

    // ═══════════════════════════════════════════════════════════
    //  OFF-CHAIN RANDOMIZATION (Instant)
    // ═══════════════════════════════════════════════════════════

    // 1. Generate provably fair random seed
    const publicSeed = `${userId}_${data.lootBoxTypeId}_${Date.now()}`;
    const random = randomizationService.generateRandom(publicSeed);

    // 2. Select skin from weighted pool
    const weightedPool = lootBox.skinPools.map(pool => ({
      id: pool.id,
      weight: pool.weight,
      skinTemplate: pool.skinTemplate,
    }));

    const { item: selectedPool, probability } = randomizationService.selectFromWeightedPool(
      random.value,
      weightedPool
    );

    const selectedSkin = selectedPool.skinTemplate;

    console.log(`🎲 [CASE OPENING] User: ${userId}`);
    console.log(`   Pack: ${lootBox.name}`);
    console.log(`   Selected: ${selectedSkin.weapon} | ${selectedSkin.skinName}`);
    console.log(`   Rarity: ${selectedSkin.rarity}`);
    console.log(`   Probability: ${(probability * 100).toFixed(2)}%`);

    // 3. Mint REAL NFT on-chain using Metaplex Core
    console.log(`🎨 [NFT MINTING] Creating real NFT on-chain...`);
    console.log(`   Skin: ${selectedSkin.weapon} | ${selectedSkin.skinName}`);
    console.log(`   Owner: ${user.walletAddress}`);
    
    const nftResult = await this.mintCoreNFT({
      name: `${selectedSkin.weapon} | ${selectedSkin.skinName}`,
      skinTemplate: selectedSkin,
      owner: user.walletAddress,
    });
    
    console.log(`✅ [NFT MINTED] Asset: ${nftResult.mint}`);
    console.log(`   Transaction: ${nftResult.transaction}`);

    // 4. Create case opening record with random fields
    const caseOpening = await this.caseOpeningRepository.create({
      userId,
      lootBoxTypeId: data.lootBoxTypeId,
      vrfRequestId: null, // Not using VRF
      randomSeed: publicSeed,
      randomValue: random.value,
      randomHash: random.hash,
      status: 'revealing',
      skinTemplateId: selectedSkin.id,
      openedAt: new Date(),
      completedAt: new Date(), // Completed immediately
    } as any);

    // 5. Create user skin
    const userSkin = await this.userSkinRepository.create({
      userId,
      skinTemplateId: selectedSkin.id,
      nftMintAddress: nftResult.mint,
      lootBoxTypeId: data.lootBoxTypeId,
      caseOpeningId: caseOpening.id,
      source: 'opened',
      claimed: false,
      openedAt: new Date(),
      currentPriceUsd: selectedSkin.basePriceUsd,
      lastPriceUpdate: new Date(),
      isInInventory: true,
      name: `${selectedSkin.weapon} | ${selectedSkin.skinName}`,
      symbol: 'SKIN',
      metadataUri: selectedSkin.imageUrl || '',
    } as any);

    // 6. Update case opening with user skin
    await this.caseOpeningRepository.update(caseOpening.id, {
      userSkinId: userSkin.id,
      status: 'completed',
    } as any);

    // 7. Create transaction record
    const solAmount = lootBox.priceSol;
    const usdcAmount = lootBox.priceUsdc || 0;

    await this.transactionRepository.create({
      userId,
      transactionType: TransactionType.OPEN_CASE,
      amountSol: data.paymentMethod === 'SOL' ? -solAmount : undefined,
      amountUsdc: data.paymentMethod === 'USDC' ? -usdcAmount : undefined,
      amountUsd: data.paymentMethod === 'SOL' ? -usdcAmount : -usdcAmount,
      lootBoxTypeId: data.lootBoxTypeId,
      status: TransactionStatus.CONFIRMED,
    });

    // 8. Update user stats
    await this.userRepository.updateStats(userId, {
      casesOpened: user.casesOpened + 1,
    });

    // 9. Decrement supply
    if (lootBox.maxSupply) {
      await this.lootBoxRepository.decrementSupply(data.lootBoxTypeId);
    }

    // Return immediate result
    return {
      caseOpeningId: caseOpening.id,
      nftMintAddress: nftResult.mint,
      transaction: nftResult.transaction,
      skinResult: {
        id: selectedSkin.id,
        weapon: selectedSkin.weapon,
        skinName: selectedSkin.skinName,
        rarity: selectedSkin.rarity,
        condition: selectedSkin.condition,
        currentPriceUsd: selectedSkin.basePriceUsd,
        imageUrl: selectedSkin.imageUrl,
      },
      randomization: {
        seed: publicSeed,
        value: random.value,
        hash: random.hash,
        probability: (probability * 100).toFixed(2) + '%',
      },
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

    const status = (caseOpening as any).status || (caseOpening.completedAt ? 'completed' : 'processing');

    const response: any = {
      id: caseOpening.id,
      status,
      openedAt: caseOpening.openedAt,
      completedAt: caseOpening.completedAt,
      // Off-chain randomization fields
      randomSeed: (caseOpening as any).randomSeed,
      randomValue: (caseOpening as any).randomValue,
      randomHash: (caseOpening as any).randomHash,
      // Legacy VRF fields (for backwards compatibility)
      vrfRequestId: caseOpening.vrfRequestId,
      randomnessSeed: caseOpening.randomnessSeed,
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
        claimed: (caseOpening.userSkin as any).claimed || false,
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
      console.log(`✅ [DECISION] User kept NFT: ${caseOpening.userSkin?.nftMintAddress}`);
      result.addedToInventory = true;
    } else if (decision === 'buyback' && caseOpening.userSkin) {
      // ═══════════════════════════════════════════════════════════
      //  OFF-CHAIN BUYBACK (Instant)
      // ═══════════════════════════════════════════════════════════

      const currentPrice = caseOpening.userSkin.currentPriceUsd || 0;
      const buybackPrice = currentPrice * 0.85; // 85% buyback rate

      // Execute real buyback (SOL to user)
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }
      const buybackResult = await simpleSolanaService.sendSOL({
        toWallet: user.walletAddress,
        amount: buybackPrice,
      });

      console.log(`💰 [BUYBACK] Executed`);
      console.log(`   NFT: ${caseOpening.userSkin.nftMintAddress}`);
      console.log(`   Original Price: $${currentPrice.toFixed(2)}`);
      console.log(`   Buyback Price: $${buybackPrice.toFixed(2)}`);
      console.log(`   Transaction: ${buybackResult.transaction}`);

      // Mark skin as sold
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

      // TODO: Credit user balance (when user balance system is implemented)

      result.buybackPrice = buybackPrice;
      result.addedToInventory = false;
      result.transaction = buybackResult.transaction;
      result.solSent = true;
    }

    // Update status
    await this.caseOpeningRepository.update(caseOpeningId, {
      status: 'decided',
    } as any);

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

  /**
   * Upload metadata to Walrus
   */
  private async uploadToWalrus(metadata: any): Promise<string> {
    const WALRUS_PUBLISHER = process.env.WALRUS_PUBLISHER || 'https://publisher.walrus-testnet.walrus.space';
    const WALRUS_AGGREGATOR = process.env.WALRUS_AGGREGATOR || 'https://aggregator.walrus-testnet.walrus.space';
    
    console.log(`📝 [WALRUS] Uploading metadata...`);
    
    try {
      const jsonString = JSON.stringify(metadata);
      const blob = Buffer.from(jsonString, 'utf-8');
      
      const response = await axios.put(`${WALRUS_PUBLISHER}/v1/store`, blob, {
        headers: {
          'Content-Type': 'application/octet-stream',
        },
        maxBodyLength: Infinity,
        timeout: 10000, // 10 seconds max
      });

      if (response.data?.newlyCreated?.blobObject?.blobId) {
        const blobId = response.data.newlyCreated.blobObject.blobId;
        const uri = `${WALRUS_AGGREGATOR}/v1/${blobId}`;
        console.log(`✅ [WALRUS] Uploaded: ${uri}`);
        return uri;
      } else if (response.data?.alreadyCertified?.blobId) {
        const blobId = response.data.alreadyCertified.blobId;
        const uri = `${WALRUS_AGGREGATOR}/v1/${blobId}`;
        console.log(`✅ [WALRUS] Already exists: ${uri}`);
        return uri;
      }

      throw new Error('Invalid Walrus response');
    } catch (error) {
      console.error('❌ [WALRUS] Upload failed:', error instanceof Error ? error.message : String(error));
      // Fallback to using image URL directly if Walrus fails
      console.log('⚠️  [WALRUS] Using fallback metadata URI');
      return metadata.image || '';
    }
  }

  /**
   * Mint a real Core NFT on-chain
   */
  private async mintCoreNFT(params: {
    name: string;
    skinTemplate: any;
    owner: string;
  }): Promise<{ mint: string; transaction: string }> {
    const { name, skinTemplate, owner } = params;
    
    // Get admin keypair from environment
    const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;
    if (!ADMIN_PRIVATE_KEY) {
      throw new Error('ADMIN_PRIVATE_KEY not configured');
    }

    // Setup Solana connection
    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    
    // Setup Umi
    const umi = createUmi(rpcUrl).use(mplCore());
    
    // Convert admin keypair
    const adminKeypairBytes = bs58.decode(ADMIN_PRIVATE_KEY);
    const adminKeypair = umi.eddsa.createKeypairFromSecretKey(adminKeypairBytes);
    const adminSigner = createSignerFromKeypair(umi, adminKeypair);
    umi.use(signerIdentity(adminSigner));

    // Prepare metadata
    const metadata = {
      name,
      description: skinTemplate.description || `${skinTemplate.weapon} | ${skinTemplate.skinName} - ${skinTemplate.rarity}`,
      image: skinTemplate.imageUrl,
      attributes: [
        { trait_type: 'Weapon', value: skinTemplate.weapon },
        { trait_type: 'Skin', value: skinTemplate.skinName },
        { trait_type: 'Rarity', value: skinTemplate.rarity },
        { trait_type: 'Condition', value: skinTemplate.condition },
        { trait_type: 'Base Price USD', value: skinTemplate.basePriceUsd.toString() },
      ],
    };

    // Upload metadata to Walrus
    const metadataUri = await this.uploadToWalrus(metadata);

    // Generate asset signer
    const asset = generateSigner(umi);

    // Mint Core NFT with owner set to user's wallet
    console.log(`🔨 [CORE NFT] Minting to owner: ${owner}...`);
    
    const tx = await create(umi, {
      asset,
      name,
      uri: metadataUri,
      owner: owner as any, // Will be converted to Umi PublicKey internally
      plugins: [],
    }).sendAndConfirm(umi);

    const signature = bs58.encode(tx.signature);

    return {
      mint: asset.publicKey,
      transaction: signature,
    };
  }

} 