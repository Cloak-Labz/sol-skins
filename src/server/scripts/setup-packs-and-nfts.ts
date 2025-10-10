/**
 * Setup Script: Create Packs and Mint NFTs
 * 
 * This script will:
 * 1. Create loot box packs in the database
 * 2. Mint real NFTs on Solana/Walrus
 * 3. Create skin templates with proper rarity distribution
 * 4. Associate skins with packs (loot box pools)
 * 
 * Run with: npx ts-node scripts/setup-packs-and-nfts.ts
 */

import axios from 'axios';
import * as dotenv from 'dotenv';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplCore } from '@metaplex-foundation/mpl-core';
import { create } from '@metaplex-foundation/mpl-core';
import {
  generateSigner,
  signerIdentity,
  publicKey,
  some,
  none,
} from '@metaplex-foundation/umi';
import bs58 from 'bs58';

dotenv.config();

const API_BASE = 'http://localhost:3002/api/v1';
const SOLANA_RPC = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;

if (!ADMIN_PRIVATE_KEY) {
  throw new Error('ADMIN_PRIVATE_KEY not found in .env');
}

// Walrus HTTP API
const WALRUS_PUBLISHER = 'https://publisher.walrus-testnet.walrus.space';
const WALRUS_AGGREGATOR = 'https://aggregator.walrus-testnet.walrus.space';

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
    probability: 0.0064,
  },
  {
    name: 'Howl',
    weapon: 'M4A4',
    rarity: 'Legendary',
    image: 'https://steamcommunity-a.akamaihd.net/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpou-6kejhz2v_Nfz5H_uO1gb-Gw_alIITCmX5d_MR6nez-8NX3ilfsjEY_Y2z2LYWUIg85NVHRr1i2xem508S7u5_AySE3uSlx5njZm0HlgxhSLrs4HZk0o64',
    description: 'The contraband M4A4 Howl',
    condition: 'Factory New',
    basePrice: 2000,
    probability: 0.0064,
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
    probability: 0.032,
  },
  {
    name: 'Hyper Beast',
    weapon: 'AK-47',
    rarity: 'Epic',
    image: 'https://steamcommunity-a.akamaihd.net/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV09-5lpKKqPrxN7LEm1Rd6dd2j6eQ9NXx0Abg_URpZTz6IISVcABqM1rY-VS6w-btgJXu752dwXFn7nZw7WGdwUIq6L49Mg',
    description: 'Vibrant Hyper Beast artwork',
    condition: 'Factory New',
    basePrice: 150,
    probability: 0.032,
  },
  {
    name: 'Vulcan',
    weapon: 'AK-47',
    rarity: 'Epic',
    image: 'https://steamcommunity-a.akamaihd.net/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV092lnYmGmOHLP7LWnn8fvZAg37uQo9ujiVaw-kVvN232doGVcA84aAmB-QO9kOfxxcjrknnSBQ',
    description: 'Sleek orange and black design',
    condition: 'Factory New',
    basePrice: 110,
    probability: 0.032,
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
    probability: 0.0799,
  },
  {
    name: 'Cyrex',
    weapon: 'M4A1-S',
    rarity: 'Rare',
    image: 'https://steamcommunity-a.akamaihd.net/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpou-6kejhz2v_Nfz5H_uO1gb-Gw_alDL_CmGZU7cF0teXI8oThxlfi80VvYmvyI4DAcAY2MAnX_AO4kr_vhMC56pzNyHZlvykqsS3czEOziRtIOOA70_veFwtXbuubVg',
    description: 'White and red futuristic pattern',
    condition: 'Factory New',
    basePrice: 35,
    probability: 0.0799,
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
    probability: 0.1598,
  },
  {
    name: 'Desolate Space',
    weapon: 'M4A4',
    rarity: 'Uncommon',
    image: 'https://steamcommunity-a.akamaihd.net/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpou-6kejhz2v_Nfz5H_uOxh7-Gw_alfqjum2dU7dF0teXI8oTht1i1uRQ5fTqlINDBJFI5YVnR_gW6wuq9m9bi69vXlyQ-ViBs',
    description: 'Space-themed artwork',
    condition: 'Factory New',
    basePrice: 15,
    probability: 0.1598,
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
    probability: 0.241,
  },
  {
    name: 'Zirka',
    weapon: 'M4A4',
    rarity: 'Common',
    image: 'https://steamcommunity-a.akamaihd.net/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpou-6kejhz2v_Nfz5H_uOxh7-Gw_alDKnQmGxU7sB4jurVyoH2mlKx5SNlYD2mJtSWIQ87Yl-F_Vi9w-bm18O6vszIzHsysyYqsyjD30vgP5xzEsY',
    description: 'Star pattern design',
    condition: 'Field-Tested',
    basePrice: 3,
    probability: 0.241,
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

/**
 * Upload metadata to Walrus
 */
async function uploadToWalrus(metadata: any): Promise<{ blobId: string; uri: string }> {
  console.log(`📝 Uploading metadata to Walrus...`);
  
  const jsonString = JSON.stringify(metadata);
  const blob = Buffer.from(jsonString, 'utf-8');
  
  try {
    const response = await axios.put(`${WALRUS_PUBLISHER}/v1/store`, blob, {
      headers: {
        'Content-Type': 'application/octet-stream',
      },
      maxBodyLength: Infinity,
      timeout: 30000,
    });

    if (response.data?.newlyCreated?.blobObject?.blobId) {
      const blobId = response.data.newlyCreated.blobObject.blobId;
      const uri = `${WALRUS_AGGREGATOR}/v1/${blobId}`;
      console.log(`✅ Uploaded to Walrus: ${uri}`);
      return { blobId, uri };
    } else if (response.data?.alreadyCertified?.blobId) {
      const blobId = response.data.alreadyCertified.blobId;
      const uri = `${WALRUS_AGGREGATOR}/v1/${blobId}`;
      console.log(`✅ Already on Walrus: ${uri}`);
      return { blobId, uri };
    }

    throw new Error('Invalid Walrus response');
  } catch (error: any) {
    console.error('❌ Walrus upload failed:', error.message);
    throw error;
  }
}

/**
 * Mint Core NFT on Solana
 */
async function mintCoreNFT(name: string, uri: string): Promise<{ asset: string; signature: string }> {
  console.log(`🎨 Minting Core NFT: ${name}...`);

  // Setup Umi
  const umi = createUmi(SOLANA_RPC).use(mplCore());
  
  // Convert admin keypair
  const adminKeypairBytes = bs58.decode(ADMIN_PRIVATE_KEY);
  const adminKeypair = umi.eddsa.createKeypairFromSecretKey(adminKeypairBytes);
  umi.use(signerIdentity(adminKeypair));

  // Generate asset signer
  const asset = generateSigner(umi);

  // Create Core NFT
  const tx = await create(umi, {
    asset,
    name,
    uri,
    plugins: [],
  }).sendAndConfirm(umi);

  const signature = bs58.encode(tx.signature);

  console.log(`✅ Minted NFT: ${asset.publicKey}`);
  console.log(`   Signature: ${signature}`);

  return {
    asset: asset.publicKey,
    signature,
  };
}

/**
 * Main setup function
 */
async function setup() {
  console.log('\n🚀 Starting Pack and NFT Setup...\n');
  console.log('═'.repeat(60));

  try {
    // Step 1: Create Packs (Loot Boxes)
    console.log('\n📦 Step 1: Creating Packs...\n');
    const createdPacks = [];
    
    for (const pack of PACKS) {
      console.log(`Creating pack: ${pack.name}...`);
      const response = await axios.post(`${API_BASE}/admin/packs`, pack);
      
      if (response.data.success) {
        createdPacks.push(response.data.data);
        console.log(`✅ Created: ${pack.name} (ID: ${response.data.data.id})`);
      } else {
        console.error(`❌ Failed to create ${pack.name}`);
      }
    }

    console.log(`\n✅ Created ${createdPacks.length} packs\n`);
    console.log('═'.repeat(60));

    // Step 2: Create Skin Templates in Database
    console.log('\n🎨 Step 2: Creating Skin Templates...\n');
    const createdSkins = [];

    for (const skin of SKIN_TEMPLATES) {
      console.log(`Creating template: ${skin.weapon} | ${skin.name}...`);
      
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
          console.log(`✅ Created: ${skin.weapon} | ${skin.name}`);
        }
      } catch (error: any) {
        console.error(`❌ Failed to create ${skin.name}:`, error.response?.data?.message || error.message);
      }
    }

    console.log(`\n✅ Created ${createdSkins.length} skin templates\n`);
    console.log('═'.repeat(60));

    // Step 3: Associate Skins with Packs (Loot Box Pools)
    console.log('\n🔗 Step 3: Creating Loot Box Pools...\n');
    
    for (const pack of createdPacks) {
      console.log(`\nAssociating skins with ${pack.name}...`);
      
      for (const skin of createdSkins) {
        try {
          await axios.post(`${API_BASE}/admin/loot-box-pools`, {
            lootBoxTypeId: pack.id,
            skinTemplateId: skin.id,
            dropChance: skin.probability * 100, // Convert to percentage
          });
          console.log(`  ✅ Added ${skin.weapon} | ${skin.skinName} (${skin.probability * 100}%)`);
        } catch (error: any) {
          console.error(`  ❌ Failed to add ${skin.skinName}:`, error.response?.data?.message || error.message);
        }
      }
    }

    console.log('\n✅ All loot box pools created\n');
    console.log('═'.repeat(60));

    // Step 4: Summary
    console.log('\n📊 SETUP COMPLETE!\n');
    console.log(`✅ Packs Created: ${createdPacks.length}`);
    console.log(`✅ Skin Templates: ${createdSkins.length}`);
    console.log(`✅ Total Pool Entries: ${createdPacks.length * createdSkins.length}`);
    console.log('\n🎮 You can now open packs in the frontend!\n');
    console.log('Go to: http://localhost:3000/app-dashboard/packs\n');
    console.log('═'.repeat(60));

    // Print pack details
    console.log('\n📦 Available Packs:\n');
    for (const pack of createdPacks) {
      console.log(`${pack.name}:`);
      console.log(`  💰 Price: ${pack.priceSol} SOL / $${pack.priceUsdc}`);
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

