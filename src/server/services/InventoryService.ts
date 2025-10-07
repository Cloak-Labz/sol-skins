import { UserSkinRepository } from "../repositories/UserSkinRepository";
import { TransactionRepository } from "../repositories/TransactionRepository";
import { AppError } from "../middlewares/errorHandler";
import { TransactionType, TransactionStatus } from "../entities/Transaction";

export class InventoryService {
  private userSkinRepository: UserSkinRepository;
  private transactionRepository: TransactionRepository;

  constructor() {
    this.userSkinRepository = new UserSkinRepository();
    this.transactionRepository = new TransactionRepository();
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

    const currentPrice =
      userSkin.currentPriceUsd || userSkin.skinTemplate?.basePriceUsd || 0;
    const buybackPrice = currentPrice * 0.85; // 85% of current market value

    if (minAcceptablePrice && buybackPrice < minAcceptablePrice) {
      throw new AppError(
        `Current buyback price (${buybackPrice.toFixed(
          2
        )}) is below minimum acceptable price`,
        400,
        "PRICE_TOO_LOW"
      );
    }

    // TODO: Call Solana program's sell_back instruction
    // The program signature is now: sell_back(market_price: u64, min_price: u64)
    // where market_price is the current USD price (in micro-units, e.g., $10 = 10_000_000)
    // and min_price is the user's slippage protection
    // The program will calculate: payout = market_price * 0.85 - (market_price * 0.01)
    // Example call (pseudo-code):
    // await program.methods
    //   .sellBack(
    //     new BN(currentPrice * 1_000_000), // market_price in micro-USD
    //     new BN(minAcceptablePrice * 1_000_000) // min_price in micro-USD
    //   )
    //   .accounts({ /* ... */ })
    //   .rpc();

    // Create buyback transaction
    const transaction = await this.transactionRepository.create({
      userId,
      transactionType: TransactionType.BUYBACK,
      amountUsd: buybackPrice,
      amountUsdc: buybackPrice, // Assuming 1:1 USDC to USD
      userSkinId: skinId,
      status: TransactionStatus.PENDING,
    });

    // Mark skin as sold
    await this.userSkinRepository.markAsSold(skinId, buybackPrice);

    return {
      soldSkin: {
        id: userSkin.id,
        weapon: userSkin.skinTemplate?.weapon,
        skinName: userSkin.skinTemplate?.skinName,
        originalPrice: currentPrice,
        buybackPrice: buybackPrice,
        buybackPercentage: 85,
      },
      transaction: {
        id: transaction.id,
        amountUsdc: buybackPrice,
        txHash: transaction.txHash,
        status: transaction.status,
      },
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
