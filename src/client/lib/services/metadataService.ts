export interface NFTMetadata {
  name: string;
  symbol: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
  properties: {
    files: Array<{
      uri: string;
      type: string;
    }>;
    category: string;
    creators: Array<{
      address: string;
      share: number;
    }>;
  };
}

export class MetadataService {
  /**
   * Create collection metadata for the Candy Machine
   */
  static createCollectionMetadata(config: {
    name: string;
    symbol: string;
    description: string;
    image: string;
    externalUrl?: string;
  }): NFTMetadata {
    return {
      name: config.name,
      symbol: config.symbol,
      description: config.description,
      image: config.image,
      attributes: [
        {
          trait_type: "Collection",
          value: "SolSkins",
        },
        {
          trait_type: "Type",
          value: "CS2 Skin",
        },
      ],
      properties: {
        files: [
          {
            uri: config.image,
            type: "image/png",
          },
        ],
        category: "image",
        creators: [
          {
            address: "SolSkins Team", // This should be the actual creator address
            share: 100,
          },
        ],
      },
    };
  }

  /**
   * Create individual NFT metadata
   */
  static createNFTMetadata(config: {
    name: string;
    description: string;
    image: string;
    rarity: string;
    skinType: string;
    condition?: string;
    wear?: number;
    externalUrl?: string;
  }): NFTMetadata {
    const attributes = [
      {
        trait_type: "Rarity",
        value: config.rarity,
      },
      {
        trait_type: "Skin Type",
        value: config.skinType,
      },
    ];

    if (config.condition) {
      attributes.push({
        trait_type: "Condition",
        value: config.condition,
      });
    }

    if (config.wear !== undefined) {
      attributes.push({
        trait_type: "Wear",
        value: config.wear,
      });
    }

    return {
      name: config.name,
      symbol: "SOLSKINS",
      description: config.description,
      image: config.image,
      attributes,
      properties: {
        files: [
          {
            uri: config.image,
            type: "image/png",
          },
        ],
        category: "image",
        creators: [
          {
            address: "SolSkins Team", // This should be the actual creator address
            share: 100,
          },
        ],
      },
    };
  }

  /**
   * Upload metadata to Arweave via Irys
   * Uses server-side upload endpoint to avoid wallet signing requirements
   */
  static async uploadMetadata(metadata: NFTMetadata): Promise<string> {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/irys/upload`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ metadata }),
        }
      );

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to upload metadata to Irys');
      }

      console.log('Metadata uploaded to Irys:', result.data);
      return result.data.uri;
    } catch (error) {
      console.error('Error uploading metadata to Irys:', error);
      throw error;
    }
  }

  /**
   * Create a batch of metadata URIs for a collection
   * Uses Irys for permanent Arweave storage
   */
  static async createBatchMetadata(
    items: Array<{
      name: string;
      description: string;
      image: string;
      rarity: string;
      skinType: string;
      condition?: string;
      wear?: number;
    }>
  ): Promise<string[]> {
    const metadataUris: string[] = [];

    // Create all metadata objects first
    const metadataObjects = items.map(item => this.createNFTMetadata(item));

    // Upload all metadata to Irys (can be optimized with parallel uploads)
    for (const metadata of metadataObjects) {
      const uri = await this.uploadMetadata(metadata);
      metadataUris.push(uri);
    }

    return metadataUris;
  }
}
