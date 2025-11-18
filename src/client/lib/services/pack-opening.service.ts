import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { mplCandyMachine } from "@metaplex-foundation/mpl-candy-machine";
import { generateSigner, publicKey, transactionBuilder, some } from "@metaplex-foundation/umi";
import { setComputeUnitLimit } from "@metaplex-foundation/mpl-toolbox";
import { fetchCandyMachine, mintV2 } from "@metaplex-foundation/mpl-candy-machine";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { Connection as SolanaConnection, PublicKey as SolanaPublicKey } from "@solana/web3.js";
import bs58 from "bs58";
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
    connection: any,
    onProgress?: (message: string) => void
  ): Promise<PackOpeningResult> {
    if (!wallet.connected || !wallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    onProgress?.("Preparing transaction...");
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

    onProgress?.("Waiting for wallet signature...");
    // Generate NFT mint signer
    const nftMint = generateSigner(umi);
    
    // Get USDC mint and token accounts for tokenPayment guard
    const USDC_MINT_ADDRESS = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"; // Devnet USDC
    const USDC_MINT = publicKey(USDC_MINT_ADDRESS);
    const treasuryAddressStr = TREASURY || process.env.NEXT_PUBLIC_TREASURY_ADDRESS || "";
    const treasuryAddress = publicKey(treasuryAddressStr);
    const userPublicKey = wallet.publicKey;
    
    // Get box price in USDC (convert to micro-USDC with 6 decimals)
    const boxPriceUsdc = box.priceUsdc ? Number(box.priceUsdc) : 0;
    const amountMicroUsdc = Math.floor(boxPriceUsdc * 1_000_000); // Convert USDC to micro-USDC (6 decimals)
    
    // Get or create Associated Token Accounts (ATAs)
    const solanaConnection = connection || new SolanaConnection(rpcUrl, 'confirmed');
    const userUsdcAta = await getAssociatedTokenAddress(
      new SolanaPublicKey(USDC_MINT_ADDRESS),
      userPublicKey
    );
    const treasuryUsdcAta = await getAssociatedTokenAddress(
      new SolanaPublicKey(USDC_MINT_ADDRESS),
      new SolanaPublicKey(treasuryAddressStr)
    );
    
    // Mint NFT using resolved config with tokenPayment guard
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
            tokenPayment: some({
              mint: USDC_MINT,
              destinationAta: publicKey(treasuryUsdcAta.toBase58()),
              amount: amountMicroUsdc, // Box price in micro-USDC (6 decimals)
            }),
          },
        })
      )
      .sendAndConfirm(umi, { confirm: { commitment: 'confirmed' } });

    const nftMintAddress = nftMint.publicKey.toString();
    // Convert signature to base58 string (Solana format)
    // mintResult.signature from Umi might be Uint8Array, base64 string, or base58 string
    let signature: string;
    if (typeof mintResult.signature === 'string') {
      const sigStr = mintResult.signature as string;
      // Check if it's base64 (has +, /, or ends with =)
      if (sigStr.includes('+') || sigStr.includes('/') || sigStr.endsWith('=')) {
        // It's base64 - decode and convert to base58
        const decoded = Buffer.from(sigStr, 'base64');
        signature = bs58.encode(decoded);
      } else {
        // Assume it's already base58
        signature = sigStr;
      }
    } else if (mintResult.signature instanceof Uint8Array) {
      signature = bs58.encode(mintResult.signature);
    } else {
      // Fallback: try to convert to base58
      signature = bs58.encode(new Uint8Array(mintResult.signature as any));
    }

    onProgress?.("Waiting for metadata propagation...");
    // Step 3: Wait for metadata propagation and verify mint account exists
    // Verify the mint account was actually created before proceeding
    const solanaConnectionForCheck = connection || new SolanaConnection(rpcUrl, 'confirmed');
    const mintPubkey = new SolanaPublicKey(nftMintAddress);
    
    // Retry checking for mint account (up to 5 times with delays)
    let mintAccount = null;
    const maxMintChecks = 5;
    const mintCheckDelay = 3000;
    
          for (let i = 0; i < maxMintChecks; i++) {
            try {
              mintAccount = await solanaConnectionForCheck.getAccountInfo(mintPubkey, 'confirmed');
        if (mintAccount) {
          console.log(`Mint account verified on attempt ${i + 1}`);
          break;
        }
      } catch (error) {
        console.warn(`Mint account check ${i + 1} failed:`, error);
      }
      
      if (i < maxMintChecks - 1) {
        await new Promise(resolve => setTimeout(resolve, mintCheckDelay));
      }
    }
    
    if (!mintAccount) {
      throw new Error(
        `Failed to verify mint account: ${nftMintAddress}. ` +
        `The NFT may not have been minted successfully. ` +
        `Please check the transaction signature: ${signature} ` +
        `or try again.`
      );
    }
    
    // Additional wait for metadata propagation
    await new Promise(resolve => setTimeout(resolve, 5000));

    onProgress?.("Revealing skin...");
    // Step 4: Reveal the skin
    // apiClient.post returns the data directly (not wrapped in { success, data })
    // Wrap in try-catch to allow animation to proceed even if reveal fails
    let revealResponseData: {
      skinName: string;
      weapon?: string;
      skinRarity: string;
      basePriceUsd: number;
      metadataUri?: string;
      imageUrl?: string;
      nftMint: string;
      txSignature: string;
    };
    
    try {
      revealResponseData = await apiClient.post<{
        skinName: string;
        weapon?: string;
        skinRarity: string;
        basePriceUsd: number;
        metadataUri?: string;
        imageUrl?: string;
        nftMint: string;
        txSignature: string;
      }>(`/reveal/${nftMintAddress}`, {
        boxId: boxId,
        walletAddress: wallet.publicKey.toString(),
      });
    } catch (revealError: any) {
      // If reveal fails, create a fallback response so animation can proceed
      // The mint was successful, so we should still show the animation
      console.warn('Reveal failed, using fallback data:', revealError);
      revealResponseData = {
        skinName: 'Unknown Skin',
        weapon: 'Unknown',
        skinRarity: 'common',
        basePriceUsd: 0,
        nftMint: nftMintAddress,
        txSignature: signature,
      };
    }

    // Step 5: Create pack opening transaction in backend
    // IMPORTANT: Refresh CSRF token after the 12-second wait to prevent expiration
    // The transaction was already signed, so we MUST register it even if there are errors
    await apiClient.refreshCSRFToken();
    
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
          basePriceUsd: revealResponseData.basePriceUsd,
          metadataUri: revealResponseData.metadataUri,
        },
        nonce: nonce,
        timestamp: timestamp,
      });
      savedUserSkin = transactionData?.userSkin;
    } catch (error: any) {
      // Transaction creation failed, but the transaction was already signed on-chain
      // This is a critical error - the user spent SOL but we couldn't register it
      // Log the error details for debugging but still return the reveal data
      
      // Re-throw with a more user-friendly message
      const errorMessage = error?.message || 'Unknown error';
      let userFriendlyMessage = 'Failed to register your pack opening. ';
      
      if (errorMessage.includes('CSRF') || errorMessage.includes('csrf')) {
        userFriendlyMessage += 'Please refresh the page and try again.';
      } else if (errorMessage.includes('walletId') || errorMessage.includes('wallet') || errorMessage.includes('user')) {
        userFriendlyMessage += 'Please reconnect your wallet and try again.';
      } else if (errorMessage.includes('nonce') || errorMessage.includes('timestamp')) {
        userFriendlyMessage += 'The request timed out. Please try again.';
      } else {
        userFriendlyMessage += 'Your transaction was successful, but we couldn\'t update your inventory. Please contact support with your transaction signature.';
      }
      
      throw new Error(userFriendlyMessage);
    }

    // Step 6: Use the skin data from the reveal service
    const resolvedImageUrl: string | undefined = savedUserSkin?.imageUrl || revealResponseData?.imageUrl;
    
    // Use the mint transaction signature (complete transaction with transfers, mint, etc.)
    // instead of the metadata update transaction for the Solscan link
    return {
      nftMint: nftMintAddress,
      signature: signature, // This is the complete mint transaction signature
      skin: {
        id: nftMintAddress, // Use NFT mint as unique ID
        name: revealResponseData.skinName,
        weapon: revealResponseData.weapon || (revealResponseData.skinName?.split(' | ')[0] || 'Unknown'),
        rarity: revealResponseData.skinRarity,
        condition: 'Field-Tested', // Default condition
        imageUrl: resolvedImageUrl,
        basePriceUsd: revealResponseData.basePriceUsd,
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
  }): Promise<{ caseOpeningId: string }> {
    // NOTE: Pack opening transaction is already created in openPack()
    // This method only creates the case opening record for activity tracking
    // We don't need to call /pack-opening/transaction again here to avoid duplicates

    // Then create the case opening record for activity tracking
    // apiClient.post returns the data directly (not wrapped in { success, data })
    // If it throws, the error is already handled by apiClient
    return await apiClient.post<{ caseOpeningId: string }>("/cases/pack-opening", {
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
