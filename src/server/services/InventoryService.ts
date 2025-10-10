import { UserSkinRepository } from "../repositories/UserSkinRepository";
import { TransactionRepository } from "../repositories/TransactionRepository";
import { UserRepository } from "../repositories/UserRepository";
import { AppError } from "../middlewares/errorHandler";
import { TransactionType, TransactionStatus } from "../entities/Transaction";
import { simpleSolanaService } from "./simpleSolana.service";
import { convertUsdToSol, resolveUsdPerSol } from "../utils/currency";

export class InventoryService {
  private userSkinRepository: UserSkinRepository;
  private transactionRepository: TransactionRepository;
  private userRepository: UserRepository;

  constructor() {
    this.userSkinRepository = new UserSkinRepository();
    this.transactionRepository = new TransactionRepository();
    this.userRepository = new UserRepository();
  }

  async getUserInventory(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      search?: string;
      sortBy?: string;
      filterBy?: string;
    }
  ) {
    const page = options.page || 1;
    const limit = Math.min(options.limit || 20, 100);
    const skip = (page - 1) * limit;

    const [userSkins, total] = await this.userSkinRepository.findByUser(
      userId,
      {
        skip,
        take: limit,
        search: options.search,
        rarity: options.filterBy,
        sortBy: options.sortBy,
        inInventoryOnly: true,
      }
    );

    const skins = userSkins.map((userSkin) => ({
      id: userSkin.id,
      skinTemplate: {
        weapon: userSkin.skinTemplate?.weapon || "",
        skinName: userSkin.skinTemplate?.skinName || "",
        rarity: userSkin.skinTemplate?.rarity || "",
        condition: userSkin.skinTemplate?.condition || "",
        imageUrl: userSkin.skinTemplate?.imageUrl || "",
      },
      currentPriceUsd: userSkin.currentPriceUsd || 0,
      currentPrice: userSkin.currentPriceUsd || 0, // Alias for frontend
      nftMintAddress: userSkin.nftMintAddress,
      mintAddress: userSkin.nftMintAddress, // Alias for frontend
      openedAt: userSkin.openedAt,
      acquiredAt: userSkin.openedAt, // Alias for frontend
      canSell: userSkin.isInInventory && !userSkin.soldViaBuyback,
      condition: userSkin.skinTemplate?.condition || "",
      status: userSkin.isInInventory ? "owned" : "sold",
    }));

    const summary = await this.userSkinRepository.getUserInventoryStats(userId);

    return {
      skins,
      summary,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async sellSkinViaBuyback(
    userId: string,
    skinId: string,
    minAcceptablePrice?: number
  ) {
    const userSkin = await this.userSkinRepository.findById(skinId);

    if (!userSkin) {
      throw new AppError("Skin not found", 404, "SKIN_NOT_FOUND");
    }

    if (userSkin.userId !== userId) {
      throw new AppError("You do not own this skin", 403, "NOT_SKIN_OWNER");
    }

    if (!userSkin.isInInventory || userSkin.soldViaBuyback) {
      throw new AppError(
        "Skin is not available for sale",
        400,
        "SKIN_NOT_AVAILABLE"
      );
    }

    const rawBuybackPercentage = Number(process.env.BUYBACK_PERCENTAGE ?? "85");
    const buybackPercentage = Number.isFinite(rawBuybackPercentage)
      ? rawBuybackPercentage
      : 85;
    const buybackRate = buybackPercentage / 100;

    const currentPriceUsd = Number(
      userSkin.currentPriceUsd ??
        userSkin.skinTemplate?.basePriceUsd ??
        0
    );
    const buybackPriceUsd = currentPriceUsd * buybackRate;

    if (
      !Number.isFinite(buybackPriceUsd) ||
      buybackPriceUsd <= 0
    ) {
      throw new AppError(
        "Buyback amount is too small to process",
        400,
        "BUYBACK_TOO_SMALL"
      );
    }

    if (minAcceptablePrice && buybackPriceUsd < minAcceptablePrice) {
      throw new AppError(
        `Current buyback price (${buybackPriceUsd.toFixed(
          2
        )}) is below minimum acceptable price`,
        400,
        "PRICE_TOO_LOW"
      );
    }

    // ═══════════════════════════════════════════════════════════
    //  OFF-CHAIN BUYBACK (Mock Solana Service)
    // ═══════════════════════════════════════════════════════════

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Execute real buyback (send SOL to user)
    const usdPerSol = resolveUsdPerSol(userSkin.lootBoxType);
    const rawBuybackPriceSol = convertUsdToSol(
      buybackPriceUsd,
      userSkin.lootBoxType
    );
    const minBuybackSol = Number(process.env.MIN_BUYBACK_AMOUNT ?? "0");
    const buybackPriceSol =
      rawBuybackPriceSol > 0
        ? Math.max(
            rawBuybackPriceSol,
            minBuybackSol > 0 ? minBuybackSol : 0
          )
        : 0;

    if (!Number.isFinite(buybackPriceSol) || buybackPriceSol <= 0) {
      throw new AppError(
        "Calculated buyback SOL amount is invalid",
        400,
        "BUYBACK_TOO_SMALL"
      );
    }

    console.log(
      `💰 [INVENTORY BUYBACK] Sending ${buybackPriceSol} SOL to ${user.walletAddress}`
    );
    
    const buybackResult = await simpleSolanaService.sendSOL({
      toWallet: user.walletAddress,
      amount: buybackPriceSol,
    });
    
    console.log(`✅ [BUYBACK COMPLETE] Transaction: ${buybackResult.transaction}`);

    console.log(`💰 [INVENTORY BUYBACK] Executed`);
    console.log(`   User: ${userId}`);
    console.log(`   NFT: ${userSkin.nftMintAddress}`);
    console.log(`   Skin: ${userSkin.skinTemplate?.weapon} | ${userSkin.skinTemplate?.skinName}`);
    console.log(`   Original Price: $${currentPriceUsd.toFixed(2)}`);
    console.log(
      `   Buyback Price: $${buybackPriceUsd.toFixed(2)} ` +
      `(~${buybackPriceSol.toFixed(6)} SOL @ $${usdPerSol.toFixed(2)}/SOL)`
    );
    console.log(`   Transaction: ${buybackResult.transaction}`);

    // Create buyback transaction
    const transaction = await this.transactionRepository.create({
      userId,
      transactionType: TransactionType.BUYBACK,
      amountUsd: buybackPriceUsd,
      amountUsdc: buybackPriceUsd,
      amountSol: buybackPriceSol,
      userSkinId: skinId,
      status: TransactionStatus.CONFIRMED,
      txHash: buybackResult.transaction,
    } as any);

    // Mark skin as sold
    await this.userSkinRepository.markAsSold(skinId, buybackPriceUsd);

    // TODO: Credit user balance (when user balance system is implemented)

    return {
      soldSkin: {
        id: userSkin.id,
        weapon: userSkin.skinTemplate?.weapon,
        skinName: userSkin.skinTemplate?.skinName,
        originalPrice: currentPriceUsd,
        buybackPrice: buybackPriceUsd,
        buybackPriceSol,
        buybackPercentage,
      },
      transaction: {
        id: transaction.id,
        amountUsdc: buybackPriceUsd,
        amountSol: buybackPriceSol,
        txHash: buybackResult.transaction,
        status: transaction.status,
      },
      burned: buybackResult.burned,
      credited: buybackResult.credited,
    };
  }

  async getSkinDetails(userId: string, skinId: string) {
    const userSkin = await this.userSkinRepository.findById(skinId);

    if (!userSkin) {
      throw new AppError("Skin not found", 404, "SKIN_NOT_FOUND");
    }

    if (userSkin.userId !== userId) {
      throw new AppError("You do not own this skin", 403, "NOT_SKIN_OWNER");
    }

    return {
      id: userSkin.id,
      weapon: userSkin.skinTemplate?.weapon,
      skinName: userSkin.skinTemplate?.skinName,
      rarity: userSkin.skinTemplate?.rarity,
      condition: userSkin.skinTemplate?.condition,
      currentPriceUsd: userSkin.currentPriceUsd,
      imageUrl: userSkin.skinTemplate?.imageUrl,
      exteriorImageUrl: userSkin.skinTemplate?.exteriorImageUrl,
      description: userSkin.skinTemplate?.description,
      collection: userSkin.skinTemplate?.collection,
      nftMintAddress: userSkin.nftMintAddress,
      metadataUri: userSkin.metadataUri,
      name: userSkin.name,
      symbol: userSkin.symbol,
      openedAt: userSkin.openedAt,
      lootBoxType: userSkin.lootBoxType?.name,
      isInInventory: userSkin.isInInventory,
      soldViaBuyback: userSkin.soldViaBuyback,
      buybackAmount: userSkin.buybackAmount,
      buybackAt: userSkin.buybackAt,
      lastPriceUpdate: userSkin.lastPriceUpdate,
    };
  }

  async getInventoryValue(userId: string): Promise<number> {
    return this.userSkinRepository.getUserInventoryValue(userId);
  }

  async getInventoryStats(userId: string) {
    return this.userSkinRepository.getUserInventoryStats(userId);
  }
}
