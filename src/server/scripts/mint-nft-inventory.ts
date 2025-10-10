/**
 * Mint NFT Inventory Script
 * 
 * This script mints Core NFTs for each skin template in the database.
 * These NFTs will be stored in the admin wallet and transferred to users
 * when they open packs.
 * 
 * Run with: npx ts-node scripts/mint-nft-inventory.ts
 */

import axios from 'axios';
import * as dotenv from 'dotenv';
import { Connection } from '@solana/web3.js';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplCore } from '@metaplex-foundation/mpl-core';
import { create } from '@metaplex-foundation/mpl-core';
import { generateSigner, signerIdentity, createSignerFromKeypair } from '@metaplex-foundation/umi';
import bs58 from 'bs58';

dotenv.config();

const API_BASE = 'http://localhost:3002/api/v1';
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const WALRUS_PUBLISHER = process.env.WALRUS_PUBLISHER || 'https://publisher.walrus-testnet.walrus.space';
const WALRUS_AGGREGATOR = process.env.WALRUS_AGGREGATOR || 'https://aggregator.walrus-testnet.walrus.space';

if (!ADMIN_PRIVATE_KEY) {
  throw new Error('ADMIN_PRIVATE_KEY not found in .env');
}

/**
 * Upload metadata to Walrus
 */
async function uploadToWalrus(metadata: any): Promise<string> {
  console.log(`📝 Uploading metadata to Walrus...`);
  
  try {
    const jsonString = JSON.stringify(metadata);
    const blob = Buffer.from(jsonString, 'utf-8');
    
    const response = await axios.put(`${WALRUS_PUBLISHER}/v1/store`, blob, {
      headers: {
        'Content-Type': 'application/octet-stream',
      },
      maxBodyLength: Infinity,
      timeout: 15000,
    });

    if (response.data?.newlyCreated?.blobObject?.blobId) {
      const blobId = response.data.newlyCreated.blobObject.blobId;
      const uri = `${WALRUS_AGGREGATOR}/v1/${blobId}`;
      console.log(`✅ Uploaded: ${uri}`);
      return uri;
    } else if (response.data?.alreadyCertified?.blobId) {
      const blobId = response.data.alreadyCertified.blobId;
      const uri = `${WALRUS_AGGREGATOR}/v1/${blobId}`;
      console.log(`✅ Already exists: ${uri}`);
      return uri;
    }

    throw new Error('Invalid Walrus response');
  } catch (error: any) {
    console.error('❌ Walrus failed:', error.message);
    // Fallback to image URL
    console.log('⚠️  Using fallback (image URL)');
    return metadata.image || '';
  }
}

/**
 * Mint a Core NFT
 */
async function mintCoreNFT(params: {
  name: string;
  description: string;
  imageUrl: string;
  attributes: any[];
}): Promise<{ mint: string; transaction: string; metadataUri: string }> {
  const { name, description, imageUrl, attributes } = params;
  
  // Setup Umi
  const umi = createUmi(SOLANA_RPC_URL).use(mplCore());
  
  // Convert admin keypair
  const adminKeypairBytes = bs58.decode(ADMIN_PRIVATE_KEY);
  const adminKeypair = umi.eddsa.createKeypairFromSecretKey(adminKeypairBytes);
  const adminSigner = createSignerFromKeypair(umi, adminKeypair);
  umi.use(signerIdentity(adminSigner));

  // Prepare metadata
  const metadata = {
    name,
    description,
    image: imageUrl,
    attributes,
  };

  // Upload metadata to Walrus
  const metadataUri = await uploadToWalrus(metadata);

  // Generate asset signer
  const asset = generateSigner(umi);

  console.log(`🔨 Minting Core NFT: ${name}...`);
  
  // Mint Core NFT (owner will be admin wallet)
  const tx = await create(umi, {
    asset,
    name,
    uri: metadataUri,
    plugins: [],
  }).sendAndConfirm(umi);

  const signature = bs58.encode(tx.signature);

  console.log(`✅ Minted: ${asset.publicKey}`);
  console.log(`   Tx: ${signature}`);

  return {
    mint: asset.publicKey,
    transaction: signature,
    metadataUri,
  };
}

