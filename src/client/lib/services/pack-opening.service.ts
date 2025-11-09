import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { mplCandyMachine } from "@metaplex-foundation/mpl-candy-machine";
import { generateSigner, publicKey, transactionBuilder, some } from "@metaplex-foundation/umi";
import { setComputeUnitLimit } from "@metaplex-foundation/mpl-toolbox";
import { fetchCandyMachine, mintV2 } from "@metaplex-foundation/mpl-candy-machine";
import { apiClient } from "./api.service";

export interface PackOpeningResult {
  nftMint: string;
  signature: string;
  skin: {
    id: string;
    name: string;
    weapon: string;
    rarity: string;
    condition: string;
    imageUrl?: string;
    basePriceUsd: number;
    metadataUri?: string;
  };
}

export interface PackOpeningRequest {
  boxId: string;
  walletAddress: string;
}

export class PackOpeningService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  }

  async openPack(
    boxId: string,
    wallet: any,
    connection: any
  ): Promise<PackOpeningResult> {
    if (!wallet.connected || !wallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    // Step 1: Get box information from backend
    const boxResponse = await fetch(`${this.baseUrl}/api/v1/boxes/${boxId}`);
    const boxData = await boxResponse.json();
    
    if (!boxData.success) {
      throw new Error("Failed to fetch box information");
    }

    const box = boxData.data;

    // Step 2: Mint NFT from Candy Machine using box configuration
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";
    const umi = createUmi(rpcUrl);
    umi.use(walletAdapterIdentity(wallet));
    umi.use(mplCandyMachine());

    // Prefer server-provided values; fallback to envs if necessary
    const CANDY_MACHINE_ID = box?.candyMachine || process.env.NEXT_PUBLIC_CANDY_MACHINE_ID;
    const COLLECTION_MINT = box?.collectionMint || process.env.NEXT_PUBLIC_COLLECTION_MINT;
    const COLLECTION_UPDATE_AUTHORITY = process.env.NEXT_PUBLIC_COLLECTION_UPDATE_AUTHORITY;
    const CANDY_GUARD_ID = box?.candyGuard || process.env.NEXT_PUBLIC_CANDY_GUARD_ID;
    const TREASURY = box?.treasuryAddress || process.env.NEXT_PUBLIC_TREASURY_ADDRESS;

    if (!CANDY_MACHINE_ID) {
      throw new Error("Candy Machine ID not configured for this box");
    }

    // Fetch Candy Machine
    const candyMachine = await fetchCandyMachine(umi, publicKey(CANDY_MACHINE_ID));
    
    if (candyMachine.itemsRedeemed >= candyMachine.data.itemsAvailable) {
      throw new Error("Candy Machine is sold out");
    }

    // Generate NFT mint signer
    const nftMint = generateSigner(umi);
    
    // Mint NFT using resolved config
    const mintResult = await transactionBuilder()
      .add(setComputeUnitLimit(umi, { units: 800_000 }))
      .add(
        mintV2(umi, {
          candyMachine: candyMachine.publicKey,
          candyGuard: CANDY_GUARD_ID ? publicKey(CANDY_GUARD_ID) : candyMachine.mintAuthority,
          nftMint,
          collectionMint: COLLECTION_MINT ? publicKey(COLLECTION_MINT) : candyMachine.collectionMint,
          collectionUpdateAuthority: COLLECTION_UPDATE_AUTHORITY ? publicKey(COLLECTION_UPDATE_AUTHORITY) : candyMachine.authority,
          mintArgs: {
            solPayment: some({ destination: publicKey(TREASURY || process.env.NEXT_PUBLIC_TREASURY_ADDRESS || "") }),
          },
        })
      )
      .sendAndConfirm(umi, { confirm: { commitment: 'confirmed' } });

    const nftMintAddress = nftMint.publicKey.toString();
    const signature = Buffer.from(mintResult.signature).toString('base64');

    // Step 3: Wait for metadata propagation
    await new Promise(resolve => setTimeout(resolve, 12000));

    // Step 4: Reveal the skin
    // apiClient.post returns the data directly (not wrapped in { success, data })
    const revealResponseData = await apiClient.post<{
      skinName: string;
      weapon?: string;
      skinRarity: string;
      metadataUri?: string;
      imageUrl?: string;
      nftMint: string;
      txSignature: string;
    }>(`/reveal/${nftMintAddress}`, {
      boxId: boxId,
      walletAddress: wallet.publicKey.toString(),
    });

    // Step 5: Create pack opening transaction in backend
    // apiClient.post returns the data directly (not wrapped in { success, data })
    let savedUserSkin: { imageUrl?: string } | undefined;
    try {
      // Generate nonce and timestamp RIGHT BEFORE making the request
      // This ensures the timestamp is fresh and not too old after all the async operations
      const nonce = `pack-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const timestamp = Date.now(); // Use milliseconds to match backend expectation
      
      const transactionData = await apiClient.post<{
        userSkin?: {
          imageUrl?: string;
        };
      }>("/pack-opening/transaction", {
        userId: wallet.publicKey.toString(), // Will be resolved to user ID by backend
        boxId: boxId,
        nftMint: nftMintAddress,
        signature: signature,
        skinData: {
          name: revealResponseData.skinName,
          weapon: revealResponseData.weapon || (revealResponseData.skinName?.split(' | ')[0] || 'Unknown'),
          rarity: revealResponseData.skinRarity,
          basePriceUsd: 0, // Will be calculated from rarity
          metadataUri: revealResponseData.metadataUri,
        },
        nonce: nonce,
        timestamp: timestamp,
      });
      savedUserSkin = transactionData?.userSkin;
    } catch (error) {
      // Transaction creation failed, but we can continue with reveal data
      // Re-throw to prevent duplicate calls
      throw error;
    }

    // Step 6: Use the skin data from the reveal service
    const resolvedImageUrl: string | undefined = savedUserSkin?.imageUrl || revealResponseData?.imageUrl;
    // The reveal service already selected and updated the NFT metadata
    return {
      nftMint: nftMintAddress,
      signature: signature,
      skin: {
        id: nftMintAddress, // Use NFT mint as unique ID
        name: revealResponseData.skinName,
        weapon: revealResponseData.weapon || (revealResponseData.skinName?.split(' | ')[0] || 'Unknown'),
        rarity: revealResponseData.skinRarity,
        condition: 'Field-Tested', // Default condition
        imageUrl: resolvedImageUrl,
        basePriceUsd: 0, // Will be calculated from rarity
        metadataUri: revealResponseData.metadataUri,
      },
    };
  }

  async calculateBuybackAmount(nftMint: string): Promise<{
    nftMint: string;
    skinPrice: number;
    buybackAmount: number;
    buybackAmountLamports: string;
  }> {
    const response = await fetch(`${this.baseUrl}/api/v1/buyback/calculate/${nftMint}`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error?.message || "Failed to calculate buyback amount");
    }

    return data.data;
  }

  async requestBuyback(nftMint: string, walletAddress: string): Promise<{
    transaction: string;
    buybackAmount: number;
  }> {
    // Nonce and timestamp will be added automatically by apiClient interceptor
    // apiClient.post returns the data directly (not wrapped in { success, data })
    return apiClient.post<{
      transaction: string;
      buybackAmount: number;
    }>("/buyback/request", {
      nftMint,
      walletAddress,
    });
  }

  async createPendingSkin(
    userId: string,
    skin: {
      id: string;
      name: string;
      weapon: string;
      rarity: string;
      condition: string;
      imageUrl?: string;
      basePriceUsd: number;
      metadataUri?: string;
    },
    nftMint: string,
    transactionHash: string
  ): Promise<void> {
    // apiClient.post returns the data directly (not wrapped in { success, data })
    // If it throws, the error is already handled by apiClient
    await apiClient.post("/pending-skins", {
      userId,
      skinName: skin.name,
      skinRarity: skin.rarity,
      skinWeapon: skin.weapon,
      skinValue: skin.basePriceUsd,
      skinImage: skin.imageUrl || "",
      nftMintAddress: nftMint,
      transactionHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });
  }

  async createCaseOpeningRecord(data: {
    userId: string;
    boxId: string;
    nftMint: string;
    skinName: string;
    skinRarity: string;
    skinWeapon: string;
    skinValue: number;
    skinImage: string;
    transactionHash: string;
  }): Promise<void> {
    // NOTE: Pack opening transaction is already created in openPack()
    // This method only creates the case opening record for activity tracking
    // We don't need to call /pack-opening/transaction again here to avoid duplicates

    // Then create the case opening record for activity tracking
    // apiClient.post returns the data directly (not wrapped in { success, data })
    // If it throws, the error is already handled by apiClient
    await apiClient.post("/cases/pack-opening", {
      userId: data.userId,
      lootBoxTypeId: data.boxId, // Use boxId as lootBoxTypeId for pack openings
      nftMintAddress: data.nftMint,
      transactionId: data.transactionHash,
      skinName: data.skinName,
      skinRarity: data.skinRarity,
      skinWeapon: data.skinWeapon,
      skinValue: data.skinValue,
      skinImage: data.skinImage,
      isPackOpening: true, // Flag to indicate this is a pack opening, not a case opening
    });
  }
}

export const packOpeningService = new PackOpeningService();
