import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplTokenMetadata, updateV1, fetchMetadataFromSeeds } from '@metaplex-foundation/mpl-token-metadata';
import { publicKey, createSignerFromKeypair } from '@metaplex-foundation/umi';
import { config } from '../config/env';
import axios from 'axios';
import { AppDataSource } from '../config/database';
import { UserSkin } from '../entities/UserSkin';
import { User } from '../entities/User';
import { SkinRarity, SkinTemplate } from '../entities/SkinTemplate';
import { BoxSkin } from '../entities/BoxSkin';
import { Box } from '../entities/Box';
import { CaseOpening } from '../entities/CaseOpening';

export interface RevealResult {
  nftMint: string;
  skinName: string;
  weapon: string;
  skinRarity: string;
  imageUrl?: string;
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
   * Select a skin from the box's configured pool using weight, constrained by rolled rarity.
   */
  private async selectBoxSkinByRarity(boxId: string, rarity: string): Promise<{ boxSkin: BoxSkin; skinTemplate: SkinTemplate | null } | null> {
    const boxSkinRepo = AppDataSource.getRepository(BoxSkin);
    const skinTemplateRepo = AppDataSource.getRepository(SkinTemplate);

    const boxSkins = await boxSkinRepo.find({ where: { boxId, rarity } });
    if (!boxSkins.length) {
      console.warn(`No box_skins found for box ${boxId} and rarity ${rarity}`);
      return null;
    }

    // Weighted random selection
    const totalWeight = boxSkins.reduce((sum, s) => sum + (s.weight || 1), 0);
    let rnd = Math.random() * totalWeight;
    let selected = boxSkins[0];
    for (const s of boxSkins) {
      rnd -= (s.weight || 1);
      if (rnd <= 0) {
        selected = s;
        break;
      }
    }

    let matchedTemplate: SkinTemplate | null = null;
    if (selected.skinTemplateId) {
      matchedTemplate = await skinTemplateRepo.findOne({ where: { id: selected.skinTemplateId } });
    } else {
      // Best-effort lookup by weapon + skinName (selected.name is full name: "Weapon | Skin")
      const [weapon, skinName] = (selected.name || '').split(' | ').map(x => x?.trim());
      if (weapon && skinName) {
        matchedTemplate = await skinTemplateRepo.findOne({ where: { weapon, skinName } });
      }
    }

    return { boxSkin: selected, skinTemplate: matchedTemplate };
  }

  /**
   * Reveal an NFT by updating its metadata
   */
  async revealNFT(nftMint: string, boxId: string, walletAddress?: string): Promise<RevealResult> {
    try {
      // Roll rarity and select from the specific box's pool
      const rarity = this.rollRarity(boxId);
      let selection = await this.selectBoxSkinByRarity(boxId, rarity);
      if (!selection) {
        // Fallback: select from all box_skins for this box (weighted), ignoring rarity
        const boxSkinRepo = AppDataSource.getRepository(BoxSkin);
        const allBoxSkins = await boxSkinRepo.find({ where: { boxId } });
        if (!allBoxSkins.length) {
          throw new Error(`No box skins configured for boxId=${boxId}`);
        }
        const totalWeightAll = allBoxSkins.reduce((sum, s) => sum + (s.weight || 1), 0);
        let rndAll = Math.random() * totalWeightAll;
        let picked = allBoxSkins[0];
        for (const s of allBoxSkins) {
          rndAll -= (s.weight || 1);
          if (rndAll <= 0) { picked = s; break; }
        }
        const skinTemplateRepo = AppDataSource.getRepository(SkinTemplate);
        let matchedTemplate: SkinTemplate | null = null;
        if (picked.skinTemplateId) {
          matchedTemplate = await skinTemplateRepo.findOne({ where: { id: picked.skinTemplateId } });
        } else {
          const [weapon, skinName] = (picked.name || '').split(' | ').map(x => x?.trim());
          if (weapon && skinName) {
            matchedTemplate = await skinTemplateRepo.findOne({ where: { weapon, skinName } });
          }
        }
        selection = { boxSkin: picked, skinTemplate: matchedTemplate };
      }
      const { boxSkin, skinTemplate: skin } = selection;

      await new Promise(resolve => setTimeout(resolve, 10000));

      const nftMintPubkey = publicKey(nftMint);
      const metadata = await fetchMetadataFromSeeds(this.umi, {
        mint: nftMintPubkey,
      });

      const namePart = (boxSkin.name || '').includes('|')
        ? (boxSkin.name || '').split('|')[1].trim()
        : (boxSkin.name || skin?.skinName || 'Unknown');
      const weapon = boxSkin.weapon || skin?.weapon || 'Unknown';
      const skinFullName = `${weapon} | ${namePart}`;
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

      // Create or update user skin with proper user association
      const userSkinRepo = AppDataSource.getRepository(UserSkin);
      const userRepo = AppDataSource.getRepository(User);
      
      let userSkin = await userSkinRepo.findOne({
        where: { nftMintAddress: nftMint },
      });

      // Find user by wallet address if provided
      let userId: string | undefined;
      if (walletAddress) {
        const user = await userRepo.findOne({
          where: { walletAddress },
        });
        userId = user?.id;
      }

      // Try to resolve image URL from metadata
      let resolvedImageUrl: string | undefined;
      try {
        const metaResp = await axios.get(metadataUri, { timeout: 8000 });
        let img: string | undefined = metaResp.data?.image;
        if (img && img.startsWith('ipfs://')) {
          img = `https://ipfs.io/ipfs/${img.replace('ipfs://', '')}`;
        }
        if (img && /^https?:\/\//.test(img)) {
          resolvedImageUrl = img;
        }
      } catch (_) {
        // ignore; will fallback
      }

      // Prefer resolved image from metadata; fallback to boxSkin.imageUrl
      if (!resolvedImageUrl && boxSkin.imageUrl) {
        resolvedImageUrl = boxSkin.imageUrl;
      }

      if (userSkin) {
        // Update existing user skin
        userSkin.skinTemplateId = skin?.id;
        userSkin.name = skinFullName;
        userSkin.metadataUri = metadataUri;
        if (resolvedImageUrl) {
          userSkin.imageUrl = resolvedImageUrl;
        }
        if (userId) {
          userSkin.userId = userId;
        }
        await userSkinRepo.save(userSkin);
      } else {
        // Create new user skin
        userSkin = userSkinRepo.create({
          nftMintAddress: nftMint,
          skinTemplateId: skin?.id,
          name: skinFullName,
          metadataUri: metadataUri,
          imageUrl: resolvedImageUrl,
          openedAt: new Date(),
          userId: userId,
          currentPriceUsd: Number(boxSkin.basePriceUsd ?? skin?.basePriceUsd ?? 0),
          lastPriceUpdate: new Date(),
          isInInventory: true,
          symbol: 'SKIN',
        });
        await userSkinRepo.save(userSkin);
      }

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
        skinName: skinFullName,
        weapon,
        skinRarity: boxSkin.rarity,
        imageUrl: resolvedImageUrl,
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

