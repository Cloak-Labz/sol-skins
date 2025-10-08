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
   * Upload metadata to a storage service (like Arweave, IPFS, etc.)
   * For now, this is a placeholder - you'll need to implement actual upload
   */
  static async uploadMetadata(metadata: NFTMetadata): Promise<string> {
    // TODO: Implement actual upload to Arweave, IPFS, or other storage
    // For now, return a placeholder URI
    console.log("Metadata to upload:", metadata);

    // This should be replaced with actual upload logic
    return `https://arweave.net/placeholder-${Date.now()}`;
  }

  /**
   * Create a batch of metadata URIs for a collection
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

    for (const item of items) {
      const metadata = this.createNFTMetadata(item);
      const uri = await this.uploadMetadata(metadata);
      metadataUris.push(uri);
    }

    return metadataUris;
  }
}
