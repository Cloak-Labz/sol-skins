import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplTokenMetadata, updateV1, fetchMetadataFromSeeds } from '@metaplex-foundation/mpl-token-metadata';
import { publicKey, createSignerFromKeypair } from '@metaplex-foundation/umi';
import { config } from '../config/env';
import { AppDataSource } from '../config/database';
import { UserSkin } from '../entities/UserSkin';
import { User } from '../entities/User';
import { SkinRarity, SkinTemplate } from '../entities/SkinTemplate';
import { Box } from '../entities/Box';
import { BoxSkin } from '../entities/BoxSkin';
import { CaseOpening } from '../entities/CaseOpening';

export interface RevealResult {
  nftMint: string;
  skinName: string;
  skinRarity: string;
  metadataUri: string;
  txSignature: string;
}

export class RevealService {
  private connection: Connection;
  private umi: any;
  private updateAuthority: Keypair;

  constructor() {
    this.connection = new Connection(config.solana.rpcUrl, 'confirmed');
    
    // Initialize Umi
    this.umi = createUmi(config.solana.rpcUrl);
    this.umi.use(mplTokenMetadata());
    
    // Initialize update authority from private key
    const privateKeyArray = JSON.parse(config.buyback.adminWalletPrivateKey);
    this.updateAuthority = Keypair.fromSecretKey(new Uint8Array(privateKeyArray));
    
    // Set update authority as signer in Umi
    const umiKeypair = this.umi.eddsa.createKeypairFromSecretKey(
      this.updateAuthority.secretKey
    );
    const signer = createSignerFromKeypair(this.umi, umiKeypair);
    this.umi.use({ install: (umi: any) => { umi.payer = signer; } });
  }

  /**
   * Roll rarity based on box odds
   */
  private rollRarity(boxId: string): string {
    // Simplified rarity odds (you can customize this based on box configuration)
    const rand = Math.random();
    
    if (rand < 0.50) return 'Common';      // 50%
    if (rand < 0.75) return 'Uncommon';    // 25%
    if (rand < 0.90) return 'Rare';        // 15%
    if (rand < 0.97) return 'Epic';        // 7%
    return 'Legendary';                     // 3%
  }

  /**
   * Select a skin from the pool based on rarity
   */
  private async selectSkinByRarity(rarity: string): Promise<SkinTemplate | null> {
    const skinTemplateRepo = AppDataSource.getRepository(SkinTemplate);
    
    // Find all skins of this rarity
    const skins = await skinTemplateRepo.find({
      where: { rarity: rarity as SkinRarity },
    });

    if (skins.length === 0) {
      console.warn(`No skins found for rarity: ${rarity}`);
      return null;
    }

    // Randomly select one
    const randomIndex = Math.floor(Math.random() * skins.length);
    return skins[randomIndex];
  }

