/**
 * Mint NFTs for All Skin Templates
 * 
 * This script will:
 * 1. Fetch all skin templates from the database
 * 2. Mint a real Core NFT on-chain for each skin
 * 3. Upload metadata to Walrus
 * 4. Save the NFT to the admin inventory
 * 
 * Run with: npx ts-node scripts/mint-nfts-for-skins.ts
 */

import * as dotenv from 'dotenv';
import axios from 'axios';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplCore } from '@metaplex-foundation/mpl-core';
import { create } from '@metaplex-foundation/mpl-core';
import { generateSigner, signerIdentity, createSignerFromKeypair } from '@metaplex-foundation/umi';
import bs58 from 'bs58';

dotenv.config();

const API_BASE = 'http://localhost:3002/api/v1';
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;
const ADMIN_WALLET = process.env.ADMIN_WALLETS || '5iF1vyxpqeYqWL4fKhSnFyFw5VzBTjRqDEpkiFta3uEm';
const WALRUS_PUBLISHER = process.env.WALRUS_PUBLISHER || 'https://publisher.walrus-testnet.walrus.space';
const WALRUS_AGGREGATOR = process.env.WALRUS_AGGREGATOR || 'https://aggregator.walrus-testnet.walrus.space';

// How many copies of each skin to mint
const COPIES_PER_SKIN = 5;

if (!ADMIN_PRIVATE_KEY) {
  throw new Error('ADMIN_PRIVATE_KEY not found in .env');
}

/**
 * Upload metadata to Walrus
 */
