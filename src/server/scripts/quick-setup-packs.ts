/**
 * Quick Setup Script: Create Packs and Skin Templates
 * 
 * This is a simplified version that only creates database entries.
 * No NFT minting required - perfect for quick testing!
 * 
 * Run with: npx ts-node scripts/quick-setup-packs.ts
 */

import axios from 'axios';

const API_BASE = 'http://localhost:3002/api/v1';

// CS:GO skin examples with real metadata
const SKIN_TEMPLATES = [
  // LEGENDARY (Red) - 0.64%
  {
    name: 'Dragon Lore',
    weapon: 'AWP',
    rarity: 'Legendary',
    image: 'https://steamcommunity-a.akamaihd.net/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot621FAR17PLfYQJD_9W7m5a0mvLwOq7c2D9SuJEgj7CZ99T0jlLh_EQ-NTr6IdKUJgc7YQrW_1PqxOe9hcS_tcnKyHpjvCVw4H7ZlxHl0RsdZbVxgqTLVBzAUPse8OMxig',
    description: 'The iconic AWP Dragon Lore - most sought after skin',
    condition: 'Factory New',
    basePrice: 2500,
    probability: 0.64,
  },
  {
    name: 'Howl',
    weapon: 'M4A4',
    rarity: 'Legendary',
    image: 'https://steamcommunity-a.akamaihd.net/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpou-6kejhz2v_Nfz5H_uO1gb-Gw_alIITCmX5d_MR6nez-8NX3ilfsjEY_Y2z2LYWUIg85NVHRr1i2xem508S7u5_AySE3uSlx5njZm0HlgxhSLrs4HZk0o64',
    description: 'The contraband M4A4 Howl',
    condition: 'Factory New',
    basePrice: 2000,
    probability: 0.64,
  },
  // EPIC (Pink) - 3.2%
  {
    name: 'Asiimov',
    weapon: 'AWP',
    rarity: 'Epic',
    image: 'https://steamcommunity-a.akamaihd.net/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot621FAR17PLfYQJO_c6_lb-KkPT6PYTQgXtu5cB1g_zMu9-hiQLjqEY-MTqnLdOVdwVvMF-D_1C9k-a608Lpv56aySFnvykrsHrZnhGp1k1NZ-dicO0',
    description: 'Futuristic AWP Asiimov design',
    condition: 'Field-Tested',
    basePrice: 120,
    probability: 3.2,
  },
  {
    name: 'Hyper Beast',
    weapon: 'AK-47',
    rarity: 'Epic',
    image: 'https://steamcommunity-a.akamaihd.net/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV09-5lpKKqPrxN7LEm1Rd6dd2j6eQ9NXx0Abg_URpZTz6IISVcABqM1rY-VS6w-btgJXu752dwXFn7nZw7WGdwUIq6L49Mg',
    description: 'Vibrant Hyper Beast artwork',
    condition: 'Factory New',
    basePrice: 150,
    probability: 3.2,
  },
  {
    name: 'Vulcan',
    weapon: 'AK-47',
    rarity: 'Epic',
    image: 'https://steamcommunity-a.akamaihd.net/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV092lnYmGmOHLP7LWnn8fvZAg37uQo9ujiVaw-kVvN232doGVcA84aAmB-QO9kOfxxcjrknnSBQ',
    description: 'Sleek orange and black design',
    condition: 'Factory New',
    basePrice: 110,
    probability: 3.2,
  },
  // RARE (Purple) - 15.98%
  {
    name: 'Redline',
    weapon: 'AK-47',
    rarity: 'Rare',
    image: 'https://steamcommunity-a.akamaihd.net/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV09q5hoWYhcj4N6_um25V4dB8xLzF8I-i3gXj-UM5ZTz2cYORdlI7Z1rWrle-xOzqhZLutZrMz3VruykgtmGdwUI9iME2fg',
    description: 'Classic red striped design',
    condition: 'Field-Tested',
    basePrice: 45,
    probability: 7.99,
  },
  {
    name: 'Cyrex',
    weapon: 'M4A1-S',
    rarity: 'Rare',
    image: 'https://steamcommunity-a.akamaihd.net/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpou-6kejhz2v_Nfz5H_uO1gb-Gw_alDL_CmGZU7cF0teXI8oThxlfi80VvYmvyI4DAcAY2MAnX_AO4kr_vhMC56pzNyHZlvykqsS3czEOziRtIOOA70_veFwtXbuubVg',
    description: 'White and red futuristic pattern',
    condition: 'Factory New',
    basePrice: 35,
    probability: 7.99,
  },
  // UNCOMMON (Blue) - 31.96%
  {
    name: 'Frontside Misty',
    weapon: 'AK-47',
    rarity: 'Uncommon',
    image: 'https://steamcommunity-a.akamaihd.net/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV08-jhIWZlP_1IbzUklRd4cJ5nqeZrdqh2VLs_xU5amjzJ4CXdVNqMwvV-lC_w7_vhJK6u53MwXtrvSM8pSGK2t8IKc0',
    description: 'Misty mountain landscape',
    condition: 'Minimal Wear',
    basePrice: 12,
    probability: 15.98,
  },
  {
    name: 'Desolate Space',
    weapon: 'M4A4',
    rarity: 'Uncommon',
    image: 'https://steamcommunity-a.akamaihd.net/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpou-6kejhz2v_Nfz5H_uOxh7-Gw_alfqjum2dU7dF0teXI8oTht1i1uRQ5fTqlINDBJFI5YVnR_gW6wuq9m9bi69vXlyQ-ViBs',
    description: 'Space-themed artwork',
    condition: 'Factory New',
    basePrice: 15,
    probability: 15.98,
  },
  // COMMON (Light Blue) - 48.20%
  {
    name: 'Elite Build',
    weapon: 'AK-47',
    rarity: 'Common',
    image: 'https://steamcommunity-a.akamaihd.net/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV09m7hIWKhf7hPYTSg3lu5cB1g_zMu9Si0Qyx_0tqYjr0dtfEJgdsaFHYr1a2xO7ug5G5up_BwSdmuyMn5H2JmkTm1UtEZudicMW9xSxC',
    description: 'Military themed design',
    condition: 'Minimal Wear',
    basePrice: 4,
    probability: 24.1,
  },
  {
    name: 'Zirka',
    weapon: 'M4A4',
    rarity: 'Common',
    image: 'https://steamcommunity-a.akamaihd.net/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpou-6kejhz2v_Nfz5H_uOxh7-Gw_alDKnQmGxU7sB4jurVyoH2mlKx5SNlYD2mJtSWIQ87Yl-F_Vi9w-bm18O6vszIzHsysyYqsyjD30vgP5xzEsY',
    description: 'Star pattern design',
    condition: 'Field-Tested',
    basePrice: 3,
    probability: 24.1,
  },
];

