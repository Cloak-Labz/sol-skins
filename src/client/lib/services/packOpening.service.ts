import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { mplCandyMachine } from "@metaplex-foundation/mpl-candy-machine";
import { generateSigner, publicKey, transactionBuilder, some } from "@metaplex-foundation/umi";
import { setComputeUnitLimit } from "@metaplex-foundation/mpl-toolbox";
import { fetchCandyMachine, mintV2 } from "@metaplex-foundation/mpl-candy-machine";

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

    // Step 2: Mint NFT from Candy Machine using the same configuration as test-mint
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";
    const umi = createUmi(rpcUrl);
    umi.use(walletAdapterIdentity(wallet));
    umi.use(mplCandyMachine());

    // Use the same Candy Machine as test-mint page
    const CANDY_MACHINE_ID = "5WDRNFjb3KNfNdXyiikUhU7pZWR2Gq9AYZQ8vFcATt1h";
    const COLLECTION_MINT = "BBwtV8CDpp4t8KjKMgNuGiz4Hqpsv1fWbayPPLLSFfFh";

    // Fetch Candy Machine
    const candyMachine = await fetchCandyMachine(umi, publicKey(CANDY_MACHINE_ID));
    
    if (candyMachine.itemsRedeemed >= candyMachine.data.itemsAvailable) {
      throw new Error("Candy Machine is sold out");
    }

    // Generate NFT mint signer
    const nftMint = generateSigner(umi);
    
    // Mint NFT using the same configuration as test-mint
    const mintResult = await transactionBuilder()
      .add(setComputeUnitLimit(umi, { units: 800_000 }))
      .add(
        mintV2(umi, {
          candyMachine: candyMachine.publicKey,
          candyGuard: candyMachine.mintAuthority,
          nftMint,
          collectionMint: candyMachine.collectionMint,
          collectionUpdateAuthority: candyMachine.authority,
          mintArgs: {
            solPayment: some({ destination: publicKey(process.env.NEXT_PUBLIC_TREASURY_ADDRESS || "v1t1nCTfxttsTFW3t7zTQFUsdpznu8kggzYSg7SDJMs") }),
          },
        })
      )
      .sendAndConfirm(umi, { confirm: { commitment: 'confirmed' } });

    const nftMintAddress = nftMint.publicKey.toString();
    const signature = Buffer.from(mintResult.signature).toString('base64');

    // Step 3: Wait for metadata propagation
    await new Promise(resolve => setTimeout(resolve, 12000));

    // Step 4: Reveal the skin
    const revealResponse = await fetch(`${this.baseUrl}/api/v1/reveal/${nftMintAddress}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        boxId: boxId,
        walletAddress: wallet.publicKey.toString(),
      }),
    });

    const revealData = await revealResponse.json();
    
    if (!revealData.success) {
      throw new Error(revealData.error?.message || "Failed to reveal skin");
    }

    // Step 5: Use the skin data from the reveal service
    // The reveal service already selected and updated the NFT metadata
    return {
      nftMint: nftMintAddress,
      signature: signature,
      skin: {
        id: nftMintAddress, // Use NFT mint as unique ID
        name: revealData.data.skinName,
        weapon: revealData.data.skinName.split(' | ')[0] || 'Unknown',
        rarity: revealData.data.skinRarity,
        condition: 'Field-Tested', // Default condition
        imageUrl: '', // Will be fetched from metadata
        basePriceUsd: 0, // Will be calculated from rarity
        metadataUri: revealData.data.metadataUri,
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
    const response = await fetch(`${this.baseUrl}/api/v1/buyback/request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nftMint,
        walletAddress,
      }),
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error?.message || "Failed to request buyback");
    }

    return data.data;
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
    const response = await fetch(`${this.baseUrl}/api/v1/pending-skins`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        skinName: skin.name,
        skinRarity: skin.rarity,
        skinWeapon: skin.weapon,
        skinValue: skin.basePriceUsd,
        skinImage: skin.imageUrl || "",
        nftMintAddress: nftMint,
        transactionHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      }),
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error?.message || "Failed to create pending skin");
    }
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
    const response = await fetch(`${this.baseUrl}/api/v1/cases/pack-opening`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
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
      }),
    });

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error?.message || "Failed to create case opening record");
    }
  }
}

export const packOpeningService = new PackOpeningService();