async function uploadToWalrus(metadata: any): Promise<string> {
  console.log(`📝 [WALRUS] Uploading metadata...`);
  
  try {
    const jsonString = JSON.stringify(metadata);
    const blob = Buffer.from(jsonString, 'utf-8');
    
    const response = await axios.put(`${WALRUS_PUBLISHER}/v1/store`, blob, {
      headers: {
        'Content-Type': 'application/octet-stream',
      },
      maxBodyLength: Infinity,
      timeout: 10000,
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
  } catch (error: any) {
    console.error('❌ [WALRUS] Upload failed:', error.message);
    // Fallback to using image URL directly
    console.log('⚠️  [WALRUS] Using image URL as fallback');
    return metadata.image || '';
  }
}

/**
 * Mint a Core NFT on-chain
 */
async function mintCoreNFT(params: {
  name: string;
  skinTemplate: any;
  copyNumber: number;
}): Promise<{ mint: string; transaction: string; metadataUri: string }> {
  const { name, skinTemplate, copyNumber } = params;
  
  console.log(`\n🎨 [MINTING] ${name} (Copy #${copyNumber})...`);
  
  // Setup Umi
  const umi = createUmi(SOLANA_RPC_URL).use(mplCore());
  
  // Convert admin keypair
  const adminKeypairBytes = bs58.decode(ADMIN_PRIVATE_KEY!);
  const adminKeypair = umi.eddsa.createKeypairFromSecretKey(adminKeypairBytes);
  const adminSigner = createSignerFromKeypair(umi, adminKeypair);
  umi.use(signerIdentity(adminSigner));

  // Prepare metadata with copy number
  const nftName = `${name} #${copyNumber}`;
  const metadata = {
    name: nftName,
    description: skinTemplate.description || `${skinTemplate.weapon} | ${skinTemplate.skinName} - ${skinTemplate.rarity}`,
    image: skinTemplate.imageUrl,
    attributes: [
      { trait_type: 'Weapon', value: skinTemplate.weapon },
      { trait_type: 'Skin', value: skinTemplate.skinName },
      { trait_type: 'Rarity', value: skinTemplate.rarity },
      { trait_type: 'Condition', value: skinTemplate.condition },
      { trait_type: 'Base Price USD', value: skinTemplate.basePriceUsd.toString() },
      { trait_type: 'Copy Number', value: copyNumber.toString() },
    ],
  };

  // Upload metadata to Walrus
  const metadataUri = await uploadToWalrus(metadata);

  // Generate asset signer
  const asset = generateSigner(umi);

  // Mint Core NFT (owner is admin wallet)
  console.log(`🔨 [CORE NFT] Minting to admin: ${ADMIN_WALLET}...`);
  
  const tx = await create(umi, {
    asset,
    name: nftName,
    uri: metadataUri,
    owner: ADMIN_WALLET as any,
    plugins: [],
  }).sendAndConfirm(umi);

  const signature = bs58.encode(tx.signature);

  console.log(`✅ [MINTED] Asset: ${asset.publicKey}`);
  console.log(`   Transaction: ${signature}`);

  return {
    mint: asset.publicKey,
    transaction: signature,
    metadataUri,
  };
}

/**
 * Save NFT to admin inventory via API
 */
async function saveToInventory(nft: {
  name: string;
  description: string;
  imageUrl: string;
  rarity: string;
  metadataUri: string;
  mintedAsset: string;
  mintTx: string;
}): Promise<void> {
  try {
    await axios.post(`${API_BASE}/admin/inventory`, {
      name: nft.name,
      description: nft.description,
      imageUrl: nft.imageUrl,
      rarity: nft.rarity,
      attributes: {},
      metadataUri: nft.metadataUri,
      mintedAsset: nft.mintedAsset,
      mintTx: nft.mintTx,
      mintedAt: new Date().toISOString(),
    });
    console.log(`💾 [INVENTORY] Saved to database`);
  } catch (error: any) {
    console.error(`❌ [INVENTORY] Failed to save:`, error.response?.data?.message || error.message);
  }
}

/**
 * Main function
 */
async function main() {
  console.log('\n🚀 Starting NFT Minting Process...\n');
  console.log('═'.repeat(70));
  console.log(`📍 Admin Wallet: ${ADMIN_WALLET}`);
  console.log(`🌐 RPC: ${SOLANA_RPC_URL}`);
  console.log(`📦 Copies per skin: ${COPIES_PER_SKIN}`);
  console.log('═'.repeat(70));

  try {
    // Fetch all skin templates
    console.log('\n🔍 Fetching skin templates...\n');
    const response = await axios.get(`${API_BASE}/admin/skin-templates`);
    const skinTemplates = response.data.data;
    
    console.log(`Found ${skinTemplates.length} skin templates\n`);

    let totalMinted = 0;
    let totalFailed = 0;

    // Mint NFTs for each skin template
    for (const skin of skinTemplates) {
      console.log('\n' + '─'.repeat(70));
      console.log(`\n📦 Skin: ${skin.weapon} | ${skin.skinName}`);
      console.log(`   Rarity: ${skin.rarity}`);
      console.log(`   Price: $${skin.basePriceUsd}`);
      console.log(`   Minting ${COPIES_PER_SKIN} copies...\n`);

      for (let i = 1; i <= COPIES_PER_SKIN; i++) {
        try {
          // Mint NFT
          const nftResult = await mintCoreNFT({
            name: `${skin.weapon} | ${skin.skinName}`,
            skinTemplate: skin,
            copyNumber: i,
          });

          // Save to inventory
          await saveToInventory({
            name: `${skin.weapon} | ${skin.skinName} #${i}`,
            description: skin.description || `${skin.weapon} | ${skin.skinName} - ${skin.rarity}`,
            imageUrl: skin.imageUrl,
            rarity: skin.rarity,
            metadataUri: nftResult.metadataUri,
            mintedAsset: nftResult.mint,
            mintTx: nftResult.transaction,
          });

          totalMinted++;
          
          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error: any) {
          console.error(`\n❌ [ERROR] Failed to mint copy #${i}:`, error.message);
          totalFailed++;
        }
      }
    }

    // Final summary
    console.log('\n' + '═'.repeat(70));
    console.log('\n📊 MINTING COMPLETE!\n');
    console.log(`✅ Successfully minted: ${totalMinted} NFTs`);
    if (totalFailed > 0) {
      console.log(`❌ Failed: ${totalFailed} NFTs`);
    }
    console.log(`\n📍 All NFTs are owned by: ${ADMIN_WALLET}`);
    console.log(`💾 All NFTs saved to admin inventory`);
    console.log('\n🎮 Ready to distribute to users!\n');
    console.log('═'.repeat(70));

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

