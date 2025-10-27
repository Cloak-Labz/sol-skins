import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { SkinTemplate } from '../entities/SkinTemplate';

const testSkins = [
  // Common skins (50% drop rate)
  {
    weapon: 'AK-47 | Redline',
    rarity: 'Common',
    exterior: 'Field-Tested',
    price: 25.50,
    imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV09-5lpKKqPrxN7LEmyVQ7MEpiLuSrYmnjQO3-UdsZGHyd4_Bd1RvNQ7T_FDrw-_ng5Pu75iY1zI97bhSLVKj/360fx360f',
    metadataUri: 'https://arweave.net/test-ak47-redline',
    steamMarketUrl: 'https://steamcommunity.com/market/listings/730/AK-47%20%7C%20Redline%20%28Field-Tested%29',
  },
  {
    name: 'M4A4 | Desert-Strike',
    rarity: 'Common',
    exterior: 'Minimal Wear',
    price: 18.75,
    imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpou-6kejhjxszFJTwW09-5gZKKmPnLPr7Vn35cppQg2L2Xo9-m3VHj-0Y5ZWz7doSRdgI9aVnZ-wLtxOy-hJG0vZvKwXVqvyEm5HzUmBCpwUYbHvdqFQQ/360fx360f',
    metadataUri: 'https://arweave.net/test-m4a4-desert',
    steamMarketUrl: 'https://steamcommunity.com/market/listings/730/M4A4%20%7C%20Desert-Strike%20%28Minimal%20Wear%29',
  },
  {
    name: 'AWP | Worm God',
    rarity: 'Common',
    exterior: 'Factory New',
    price: 12.30,
    imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot621FAR17PLfYQJD_9W7m5a0mvLwOq7c2D0Bv8Qh3-yU8Nqm2wK2_0U9Yzv3JoTGdFRvMFHY_1K_xO7n1sO6uZTOzHMwvCUj7CnfyRfhgEtSLrs4Rvs7Uw/360fx360f',
    metadataUri: 'https://arweave.net/test-awp-worm',
    steamMarketUrl: 'https://steamcommunity.com/market/listings/730/AWP%20%7C%20Worm%20God%20%28Factory%20New%29',
  },

  // Uncommon skins (25% drop rate)
  {
    name: 'AK-47 | Frontside Misty',
    rarity: 'Uncommon',
    exterior: 'Field-Tested',
    price: 45.80,
    imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV09G_mIGSqPv9NLPF2G0AuMQh2LGV9Nqj2wG2_hA9NWr6cNSVcFU3Zw7V_lK-yO3qjJO-vJXMnXZqsyQh7HzfyUKwgxlFaOdxxavJRKWZSQA/360fx360f',
    metadataUri: 'https://arweave.net/test-ak47-frontside',
    steamMarketUrl: 'https://steamcommunity.com/market/listings/730/AK-47%20%7C%20Frontside%20Misty%20%28Field-Tested%29',
  },
  {
    name: 'M4A1-S | Hyper Beast',
    rarity: 'Uncommon',
    exterior: 'Well-Worn',
    price: 52.40,
    imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpou-6kejhz2v_Nfz5H_uO1gb-Gw_alDL_UhmpB7Pp9g-7J4cL33Fbm_0M6YGD6cYPEJgU8Zg2B_Qe5xb3u1pC-6ZvPwCNhvyVx4XvfnhCpwUYbvHDGBXk/360fx360f',
    metadataUri: 'https://arweave.net/test-m4a1s-hyper',
    steamMarketUrl: 'https://steamcommunity.com/market/listings/730/M4A1-S%20%7C%20Hyper%20Beast%20%28Well-Worn%29',
  },

  // Rare skins (15% drop rate)
  {
    name: 'AK-47 | Vulcan',
    rarity: 'Rare',
    exterior: 'Field-Tested',
    price: 125.50,
    imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV08-_mIGSqPv9NLPF2GpTu8Aj3uyZ8I2t2wDk-UVqMWD6cYKXIAE3YVnU_1K3wOe6hJC_uZXKnHBg6D5iuyg7P0GGZA/360fx360f',
    metadataUri: 'https://arweave.net/test-ak47-vulcan',
    steamMarketUrl: 'https://steamcommunity.com/market/listings/730/AK-47%20%7C%20Vulcan%20%28Field-Tested%29',
  },
  {
    name: 'AWP | Asiimov',
    rarity: 'Rare',
    exterior: 'Field-Tested',
    price: 98.75,
    imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot621FAR17PLfYQJD_9W7m5a0mvLwOq7c2GpTu8Aj3uyZ8I2t2wDk-UVqMWD6cYKXIAE3YVnU_1K3wOe6hJC_uZXKnHBg6D5iuyg7P0GGZA/360fx360f',
    metadataUri: 'https://arweave.net/test-awp-asiimov',
    steamMarketUrl: 'https://steamcommunity.com/market/listings/730/AWP%20%7C%20Asiimov%20%28Field-Tested%29',
  },

  // Epic skins (7% drop rate)
  {
    name: 'AK-47 | Fire Serpent',
    rarity: 'Epic',
    exterior: 'Field-Tested',
    price: 450.00,
    imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV09-5gZKKmPnLPr7Vn35cppJw3L2Xo9-m3VHj-0Y5ZWz7doSRdgI9aVnZ-wLtxOy-hJG0vZvKwXVqvyEm5HzUmBCpwUYbHvdqFQQ/360fx360f',
    metadataUri: 'https://arweave.net/test-ak47-fire-serpent',
    steamMarketUrl: 'https://steamcommunity.com/market/listings/730/AK-47%20%7C%20Fire%20Serpent%20%28Field-Tested%29',
  },
  {
    name: 'M4A4 | Howl',
    rarity: 'Epic',
    exterior: 'Field-Tested',
    price: 3500.00,
    imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpou-6kejhjxszFJTwW09-5gZKKmPnLPr7Vn35cppMg2L2Xo9-m3VHj-0Y5ZWz7doSRdgI9aVnZ-wLtxOy-hJG0vZvKwXVqvyEm5HzUmBCpwUYbHvdqFQQ/360fx360f',
    metadataUri: 'https://arweave.net/test-m4a4-howl',
    steamMarketUrl: 'https://steamcommunity.com/market/listings/730/M4A4%20%7C%20Howl%20%28Field-Tested%29',
  },

  // Legendary skins (3% drop rate)
  {
    name: 'AWP | Dragon Lore',
    rarity: 'Legendary',
    exterior: 'Factory New',
    price: 8500.00,
    imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot621FAR17PLfYQJD_9W7m5a0mvLwOq7c2D0Bv8Qh3-yU8Nqm2wK2_0U9Yzv3JoTGdFRvMFHY_1K_xO7n1sO6uZTOzHMwvCUj7CnfyRfhgEtSLrs4Rvs7Uw/360fx360f',
    metadataUri: 'https://arweave.net/test-awp-dragon-lore',
    steamMarketUrl: 'https://steamcommunity.com/market/listings/730/AWP%20%7C%20Dragon%20Lore%20%28Factory%20New%29',
  },
  {
    name: 'Karambit | Fade',
    rarity: 'Legendary',
    exterior: 'Factory New',
    price: 2200.00,
    imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpovbSsLQJf0ebcZThQ6tCvq4GaqPP7Ia_ummJW4NE_0r2Xo9-m3VHj-0Y5ZWz7doSRdgI9aVnZ-wLtxOy-hJG0vZvKwXVqvyEm5HzUmBCpwUYbHvdqFQQ/360fx360f',
    metadataUri: 'https://arweave.net/test-karambit-fade',
    steamMarketUrl: 'https://steamcommunity.com/market/listings/730/Karambit%20%7C%20Fade%20%28Factory%20New%29',
  },
];

async function seed() {
  try {
    console.log('🌱 Seeding test skin templates...\n');

    // Initialize database
    await AppDataSource.initialize();
    console.log('✅ Database connected\n');

    const skinTemplateRepo = AppDataSource.getRepository(SkinTemplate);

    // Clear existing test skins
    await skinTemplateRepo.delete({});
    console.log('🗑️  Cleared existing skin templates\n');

    // Insert test skins
    for (const skinData of testSkins) {
      const skin = skinTemplateRepo.create(skinData as any);
      await skinTemplateRepo.save(skin);
    }

    console.log(`\n🎉 Successfully seeded ${testSkins.length} skin templates!`);
    console.log('\nRarity distribution:');
    console.log('  Common: 3 skins (50% drop rate)');
    console.log('  Uncommon: 2 skins (25% drop rate)');
    console.log('  Rare: 2 skins (15% drop rate)');
    console.log('  Epic: 2 skins (7% drop rate)');
    console.log('  Legendary: 2 skins (3% drop rate)');

    await AppDataSource.destroy();
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();

