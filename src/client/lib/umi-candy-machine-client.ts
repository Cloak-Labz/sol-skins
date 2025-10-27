/**
 * Official Metaplex Candy Machine Client using Umi Framework
 * Based on the official Metaplex documentation
 */

import { 
  createUmi,
  defaultPlugins
} from '@metaplex-foundation/umi-bundle-defaults';
import { 
  generateSigner,
  percentAmount,
  publicKey,
  some,
  none,
  keypairIdentity
} from '@metaplex-foundation/umi';
import { 
  create,
  fetchCandyMachine,
  fetchCandyGuard,
  addConfigLines,
  updateCandyMachine,
  deleteCandyMachine,
  deleteCandyGuard,
  mintV2,
  mplCandyMachine
} from '@metaplex-foundation/mpl-candy-machine';
import { 
  createNft,
  mplTokenMetadata
} from '@metaplex-foundation/mpl-token-metadata';
import { 
  walletAdapterIdentity
} from '@metaplex-foundation/umi-signer-wallet-adapters';
import { 
  Connection, 
  PublicKey as SolanaPublicKey,
  Keypair 
} from '@solana/web3.js';

export interface UmiCandyMachineConfig {
  packId: string;
  collectionName: string;
  collectionUri: string;
  itemsAvailable: number;
  sellerFeeBasisPoints: number;
  symbol: string;
  creators: Array<{
    address: SolanaPublicKey;
    verified: boolean;
    percentageShare: number;
  }>;
}

export interface UmiDeployedCandyMachine {
  candyMachine: SolanaPublicKey;
  candyMachineSigner: any;
  candyGuard: SolanaPublicKey;
  collectionMint: SolanaPublicKey;
  collectionMintSigner: any;
  packId: string;
}

export class UmiCandyMachineClient {
  private umi: any;
  private connection: Connection;
  private wallet: any;

  constructor(connection: Connection, wallet: any) {
    this.connection = connection;
    this.wallet = wallet;
    
    // Create Umi instance with RPC endpoint and plugins
    this.umi = createUmi(connection.rpcEndpoint)
      .use(mplCandyMachine())
      .use(mplTokenMetadata());
    
    // Set up wallet identity using Wallet Adapter
    if (wallet && wallet.publicKey && wallet.signTransaction) {
      this.umi.use(walletAdapterIdentity(wallet));
    }
  }