/**
 * Main function
 */
async function main() {
  console.log('\n🚀 Starting NFT Inventory Minting...\n');
  console.log('═'.repeat(60));

  try {
    // Step 1: Fetch all skin templates
    console.log('\n📦 Step 1: Fetching Skin Templates...\n');
    const skinsResponse = await axios.get(`${API_BASE}/admin/skin-templates`);
    const skins = skinsResponse.data.data;
    
    console.log(`Found ${skins.length} skin templates\n`);
    console.log('═'.repeat(60));

    // Step 2: Mint NFTs for each skin (multiple copies per skin for inventory)
    console.log('\n🎨 Step 2: Minting NFTs...\n');
    
    const COPIES_PER_SKIN = 5; // Mint 5 copies of each skin for inventory
    let totalMinted = 0;
    let totalFailed = 0;

    for (const skin of skins) {
      console.log(`\n📦 Processing: ${skin.weapon} | ${skin.skinName}`);
      console.log(`   Rarity: ${skin.rarity} | Condition: ${skin.condition}`);
      console.log(`   Minting ${COPIES_PER_SKIN} copies...`);
      
      for (let i = 1; i <= COPIES_PER_SKIN; i++) {
        try {
          const result = await mintCoreNFT({
            name: `${skin.weapon} | ${skin.skinName} #${i}`,
            description: skin.description || `${skin.weapon} | ${skin.skinName} - ${skin.rarity}`,
            imageUrl: skin.imageUrl,
            attributes: [
              { trait_type: 'Weapon', value: skin.weapon },
              { trait_type: 'Skin', value: skin.skinName },
              { trait_type: 'Rarity', value: skin.rarity },
              { trait_type: 'Condition', value: skin.condition },
              { trait_type: 'Base Price USD', value: skin.basePriceUsd.toString() },
              { trait_type: 'Copy Number', value: i.toString() },
            ],
          });

          // Save to inventory database
          await axios.post(`${API_BASE}/admin/inventory`, {
            name: `${skin.weapon} | ${skin.skinName} #${i}`,
            description: result.metadataUri,
            imageUrl: skin.imageUrl,
            rarity: skin.rarity,
            attributes: {},
            metadataUri: result.metadataUri,
            mintedAsset: result.mint,
            mintTx: result.transaction,
            mintedAt: new Date().toISOString(),
            assignedToBatch: false,
          });

          totalMinted++;
          console.log(`  ✅ Copy ${i}/${COPIES_PER_SKIN} minted and saved to inventory`);
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error: any) {
          totalFailed++;
          console.error(`  ❌ Copy ${i}/${COPIES_PER_SKIN} failed:`, error.message);
        }
      }
      
      console.log(`  📊 Completed ${skin.weapon} | ${skin.skinName}`);
    }

    console.log('\n═'.repeat(60));
    console.log('\n📊 MINTING COMPLETE!\n');
    console.log(`✅ Successfully minted: ${totalMinted} NFTs`);
    if (totalFailed > 0) {
      console.log(`❌ Failed: ${totalFailed} NFTs`);
    }
    console.log(`📦 Total skin templates: ${skins.length}`);
    console.log(`🔢 Average per template: ${(totalMinted / skins.length).toFixed(1)} copies`);
    console.log('\n💾 All NFTs saved to inventory database');
    console.log('🎮 Ready to transfer to users when they open packs!\n');
    console.log('═'.repeat(60));

    // Step 3: Summary
    console.log('\n🔍 Verify NFTs on Solana Explorer:');
    console.log(`https://explorer.solana.com/address/<MINT_ADDRESS>?cluster=devnet\n`);

  } catch (error: any) {
    console.error('\n❌ Script failed:', error.message);
    if (error.response?.data) {
      console.error('API Error:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);

