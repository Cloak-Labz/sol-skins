/**
 * Walrus HTTP API Client for Production Frontend
 * Based on the working implementation from the Solana tests
 */

export interface WalrusUploadResult {
  blobId: string;
  uri: string;
  size: number;
}

export class WalrusClient {
  private baseUrl: string;
  private isTestnet: boolean;

  constructor(isTestnet: boolean = true) {
    this.isTestnet = isTestnet;
    this.baseUrl = isTestnet 
      ? "https://aggregator.walrus-testnet.walrus.space" 
      : "https://aggregator.walrus.walrus.space";
  }

  /**
   * Upload JSON metadata to Walrus
   */
  async uploadJson(metadata: any): Promise<WalrusUploadResult> {
    const jsonString = JSON.stringify(metadata, null, 2);
    const jsonBuffer = Buffer.from(jsonString, 'utf-8');

    try {
      const response = await fetch(`${this.baseUrl}/v1/blob`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: Array.from(jsonBuffer),
        }),
      });

      if (!response.ok) {
        throw new Error(`Walrus upload failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json() as any;
      
      // Extract blob ID from the response
      if (!result.newlyCreated || !result.newlyCreated.blobObject || !result.newlyCreated.blobObject.blobId) {
        throw new Error(`Could not extract blob ID from Walrus response. Response: ${JSON.stringify(result)}`);
      }

      const blobId = result.newlyCreated.blobObject.blobId;
      const uri = `${this.baseUrl}/v1/${blobId}`;
      const size = jsonBuffer.length;

      return {
        blobId,
        uri,
        size,
      };
    } catch (error) {
      console.error('Walrus upload error:', error);
      throw new Error(`Failed to upload to Walrus: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload multiple JSON metadata files to Walrus
   */
  async uploadJsonBatch(metadataArray: any[]): Promise<string[]> {
    const results: string[] = [];
    
    for (let i = 0; i < metadataArray.length; i++) {
      try {
        const result = await this.uploadJson(metadataArray[i]);
        results.push(result.uri);
        console.log(`✅ Walrus upload ${i + 1}/${metadataArray.length} successful: ${result.uri}`);
      } catch (error) {
        console.error(`❌ Walrus upload ${i + 1}/${metadataArray.length} failed:`, error);
        throw error; // Fail fast - no fallbacks in production
      }
    }

    return results;
  }

  /**
   * Create metadata for a CS:GO skin
   */
  createSkinMetadata(skin: {
    name: string;
    weapon: string;
    rarity: string;
    imageUrl: string;
    packId: string;
    index: number;
    totalItems: number;
  }) {
    return {
      name: skin.name,
      symbol: "SKIN",
      description: `CS:GO skin #${skin.index} of ${skin.totalItems} in ${skin.packId}`,
      image: skin.imageUrl,
      attributes: [
        { trait_type: "Weapon", value: skin.weapon },
        { trait_type: "Skin", value: skin.name },
        { trait_type: "Rarity", value: skin.rarity },
        { trait_type: "Pack", value: skin.packId },
        { trait_type: "Index", value: skin.index },
        { trait_type: "Total Items", value: skin.totalItems }
      ],
      collection: {
        name: `CS:GO Skins Collection - ${skin.packId}`,
        family: "Counter-Strike"
      }
    };
  }
}
