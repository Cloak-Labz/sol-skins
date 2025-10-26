import "reflect-metadata";
import { AppDataSource } from "../config/database";
import { LootBoxType } from "../entities/LootBoxType";
import { SkinTemplate } from "../entities/SkinTemplate";
import { LootBoxSkinPool } from "../entities/LootBoxSkinPool";
import { User } from "../entities/User";
import { UserSkin } from "../entities/UserSkin";
import {
  Transaction,
  TransactionType,
  TransactionStatus,
} from "../entities/Transaction";
import { PriceHistory, PriceSource } from "../entities/PriceHistory";

async function seedDatabase() {
  try {
    console.log("🌱 Starting database seeding...");

    // Initialize database connection
    await AppDataSource.initialize();
    console.log("✅ Database connected");

    // Clear existing data using raw SQL to handle foreign key constraints
    await AppDataSource.query("TRUNCATE TABLE price_history CASCADE");
    await AppDataSource.query("TRUNCATE TABLE transactions CASCADE");
    await AppDataSource.query("TRUNCATE TABLE user_skins CASCADE");
    await AppDataSource.query("TRUNCATE TABLE loot_box_skin_pools CASCADE");
    await AppDataSource.query("TRUNCATE TABLE skin_templates CASCADE");
    await AppDataSource.query("TRUNCATE TABLE loot_box_types CASCADE");
    await AppDataSource.query("TRUNCATE TABLE users CASCADE");
    console.log("🧹 Cleared existing data");

    // Create skin templates
    const skinTemplates = await createSkinTemplates();
    console.log(`✅ Created ${skinTemplates.length} skin templates`);

    // Create loot box types
    const lootBoxTypes = await createLootBoxTypes();
    console.log(`✅ Created ${lootBoxTypes.length} loot box types`);

    // Create loot box skin pools
    await createLootBoxSkinPools(lootBoxTypes, skinTemplates);
    console.log("✅ Created loot box skin pools");

    // Create test users
    const users = await createTestUsers();
    console.log(`✅ Created ${users.length} test users`);

    // Create some user skins for testing
    await createUserSkins(users, skinTemplates, lootBoxTypes);
    console.log("✅ Created user skins");

    // Create price history
    await createPriceHistory(skinTemplates);
    console.log("✅ Created price history");

    // Create some transactions
    await createTransactions(users, lootBoxTypes);
    console.log("✅ Created transactions");

    console.log("🎉 Database seeding completed successfully!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
  } finally {
    await AppDataSource.destroy();
  }
}

async function createSkinTemplates(): Promise<SkinTemplate[]> {
  const skins = [
    // AK-47 Skins
    {
      weapon: "AK-47",
      skinName: "Redline",
      rarity: "Rare",
      condition: "Field-Tested",
      basePriceUsd: 45.2,
      collection: "The Phoenix Collection",
    },
    {
      weapon: "AK-47",
      skinName: "Vulcan",
      rarity: "Epic",
      condition: "Factory New",
      basePriceUsd: 125.5,
      collection: "The Phoenix Collection",
    },
    {
      weapon: "AK-47",
      skinName: "Fire Serpent",
      rarity: "Legendary",
      condition: "Field-Tested",
      basePriceUsd: 450.0,
      collection: "The Cobblestone Collection",
    },
    {
      weapon: "AK-47",
      skinName: "Blue Laminate",
      rarity: "Common",
      condition: "Minimal Wear",
      basePriceUsd: 2.5,
      collection: "The Dust Collection",
    },
    {
      weapon: "AK-47",
      skinName: "Jaguar",
      rarity: "Uncommon",
      condition: "Well-Worn",
      basePriceUsd: 8.75,
      collection: "The Dust Collection",
    },

    // AWP Skins
    {
      weapon: "AWP",
      skinName: "Dragon Lore",
      rarity: "Legendary",
      condition: "Factory New",
      basePriceUsd: 2500.0,
      collection: "The Cobblestone Collection",
    },
    {
      weapon: "AWP",
      skinName: "Asiimov",
      rarity: "Epic",
      condition: "Field-Tested",
      basePriceUsd: 85.3,
      collection: "The Phoenix Collection",
    },
    {
      weapon: "AWP",
      skinName: "Redline",
      rarity: "Rare",
      condition: "Minimal Wear",
      basePriceUsd: 25.4,
      collection: "The Phoenix Collection",
    },
    {
      weapon: "AWP",
      skinName: "Corticera",
      rarity: "Uncommon",
      condition: "Field-Tested",
      basePriceUsd: 12.8,
      collection: "The Dust Collection",
    },
    {
      weapon: "AWP",
      skinName: "Worm God",
      rarity: "Common",
      condition: "Battle-Scarred",
      basePriceUsd: 1.2,
      collection: "The Dust Collection",
    },

    // M4A4 Skins
    {
      weapon: "M4A4",
      skinName: "Howl",
      rarity: "Legendary",
      condition: "Factory New",
      basePriceUsd: 1200.0,
      collection: "The Phoenix Collection",
    },
    {
      weapon: "M4A4",
      skinName: "Asiimov",
      rarity: "Epic",
      condition: "Field-Tested",
      basePriceUsd: 65.2,
      collection: "The Phoenix Collection",
    },
    {
      weapon: "M4A4",
      skinName: "X-Ray",
      rarity: "Rare",
      condition: "Minimal Wear",
      basePriceUsd: 18.9,
      collection: "The Phoenix Collection",
    },
    {
      weapon: "M4A4",
      skinName: "Desert-Strike",
      rarity: "Uncommon",
      condition: "Field-Tested",
      basePriceUsd: 5.5,
      collection: "The Dust Collection",
    },
    {
      weapon: "M4A4",
      skinName: "Tornado",
      rarity: "Common",
      condition: "Well-Worn",
      basePriceUsd: 0.85,
      collection: "The Dust Collection",
    },

    // Glock Skins
    {
      weapon: "Glock-18",
      skinName: "Fade",
      rarity: "Legendary",
      condition: "Factory New",
      basePriceUsd: 350.0,
      collection: "The Phoenix Collection",
    },
    {
      weapon: "Glock-18",
      skinName: "Water Elemental",
      rarity: "Epic",
      condition: "Minimal Wear",
      basePriceUsd: 45.6,
      collection: "The Phoenix Collection",
    },
    {
      weapon: "Glock-18",
      skinName: "Steel Disruption",
      rarity: "Rare",
      condition: "Field-Tested",
      basePriceUsd: 8.25,
      collection: "The Phoenix Collection",
    },
    {
      weapon: "Glock-18",
      skinName: "Sand Dune",
      rarity: "Common",
      condition: "Battle-Scarred",
      basePriceUsd: 0.15,
      collection: "The Dust Collection",
    },

    // USP-S Skins
    {
      weapon: "USP-S",
      skinName: "Kill Confirmed",
      rarity: "Epic",
      condition: "Factory New",
      basePriceUsd: 95.8,
      collection: "The Phoenix Collection",
    },
    {
      weapon: "USP-S",
      skinName: "Orion",
      rarity: "Rare",
      condition: "Minimal Wear",
      basePriceUsd: 15.4,
      collection: "The Phoenix Collection",
    },
    {
      weapon: "USP-S",
      skinName: "Forest Leaves",
      rarity: "Uncommon",
      condition: "Field-Tested",
      basePriceUsd: 2.1,
      collection: "The Dust Collection",
    },
  ];

  const skinTemplates: SkinTemplate[] = [];

  for (const skin of skins) {
    const template = new SkinTemplate();
    template.weapon = skin.weapon;
    template.skinName = skin.skinName;
    template.rarity = skin.rarity as any;
    template.condition = skin.condition as any;
    template.basePriceUsd = skin.basePriceUsd;
    template.collection = skin.collection;
    template.imageUrl = `https://steamcommunity-a.akamaihd.net/economy/image/class/730/${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    template.exteriorImageUrl = template.imageUrl;
    template.description = `${skin.weapon} | ${skin.skinName} (${skin.condition})`;
    template.isActive = true;

    skinTemplates.push(template);
  }

  return await AppDataSource.getRepository(SkinTemplate).save(skinTemplates);
}

async function createLootBoxTypes(): Promise<LootBoxType[]> {
  const lootBoxes = [
    {
      name: "Weapon Case",
      description: "Contains various weapon skins from The Phoenix Collection",
      priceSol: 2.5,
      priceUsdc: 25.0,
      rarity: "Standard",
      isActive: true,
      isFeatured: true,
      chanceCommon: 79.92,
      chanceUncommon: 15.98,
      chanceRare: 3.2,
      chanceEpic: 0.64,
      chanceLegendary: 0.26,
      maxSupply: 1000,
      remainingSupply: 1000,
    },
    {
      name: "Phoenix Case",
      description: "Premium case with higher chances for rare skins",
      priceSol: 5.0,
      priceUsdc: 50.0,
      rarity: "Premium",
      isActive: true,
      isFeatured: true,
      chanceCommon: 65.0,
      chanceUncommon: 25.0,
      chanceRare: 8.0,
      chanceEpic: 1.8,
      chanceLegendary: 0.2,
      maxSupply: 500,
      remainingSupply: 500,
    },
    {
      name: "Cobblestone Case",
      description: "Legendary case with exclusive high-value skins",
      priceSol: 25.0,
      priceUsdc: 250.0,
      rarity: "Legendary",
      isActive: true,
      isFeatured: false,
      chanceCommon: 40.0,
      chanceUncommon: 35.0,
      chanceRare: 20.0,
      chanceEpic: 4.5,
      chanceLegendary: 0.5,
      maxSupply: 100,
      remainingSupply: 100,
    },
    {
      name: "Dust Collection Case",
      description: "Budget-friendly case with common skins",
      priceSol: 0.5,
      priceUsdc: 5.0,
      rarity: "Standard",
      isActive: true,
      isFeatured: false,
      chanceCommon: 85.0,
      chanceUncommon: 12.0,
      chanceRare: 2.5,
      chanceEpic: 0.4,
      chanceLegendary: 0.1,
      maxSupply: null, // Unlimited supply
      remainingSupply: 0,
    },
  ];

  const lootBoxTypes: LootBoxType[] = [];

  for (const box of lootBoxes) {
    const lootBox = new LootBoxType();
    lootBox.name = box.name;
    lootBox.description = box.description;
    lootBox.priceSol = box.priceSol;
    lootBox.priceUsdc = box.priceUsdc;
    lootBox.rarity = box.rarity as any;
    lootBox.isActive = box.isActive;
    lootBox.isFeatured = box.isFeatured;
    lootBox.chanceCommon = box.chanceCommon;
    lootBox.chanceUncommon = box.chanceUncommon;
    lootBox.chanceRare = box.chanceRare;
    lootBox.chanceEpic = box.chanceEpic;
    lootBox.chanceLegendary = box.chanceLegendary;
    lootBox.maxSupply = box.maxSupply ?? undefined;
    lootBox.remainingSupply = box.remainingSupply ?? undefined;
    lootBox.imageUrl = `https://steamcommunity-a.akamaihd.net/economy/image/class/730/${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    lootBoxTypes.push(lootBox);
  }

  return await AppDataSource.getRepository(LootBoxType).save(lootBoxTypes);
}

async function createLootBoxSkinPools(
  lootBoxTypes: LootBoxType[],
  skinTemplates: SkinTemplate[]
) {
  const pools = [];

  for (const lootBox of lootBoxTypes) {
    for (const skin of skinTemplates) {
      // Determine weight based on rarity and loot box type
      let weight = 1;

      if (lootBox.rarity === "Legendary") {
        // Cobblestone case has higher weights for rare skins
        if (skin.rarity === "Legendary") weight = 100;
        else if (skin.rarity === "Epic") weight = 50;
        else if (skin.rarity === "Rare") weight = 25;
        else if (skin.rarity === "Uncommon") weight = 10;
        else weight = 1;
      } else if (lootBox.rarity === "Premium") {
        // Phoenix case balanced weights
        if (skin.rarity === "Legendary") weight = 50;
        else if (skin.rarity === "Epic") weight = 25;
        else if (skin.rarity === "Rare") weight = 15;
        else if (skin.rarity === "Uncommon") weight = 8;
        else weight = 3;
      } else {
        // Standard cases favor common skins
        if (skin.rarity === "Legendary") weight = 1;
        else if (skin.rarity === "Epic") weight = 5;
        else if (skin.rarity === "Rare") weight = 10;
        else if (skin.rarity === "Uncommon") weight = 20;
        else weight = 50;
      }

      const pool = new LootBoxSkinPool();
      pool.lootBoxTypeId = lootBox.id;
      pool.skinTemplateId = skin.id;
      pool.weight = weight;

      pools.push(pool);
    }
  }

  await AppDataSource.getRepository(LootBoxSkinPool).save(pools);
}

async function createTestUsers(): Promise<User[]> {
  const users = [
    {
      walletAddress: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
      username: "CryptoGamer",
      email: "crypto@example.com",
      tradeUrl:
        "https://steamcommunity.com/tradeoffer/new/?partner=123456789&token=abcdefgh",
      totalSpent: 1250.5,
      totalEarned: 2890.75,
      casesOpened: 45,
    },
    {
      walletAddress: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
      username: "SkinCollector",
      email: "collector@example.com",
      tradeUrl:
        "https://steamcommunity.com/tradeoffer/new/?partner=987654321&token=ijklmnop",
      totalSpent: 850.25,
      totalEarned: 1200.3,
      casesOpened: 28,
    },
    {
      walletAddress: "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5ThZn4NHP",
      username: "LuckyTrader",
      email: "lucky@example.com",
      tradeUrl: null,
      totalSpent: 2100.0,
      totalEarned: 4500.0,
      casesOpened: 78,
    },
  ];

  const userEntities: User[] = [];

  for (const userData of users) {
    const user = new User();
    user.walletAddress = userData.walletAddress;
    user.username = userData.username;
    user.email = userData.email;
    user.tradeUrl = userData.tradeUrl ?? undefined;
    user.totalSpent = userData.totalSpent;
    user.totalEarned = userData.totalEarned;
    user.casesOpened = userData.casesOpened;
    user.isActive = true;
    user.lastLogin = new Date();

    userEntities.push(user);
  }

  return await AppDataSource.getRepository(User).save(userEntities);
}

async function createUserSkins(
  users: User[],
  skinTemplates: SkinTemplate[],
  lootBoxTypes: LootBoxType[]
) {
  const userSkins = [];

  // Give each user some random skins
  for (const user of users) {
    const numSkins = Math.floor(Math.random() * 8) + 3; // 3-10 skins per user

    for (let i = 0; i < numSkins; i++) {
      const randomSkin =
        skinTemplates[Math.floor(Math.random() * skinTemplates.length)];
      const randomLootBox =
        lootBoxTypes[Math.floor(Math.random() * lootBoxTypes.length)];

      const userSkin = new UserSkin();
      userSkin.userId = user.id;
      userSkin.skinTemplateId = randomSkin.id;
      userSkin.nftMintAddress = `NFT${Math.random()
        .toString(36)
        .substr(2, 9)}${Math.random().toString(36).substr(2, 9)}`;
      userSkin.lootBoxTypeId = randomLootBox.id;
      userSkin.openedAt = new Date(
        Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
      ); // Random date in last 30 days
      userSkin.isInInventory = Math.random() > 0.3; // 70% chance to be in inventory
      userSkin.soldViaBuyback = !userSkin.isInInventory;
      userSkin.buybackAmount = userSkin.soldViaBuyback
        ? randomSkin.basePriceUsd * 0.85
        : undefined;
      userSkin.buybackAt = userSkin.soldViaBuyback ? new Date() : undefined;
      userSkin.metadataUri = `https://api.dust3.com/metadata/${userSkin.nftMintAddress}`;
      userSkin.name = `${randomSkin.weapon} | ${randomSkin.skinName}`;
      userSkin.symbol = "SKIN";
      userSkin.currentPriceUsd =
        randomSkin.basePriceUsd * (0.8 + Math.random() * 0.4); // ±20% price variation
      userSkin.lastPriceUpdate = new Date();

      userSkins.push(userSkin);
    }
  }

  await AppDataSource.getRepository(UserSkin).save(userSkins);
}

async function createPriceHistory(skinTemplates: SkinTemplate[]) {
  const priceHistory = [];

  for (const skin of skinTemplates) {
    // Create price history for the last 30 days
    for (let i = 0; i < 30; i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const priceVariation = 0.8 + Math.random() * 0.4; // ±20% variation
      const price = skin.basePriceUsd * priceVariation;

      const history = new PriceHistory();
      history.skinTemplateId = skin.id;
      history.priceUsd = price;
      history.source = PriceSource.STEAM_MARKET;
      history.recordedAt = date;

      priceHistory.push(history);
    }
  }

  await AppDataSource.getRepository(PriceHistory).save(priceHistory);
}

async function createTransactions(users: User[], lootBoxTypes: LootBoxType[]) {
  const transactions = [];

  for (const user of users) {
    // Create some random transactions for each user
    const numTransactions = Math.floor(Math.random() * 15) + 5; // 5-19 transactions per user

    for (let i = 0; i < numTransactions; i++) {
      const transaction = new Transaction();
      transaction.userId = user.id;
      transaction.transactionType =
        Math.random() > 0.7
          ? TransactionType.BUYBACK
          : TransactionType.OPEN_CASE;
      transaction.amountSol = Math.random() * 10 + 1; // 1-11 SOL
      transaction.amountUsdc = transaction.amountSol * 100; // Approximate SOL to USDC
      transaction.amountUsd = transaction.amountUsdc;
      transaction.lootBoxTypeId =
        lootBoxTypes[Math.floor(Math.random() * lootBoxTypes.length)].id;
      transaction.txHash = `tx${Math.random()
        .toString(36)
        .substr(2, 9)}${Math.random().toString(36).substr(2, 9)}`;
      transaction.blockSlot = Math.floor(Math.random() * 1000000) + 1000000;
      transaction.confirmedAt = new Date(
        Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
      );
      transaction.status =
        Math.random() > 0.1
          ? TransactionStatus.CONFIRMED
          : TransactionStatus.PENDING; // 90% confirmed

      transactions.push(transaction);
    }
  }

  await AppDataSource.getRepository(Transaction).save(transactions);
}

// Run the seeding
seedDatabase();