  /**
   * Create a complete Candy Machine setup for a pack using official Metaplex Umi
   */
  async createCandyMachineForPack(
    config: UmiCandyMachineConfig
  ): Promise<UmiDeployedCandyMachine> {
    console.log(`🚀 Creating Candy Machine for pack: ${config.packId} using Umi`);

    try {
      // Step 1: Create Collection NFT
      console.log("📦 Creating Collection NFT...");
      const collectionMintSigner = generateSigner(this.umi);
      
      await createNft(this.umi, {
        mint: collectionMintSigner,
        authority: this.umi.identity,
        name: config.collectionName,
        uri: config.collectionUri,
        sellerFeeBasisPoints: percentAmount(config.sellerFeeBasisPoints / 100, 2),
        isCollection: true,
        collectionDetails: {
          __kind: 'V1',
          size: 0,
        },
      }).sendAndConfirm(this.umi);

      console.log(`✅ Collection created: ${collectionMintSigner.publicKey}`);

      // Step 2: Create Candy Machine
      console.log("🍭 Creating Candy Machine...");
      const candyMachineSigner = generateSigner(this.umi);
      
      await (await create(this.umi, {
        candyMachine: candyMachineSigner,
        collectionMint: collectionMintSigner.publicKey,
        collectionUpdateAuthority: this.umi.identity,
        tokenStandard: 0, // NonFungible
        sellerFeeBasisPoints: percentAmount(config.sellerFeeBasisPoints / 100, 2),
        itemsAvailable: config.itemsAvailable,
        creators: config.creators.map(creator => ({
          address: publicKey(creator.address.toBase58()),
          verified: creator.verified,
          percentageShare: creator.percentageShare,
        })),
        configLineSettings: some({
          prefixName: `${config.packId} #`,
          nameLength: 0,
          prefixUri: '',
          uriLength: 0,
          isSequential: false,
        }),
      })).sendAndConfirm(this.umi);

      console.log(`✅ Candy Machine created: ${candyMachineSigner.publicKey}`);

      // Step 3: Fetch Candy Guard (automatically created)
      const candyMachine = await fetchCandyMachine(this.umi, candyMachineSigner.publicKey);
      const candyGuard = await fetchCandyGuard(this.umi, candyMachine.mintAuthority);

      console.log(`✅ Candy Guard: ${candyMachine.mintAuthority}`);

      return {
        candyMachine: new SolanaPublicKey(candyMachineSigner.publicKey),
        candyMachineSigner,
        candyGuard: new SolanaPublicKey(candyMachine.mintAuthority),
        collectionMint: new SolanaPublicKey(collectionMintSigner.publicKey),
        collectionMintSigner,
        packId: config.packId,
      };

    } catch (error) {
      console.error("❌ Failed to create Candy Machine:", error);
      throw new Error(`Candy Machine creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add items to an existing Candy Machine
   */
  async addItemsToCandyMachine(
    candyMachineAddress: SolanaPublicKey,
    items: Array<{ name: string; uri: string }>
  ): Promise<string> {
    console.log(`📝 Adding ${items.length} items to Candy Machine...`);

    try {
      const result = await addConfigLines(this.umi, {
        candyMachine: publicKey(candyMachineAddress.toBase58()),
        index: 0,
        configLines: items.map(item => ({
          name: item.name,
          uri: item.uri,
        })),
      }).sendAndConfirm(this.umi);

      console.log(`✅ Successfully added ${items.length} items to Candy Machine`);
      console.log(`📝 Transaction signature: ${result.signature}`);

      return result.signature.toString();
      
    } catch (error) {
      console.error("❌ Failed to add items to Candy Machine:", error);
      throw new Error(`Item addition failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch Candy Machine data
   */
  async fetchCandyMachineData(candyMachineAddress: SolanaPublicKey) {
    try {
      const candyMachine = await fetchCandyMachine(this.umi, publicKey(candyMachineAddress.toBase58()));
      const candyGuard = await fetchCandyGuard(this.umi, candyMachine.mintAuthority);
      
      return {
        candyMachine,
        candyGuard,
      };
    } catch (error) {
      console.error("❌ Failed to fetch Candy Machine:", error);
      throw new Error(`Failed to fetch Candy Machine: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update Candy Machine settings
   */
  async updateCandyMachineSettings(
    candyMachineAddress: SolanaPublicKey,
    updates: {
      symbol?: string;
      sellerFeeBasisPoints?: number;
      creators?: Array<{
        address: SolanaPublicKey;
        verified: boolean;
        percentageShare: number;
      }>;
    }
  ): Promise<string> {
    console.log(`🔄 Updating Candy Machine settings...`);

    try {
      const candyMachine = await fetchCandyMachine(this.umi, publicKey(candyMachineAddress.toBase58()));
      
      const result = await updateCandyMachine(this.umi, {
        candyMachine: candyMachine.publicKey,
        data: {
          ...candyMachine.data,
          ...(updates.symbol && { symbol: updates.symbol }),
          ...(updates.sellerFeeBasisPoints && {
            sellerFeeBasisPoints: percentAmount(updates.sellerFeeBasisPoints / 100, 2)
          }),
          ...(updates.creators && {
            creators: updates.creators.map(creator => ({
              address: publicKey(creator.address.toBase58()),
              verified: creator.verified,
              percentageShare: creator.percentageShare,
            }))
          }),
        },
      }).sendAndConfirm(this.umi);

      console.log(`✅ Candy Machine settings updated`);
      console.log(`📝 Transaction signature: ${result.signature}`);

      return result.signature.toString();
      
    } catch (error) {
      console.error("❌ Failed to update Candy Machine:", error);
      throw new Error(`Update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete Candy Machine and Candy Guard
   */
  async deleteCandyMachine(candyMachineAddress: SolanaPublicKey): Promise<string> {
    console.log(`🗑️ Deleting Candy Machine...`);

    try {
      const candyMachine = await fetchCandyMachine(this.umi, publicKey(candyMachineAddress.toBase58()));
      
      // Delete Candy Machine
      const deleteCMTransaction = deleteCandyMachine(this.umi, {
        candyMachine: candyMachine.publicKey,
      });

      // Delete Candy Guard
      const deleteGuardTransaction = deleteCandyGuard(this.umi, {
        candyGuard: candyMachine.mintAuthority,
      });

      // Combine transactions
      const combinedTransaction = deleteCMTransaction.add(deleteGuardTransaction);
      const result = await combinedTransaction.sendAndConfirm(this.umi);

      console.log(`✅ Candy Machine and Candy Guard deleted`);
      console.log(`📝 Transaction signature: ${result.signature}`);

      return result.signature.toString();
      
    } catch (error) {
      console.error("❌ Failed to delete Candy Machine:", error);
      throw new Error(`Deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Mint an NFT from a Candy Machine
   */
  async mintFromCandyMachine(
    candyMachineAddress: string
  ): Promise<{ nftMint: string; signature: string }> {
    console.log(`🎁 Minting from Candy Machine: ${candyMachineAddress}`);

    try {
      // Fetch Candy Machine
      const candyMachine = await fetchCandyMachine(this.umi, publicKey(candyMachineAddress));
      
      // Generate NFT mint signer
      const nftMint = generateSigner(this.umi);
      
      // Mint NFT
      const result = await mintV2(this.umi, {
        candyMachine: candyMachine.publicKey,
        nftMint,
        collectionMint: candyMachine.collectionMint,
        collectionUpdateAuthority: candyMachine.authority,
      }).sendAndConfirm(this.umi);

      console.log(`✅ NFT minted successfully!`);
      console.log(`📝 NFT Mint: ${nftMint.publicKey}`);
      console.log(`📝 Transaction signature: ${result.signature}`);

      return {
        nftMint: nftMint.publicKey.toString(),
        signature: result.signature.toString(),
      };
      
    } catch (error) {
      console.error("❌ Failed to mint from Candy Machine:", error);
      throw new Error(`Minting failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create default configuration for a pack
   */
  createDefaultConfig(
    packId: string,
    collectionName: string,
    collectionUri: string,
    itemsAvailable: number,
    walletAddress: SolanaPublicKey
  ): UmiCandyMachineConfig {
    return {
      packId,
      collectionName,
      collectionUri,
      itemsAvailable,
      sellerFeeBasisPoints: 500, // 5%
      symbol: "SKIN",
      creators: [{
        address: walletAddress,
        verified: true,
        percentageShare: 100,
      }],
    };
  }
}