  /**
   * Reveal an NFT by updating its metadata
   */
  async revealNFT(nftMint: string, boxId: string, walletAddress?: string): Promise<RevealResult> {
    try {
      // Roll rarity
      const rarity = this.rollRarity(boxId);
      
      const boxSkinRepo = AppDataSource.getRepository(BoxSkin);
      const availableSkins = await boxSkinRepo.find({
        where: { 
          boxId: boxId,
          rarity: rarity.toLowerCase() 
        },
      });

      // If no BoxSkins configured, fallback to old SkinTemplate behavior
      if (availableSkins.length === 0) {
        console.warn(`No BoxSkins found for box ${boxId} with rarity ${rarity}, falling back to SkinTemplate`);
        const skin = await this.selectSkinByRarity(rarity);
        if (!skin) {
          throw new Error(`No skin template found for rarity: ${rarity}`);
        }

        await new Promise(resolve => setTimeout(resolve, 10000));

        const nftMintPubkey = publicKey(nftMint);
        const metadata = await fetchMetadataFromSeeds(this.umi, {
          mint: nftMintPubkey,
        });

        const skinFullName = `${skin.weapon} | ${skin.skinName}`;
        const metadataUri = `https://arweave.net/${nftMint.slice(0, 32)}`;
        
        const tx = await updateV1(this.umi, {
          mint: nftMintPubkey,
          authority: this.umi.payer,
          data: {
            ...metadata,
            name: skinFullName,
            uri: metadataUri,
          },
        }).sendAndConfirm(this.umi);

        const txSignature = Buffer.from(tx.signature).toString('base64');

        const userSkinRepo = AppDataSource.getRepository(UserSkin);
        const userRepo = AppDataSource.getRepository(User);
        
        let userId: string | undefined;
        if (walletAddress) {
          const user = await userRepo.findOne({ where: { walletAddress } });
          userId = user?.id;
        }

        const userSkin = userSkinRepo.create({
          nftMintAddress: nftMint,
          skinTemplateId: skin.id,
          name: skinFullName,
          metadataUri: metadataUri,
          openedAt: new Date(),
          userId: userId,
          currentPriceUsd: skin.basePriceUsd,
          lastPriceUpdate: new Date(),
          isInInventory: true,
          symbol: 'SKIN',
        });
        await userSkinRepo.save(userSkin);

        if (userId) {
          const user = await userRepo.findOne({ where: { id: userId } });
          if (user) {
            user.casesOpened = (user.casesOpened || 0) + 1;
            await userRepo.save(user);
          }
        }

        return {
          nftMint,
          skinName: skinFullName,
          skinRarity: skin.rarity,
          metadataUri: metadataUri,
          txSignature,
        };
      }

      // NEW: Select random skin from box-specific pool
      const selectedSkin = availableSkins[Math.floor(Math.random() * availableSkins.length)];
      
      // Ensure metadata URI exists
      if (!selectedSkin.metadataUri) {
        throw new Error(`Skin ${selectedSkin.name} (ID: ${selectedSkin.id}) has no Arweave metadata URI. Please upload metadata first in admin panel.`);
      }

      // Wait for metadata propagation
      await new Promise(resolve => setTimeout(resolve, 10000));

      const nftMintPubkey = publicKey(nftMint);
      
      // Fetch existing metadata (from Candy Machine)
      const metadata = await fetchMetadataFromSeeds(this.umi, {
        mint: nftMintPubkey,
      });

      console.log(`Revealing NFT ${nftMint} with skin: ${selectedSkin.name}`);
      console.log(`Using Arweave URI: ${selectedSkin.metadataUri}`);

      // Update NFT to point to the real metadata URI (like test-dummy.js!)
      const tx = await updateV1(this.umi, {
        mint: nftMintPubkey,
        authority: this.umi.payer,
        data: {
          ...metadata,  // Keep existing data
          name: selectedSkin.name,  // Update with revealed name
          uri: selectedSkin.metadataUri,  // Update with pre-uploaded Arweave URI!
        },
      }).sendAndConfirm(this.umi);

      const txSignature = Buffer.from(tx.signature).toString('base64');

      // Save to database
      const userSkinRepo = AppDataSource.getRepository(UserSkin);
      const userRepo = AppDataSource.getRepository(User);
      
      let userId: string | undefined;
      if (walletAddress) {
        const user = await userRepo.findOne({ where: { walletAddress } });
        userId = user?.id;
      }

      const userSkin = userSkinRepo.create({
        nftMintAddress: nftMint,
        skinTemplateId: selectedSkin.skinTemplateId,
        name: selectedSkin.name,
        metadataUri: selectedSkin.metadataUri,  // Store the real URI
        openedAt: new Date(),
        userId: userId,
        currentPriceUsd: Number(selectedSkin.basePriceUsd),
        lastPriceUpdate: new Date(),
        isInInventory: true,
        symbol: 'SKIN',
      });
      await userSkinRepo.save(userSkin);

      // Update user stats if we have a user
      if (userId) {
        const user = await userRepo.findOne({ where: { id: userId } });
        if (user) {
          user.casesOpened = (user.casesOpened || 0) + 1;
          await userRepo.save(user);
        }
      }

      return {
        nftMint,
        skinName: selectedSkin.name,
        skinRarity: selectedSkin.rarity,
        metadataUri: selectedSkin.metadataUri,
        txSignature,
      };
    } catch (error) {
      console.error('Failed to reveal NFT:', error);
      throw error;
    }
  }

  /**
   * Check if an NFT has been revealed
   */
  async isRevealed(nftMint: string): Promise<boolean> {
    const userSkinRepo = AppDataSource.getRepository(UserSkin);
    const userSkin = await userSkinRepo.findOne({
      where: { nftMintAddress: nftMint },
    });

    return userSkin?.skinTemplateId !== null && userSkin?.skinTemplateId !== undefined;
  }

  /**
   * Get reveal status for an NFT
   */
  async getRevealStatus(nftMint: string): Promise<{
    revealed: boolean;
    skinName?: string;
    skinRarity?: string;
    metadataUri?: string;
  }> {
    const userSkinRepo = AppDataSource.getRepository(UserSkin);
    const userSkin = await userSkinRepo.findOne({
      where: { nftMintAddress: nftMint },
      relations: ['skinTemplate'],
    });

    if (!userSkin) {
      return { revealed: false };
    }

    const revealed = userSkin.skinTemplateId !== null && userSkin.skinTemplateId !== undefined;

    if (revealed && userSkin.skinTemplate) {
      return {
        revealed: true,
        skinName: userSkin.skinTemplate.skinName,
        skinRarity: userSkin.skinTemplate.rarity,
        metadataUri: userSkin.metadataUri,
      };
    }

    return { revealed };
  }

  /**
   * Batch reveal multiple NFTs
   */
  async batchReveal(nftMints: string[], boxId: string): Promise<RevealResult[]> {
    const results: RevealResult[] = [];

    for (const nftMint of nftMints) {
      try {
        const result = await this.revealNFT(nftMint, boxId);
        results.push(result);
      } catch (error) {
        console.error(`Failed to reveal NFT ${nftMint}:`, error);
        // Continue with other NFTs
      }
    }

    return results;
  }
}