// Pack configurations
const PACKS = [
  {
    name: 'Starter Pack',
    description: 'Perfect for beginners! Contains common to rare skins.',
    priceSol: 0.05,
    priceUsdc: 5,
    imageUrl: 'https://uploader.irys.xyz/64UHg7nJf16wNerfTS9UftaEo2SVgmv1GzbJqWEVCkKv',
    rarity: 'Common',
    isActive: true,
    isFeatured: false,
    chanceCommon: 48.2,
    chanceUncommon: 31.96,
    chanceRare: 15.98,
    chanceEpic: 3.2,
    chanceLegendary: 0.64,
  },
  {
    name: 'Premium Pack',
    description: 'Higher chances of epic and legendary skins!',
    priceSol: 0.15,
    priceUsdc: 15,
    imageUrl: 'https://uploader.irys.xyz/64UHg7nJf16wNerfTS9UftaEo2SVgmv1GzbJqWEVCkKv',
    rarity: 'Rare',
    isActive: true,
    isFeatured: true,
    chanceCommon: 30,
    chanceUncommon: 35,
    chanceRare: 20,
    chanceEpic: 12,
    chanceLegendary: 3,
  },
  {
    name: 'Elite Pack',
    description: 'The ultimate pack! Best odds for legendary skins.',
    priceSol: 0.5,
    priceUsdc: 50,
    imageUrl: 'https://uploader.irys.xyz/64UHg7nJf16wNerfTS9UftaEo2SVgmv1GzbJqWEVCkKv',
    rarity: 'Legendary',
    isActive: true,
    isFeatured: true,
    chanceCommon: 10,
    chanceUncommon: 25,
    chanceRare: 35,
    chanceEpic: 20,
    chanceLegendary: 10,
  },
];

