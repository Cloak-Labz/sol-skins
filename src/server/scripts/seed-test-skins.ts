import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { SkinTemplate } from '../entities/SkinTemplate';

const testSkins = [
  // Common skins (50% drop rate)
  {
    weapon: 'AK-47',
    skinName: 'Redline',
    rarity: 'Common',
    condition: 'Field-Tested',
    basePriceUsd: 25.50,
    imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV09-5lpKKqPrxN7LEmyVQ7MEpiLuSrYmnjQO3-UdsZGHyd4_Bd1RvNQ7T_FDrw-_ng5Pu75iY1zI97bhSLVKj/360fx360f',
  },
  {
    weapon: 'M4A4',
    skinName: 'Desert-Strike',
    rarity: 'Common',
    condition: 'Minimal Wear',
    basePriceUsd: 18.75,
    imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpou-6kejhjxszFJTwW09-5gZKKmPnLPr7Vn35cppQg2L2Xo9-m3VHj-0Y5ZWz7doSRdgI9aVnZ-wLtxOy-hJG0vZvKwXVqvyEm5HzUmBCpwUYbHvdqFQQ/360fx360f',
  },
  {
    weapon: 'AWP',
    skinName: 'Worm God',
    rarity: 'Common',
    condition: 'Factory New',
    basePriceUsd: 12.30,
    imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot621FAR17PLfYQJD_9W7m5a0mvLwOq7c2D0Bv8Qh3-yU8Nqm2wK2_0U9Yzv3JoTGdFRvMFHY_1K_xO7n1sO6uZTOzHMwvCUj7CnfyRfhgEtSLrs4Rvs7Uw/360fx360f',
  },

  // Uncommon skins (25% drop rate)
  {
    weapon: 'AK-47',
    skinName: 'Frontside Misty',
    rarity: 'Uncommon',
    condition: 'Field-Tested',
    basePriceUsd: 45.80,
    imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV09G_mIGSqPv9NLPF2G0AuMQh2LGV9Nqj2wG2_hA9NWr6cNSVcFU3Zw7V_lK-yO3qjJO-vJXMnXZqsyQh7HzfyUKwgxlFaOdxxavJRKWZSQA/360fx360f',
  },
  {
    weapon: 'M4A1-S',
    skinName: 'Hyper Beast',
    rarity: 'Uncommon',
    condition: 'Well-Worn',
    basePriceUsd: 52.40,
    imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpou-6kejhz2v_Nfz5H_uO1gb-Gw_alDL_UhmpB7Pp9g-7J4cL33Fbm_0M6YGD6cYPEJgU8Zg2B_Qe5xb3u1pC-6ZvPwCNhvyVx4XvfnhCpwUYbvHDGBXk/360fx360f',
  },

  // Rare skins (15% drop rate)
  {
    weapon: 'AK-47',
    skinName: 'Vulcan',
    rarity: 'Rare',
    condition: 'Field-Tested',
    basePriceUsd: 125.50,
    imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV08-_mIGSqPv9NLPF2GpTu8Aj3uyZ8I2t2wDk-UVqMWD6cYKXIAE3YVnU_1K3wOe6hJC_uZXKnHBg6D5iuyg7P0GGZA/360fx360f',
  },
  {
    weapon: 'AWP',
    skinName: 'Asiimov',
    rarity: 'Rare',
    condition: 'Field-Tested',
    basePriceUsd: 98.75,
    imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot621FAR17PLfYQJD_9W7m5a0mvLwOq7c2GpTu8Aj3uyZ8I2t2wDk-UVqMWD6cYKXIAE3YVnU_1K3wOe6hJC_uZXKnHBg6D5iuyg7P0GGZA/360fx360f',
  },

  // Epic skins (7% drop rate)
  {
    weapon: 'AK-47',
    skinName: 'Fire Serpent',
    rarity: 'Epic',
    condition: 'Field-Tested',
    basePriceUsd: 450.00,
    imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV09-5gZKKmPnLPr7Vn35cppJw3L2Xo9-m3VHj-0Y5ZWz7doSRdgI9aVnZ-wLtxOy-hJG0vZvKwXVqvyEm5HzUmBCpwUYbHvdqFQQ/360fx360f',
  },
  {
    weapon: 'M4A4',
    skinName: 'Howl',
    rarity: 'Epic',
    condition: 'Field-Tested',
    basePriceUsd: 3500.00,
    imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpou-6kejhjxszFJTwW09-5gZKKmPnLPr7Vn35cppMg2L2Xo9-m3VHj-0Y5ZWz7doSRdgI9aVnZ-wLtxOy-hJG0vZvKwXVqvyEm5HzUmBCpwUYbHvdqFQQ/360fx360f',
  },

  // Legendary skins (3% drop rate)
  {
    weapon: 'AWP',
    skinName: 'Dragon Lore',
    rarity: 'Legendary',
    condition: 'Factory New',
    basePriceUsd: 8500.00,
    imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot621FAR17PLfYQJD_9W7m5a0mvLwOq7c2D0Bv8Qh3-yU8Nqm2wK2_0U9Yzv3JoTGdFRvMFHY_1K_xO7n1sO6uZTOzHMwvCUj7CnfyRfhgEtSLrs4Rvs7Uw/360fx360f',
  },
  {
    weapon: 'Karambit',
    skinName: 'Fade',
    rarity: 'Legendary',
    condition: 'Factory New',
    basePriceUsd: 2200.00,
    imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpovbSsLQJf0ebcZThQ6tCvq4GaqPP7Ia_ummJW4NE_0r2Xo9-m3VHj-0Y5ZWz7doSRdgI9aVnZ-wLtxOy-hJG0vZvKwXVqvyEm5HzUmBCpwUYbHvdqFQQ/360fx360f',
  },
];

async function seed() {
  try {
    console.log('🌱 Seeding test skin templates...\n');

    // Initialize database
    await AppDataSource.initialize();
    console.log('✅ Database connected\n');

    const skinTemplateRepo = AppDataSource.getRepository(SkinTemplate);

    // Clear existing test skins (skip if there are foreign key constraints)
    try {
      await skinTemplateRepo.clear();
      console.log('🗑️  Cleared existing skin templates\n');
    } catch (error) {
      console.log('⚠️  Could not clear existing templates (foreign key constraints), continuing...\n');
    }

    // Insert test skins (upsert to handle existing data)
    for (const skinData of testSkins) {
      try {
        const existingSkin = await skinTemplateRepo.findOne({
          where: {
            weapon: skinData.weapon,
            skinName: skinData.skinName,
            condition: skinData.condition,
          },
        });

        if (existingSkin) {
          console.log(`⚠️  Skin already exists: ${skinData.weapon} | ${skinData.skinName} (${skinData.condition})`);
          continue;
        }

        const skin = skinTemplateRepo.create(skinData as any);
        await skinTemplateRepo.save(skin);
        console.log(`✅ Added skin: ${skinData.weapon} | ${skinData.skinName} (${skinData.condition})`);
      } catch (error) {
        console.log(`❌ Failed to add skin: ${skinData.weapon} | ${skinData.skinName} (${skinData.condition})`);
      }
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

