import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplTokenMetadata, updateV1, fetchMetadataFromSeeds } from '@metaplex-foundation/mpl-token-metadata';
import { publicKey, createSignerFromKeypair } from '@metaplex-foundation/umi';
import { config } from '../config/env';
import { AppDataSource } from '../config/database';
import { UserSkin } from '../entities/UserSkin';
import { SkinRarity, SkinTemplate } from '../entities/SkinTemplate';
import { Box } from '../entities/Box';
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
  async revealNFT(nftMint: string, boxId: string): Promise<RevealResult> {
    try {
      // Roll rarity
      const rarity = this.rollRarity(boxId);
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
      
      // Update metadata with revealed skin data
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
      let userSkin = await userSkinRepo.findOne({
        where: { nftMintAddress: nftMint },
      });

      if (userSkin) {
        userSkin.skinTemplateId = skin.id;
        userSkin.name = skinFullName;
        userSkin.metadataUri = metadataUri;
        await userSkinRepo.save(userSkin);
      } else {
        userSkin = userSkinRepo.create({
          nftMintAddress: nftMint,
          skinTemplateId: skin.id,
          name: skinFullName,
          metadataUri: metadataUri,
          openedAt: new Date(),
        });
        await userSkinRepo.save(userSkin);
      }

      return {
        nftMint,
        skinName: skinFullName,
        skinRarity: skin.rarity,
        metadataUri: metadataUri,
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