async function setup() {
  console.log('\n🚀 Quick Pack Setup - Starting...\n');
  console.log('═'.repeat(60));

  try {
    // Step 1: Create Packs
    console.log('\n📦 Step 1: Creating Packs...\n');
    const createdPacks = [];
    
    for (const pack of PACKS) {
      console.log(`Creating: ${pack.name}...`);
      try {
        const response = await axios.post(`${API_BASE}/admin/packs`, pack);
        
        if (response.data.success) {
          createdPacks.push(response.data.data);
          console.log(`✅ ${pack.name} (ID: ${response.data.data.id})`);
        }
      } catch (error: any) {
        if (error.response?.status === 409 || error.response?.data?.message?.includes('duplicate')) {
          console.log(`⏭️  ${pack.name} already exists, skipping...`);
        } else {
          console.error(`❌ Failed: ${error.response?.data?.message || error.message}`);
        }
      }
    }

    console.log(`\n✅ Created ${createdPacks.length} new packs\n`);
    console.log('═'.repeat(60));

    // Step 2: Create Skin Templates
    console.log('\n🎨 Step 2: Creating Skin Templates...\n');
    const createdSkins = [];

    for (const skin of SKIN_TEMPLATES) {
      console.log(`Creating: ${skin.weapon} | ${skin.name}...`);
      
      try {
        const response = await axios.post(`${API_BASE}/admin/skin-templates`, {
          weapon: skin.weapon,
          skinName: skin.name,
          rarity: skin.rarity,
          condition: skin.condition,
          basePriceUsd: skin.basePrice,
          imageUrl: skin.image,
          description: skin.description,
          isActive: true,
        });

        if (response.data.success) {
          createdSkins.push({ ...response.data.data, probability: skin.probability });
          console.log(`✅ ${skin.weapon} | ${skin.name}`);
        }
      } catch (error: any) {
        if (error.response?.status === 409 || error.response?.data?.message?.includes('duplicate')) {
          console.log(`⏭️  ${skin.name} already exists, skipping...`);
          
          // Try to fetch existing skin
          try {
            const listResponse = await axios.get(`${API_BASE}/admin/skin-templates`);
            const existing = listResponse.data.data.find(
              (s: any) => s.weapon === skin.weapon && s.skinName === skin.name
            );
            if (existing) {
              createdSkins.push({ ...existing, probability: skin.probability });
            }
          } catch (e) {
            // Ignore fetch error
          }
        } else {
          console.error(`❌ Failed: ${error.response?.data?.message || error.message}`);
        }
      }
    }

    console.log(`\n✅ Created ${createdSkins.length} skin templates\n`);
    console.log('═'.repeat(60));

    // Step 3: Fetch all packs (including existing ones)
    console.log('\n🔍 Fetching all packs...\n');
    const packListResponse = await axios.get(`${API_BASE}/admin/packs`);
    const allPacks = packListResponse.data.data;
    console.log(`Found ${allPacks.length} packs total`);

    // Step 4: Create Loot Box Pools
    console.log('\n🔗 Step 3: Creating Loot Box Pools...\n');
    let poolsCreated = 0;
    
    for (const pack of allPacks) {
      console.log(`\nAssociating skins with ${pack.name}...`);
      
      for (const skin of createdSkins) {
        try {
          await axios.post(`${API_BASE}/admin/loot-box-pools`, {
            lootBoxTypeId: pack.id,
            skinTemplateId: skin.id,
            dropChance: skin.probability,
          });
          poolsCreated++;
          console.log(`  ✅ ${skin.weapon} | ${skin.skinName} (${skin.probability}%)`);
        } catch (error: any) {
          if (error.response?.status === 409 || error.response?.data?.message?.includes('duplicate')) {
            console.log(`  ⏭️  ${skin.skinName} already in pool`);
          } else {
            console.error(`  ❌ ${skin.skinName}: ${error.response?.data?.message || error.message}`);
          }
        }
      }
    }

    console.log(`\n✅ Created ${poolsCreated} pool entries\n`);
    console.log('═'.repeat(60));

    // Step 5: Summary
    console.log('\n📊 SETUP COMPLETE!\n');
    console.log(`✅ Total Packs: ${allPacks.length}`);
    console.log(`✅ Total Skins: ${createdSkins.length}`);
    console.log(`✅ Pool Entries: ${poolsCreated}`);
    console.log('\n🎮 Ready to open packs!\n');
    console.log('Go to: http://localhost:3000/app-dashboard/packs\n');
    console.log('═'.repeat(60));

    // Print pack details
    console.log('\n📦 Available Packs:\n');
    for (const pack of allPacks) {
      console.log(`${pack.name}:`);
      console.log(`  💰 ${pack.priceSol} SOL ($${pack.priceUsdc})`);
      console.log(`  🎲 Legendary: ${pack.chanceLegendary}%`);
      console.log(`  🎲 Epic: ${pack.chanceEpic}%`);
      console.log(`  🎲 Rare: ${pack.chanceRare}%`);
      console.log('');
    }

  } catch (error: any) {
    console.error('\n❌ Setup failed:', error.message);
    if (error.response?.data) {
      console.error('API Error:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the setup
setup().catch(console.error);

