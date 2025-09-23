import { PrismaClient } from '@prisma/client';
import { config } from '../lib/config';
import crypto from 'crypto';

interface MerkleNode {
  hash: string;
  left?: MerkleNode;
  right?: MerkleNode;
  data?: any;
}

export class SnapshotGenerator {
  constructor(private prisma: PrismaClient) {}

  async generateSnapshot(): Promise<void> {
    console.log('📸 Generating merkle snapshot...');

    // Get all available skins
    const skins = await this.prisma.skin.findMany({
      where: { status: 'available' },
      select: {
        id: true,
        inventoryRef: true,
        rarity: true,
        priceRef: true,
      },
    });

    if (skins.length === 0) {
      console.log('⚠️ No available skins found for snapshot');
      return;
    }

    // Generate Merkle tree
    const merkleTree = this.buildMerkleTree(skins);
    const merkleRoot = merkleTree.hash;

    // Generate operator signature (mock)
    const operatorSig = this.generateMockSignature(merkleRoot);

    // Store snapshot in database
    const snapshot = await this.prisma.merkleSnapshot.create({
      data: {
        merkleRoot,
        operatorSig,
        totalItems: skins.length,
      },
    });

    console.log(`📸 Generated snapshot ${snapshot.id} with ${skins.length} items`);
    console.log(`📸 Merkle root: ${merkleRoot}`);

    // In a real implementation, you would:
    // 1. Publish merkle root to Anchor program
    // 2. Store proof paths for each item
    // 3. Update batch information

    console.log('✅ Snapshot generation completed');
  }

  private buildMerkleTree(items: any[]): MerkleNode {
    if (items.length === 0) {
      throw new Error('Cannot build Merkle tree with empty items');
    }

    if (items.length === 1) {
      const item = items[0];
      const leafData = {
        id: item.id,
        inventoryRef: item.inventoryRef,
        rarity: item.rarity,
        priceRef: Number(item.priceRef),
      };
      return {
        hash: this.hashLeaf(leafData),
        data: leafData,
      };
    }

    // Create leaf nodes
    const leaves = items.map(item => {
      const leafData = {
        id: item.id,
        inventoryRef: item.inventoryRef,
        rarity: item.rarity,
        priceRef: Number(item.priceRef),
      };
      return {
        hash: this.hashLeaf(leafData),
        data: leafData,
      };
    });

    // Build tree bottom-up
    let currentLevel = leaves;
    while (currentLevel.length > 1) {
      const nextLevel: MerkleNode[] = [];
      
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = currentLevel[i + 1] || left; // Duplicate last node if odd number
        
        const combinedHash = this.hashNodes(left.hash, right.hash);
        nextLevel.push({
          hash: combinedHash,
          left,
          right,
        });
      }
      
      currentLevel = nextLevel;
    }

    return currentLevel[0];
  }

  private hashLeaf(data: any): string {
    const dataString = JSON.stringify(data) + config.MERKLE_SALT;
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  private hashNodes(leftHash: string, rightHash: string): string {
    const combined = leftHash + rightHash + config.MERKLE_SALT;
    return crypto.createHash('sha256').update(combined).digest('hex');
  }

  private generateMockSignature(data: string): string {
    // In production, use actual Ed25519 signing
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    return `mock_sig_${hash.slice(0, 16)}`;
  }

  async generateProofForItem(inventoryRef: string): Promise<{
    leaf: string;
    path: string[];
    root: string;
  } | null> {
    // Get the latest snapshot
    const snapshot = await this.prisma.merkleSnapshot.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (!snapshot) {
      return null;
    }

    // Get all items from that snapshot
    const skins = await this.prisma.skin.findMany({
      where: { status: 'available' },
      select: {
        id: true,
        inventoryRef: true,
        rarity: true,
        priceRef: true,
      },
    });

    // Find the item
    const item = skins.find(skin => skin.inventoryRef === inventoryRef);
    if (!item) {
      return null;
    }

    // Generate proof path (simplified - in production, store proof paths)
    const leafData = {
      id: item.id,
      inventoryRef: item.inventoryRef,
      rarity: item.rarity,
      priceRef: Number(item.priceRef),
    };

    const leafHash = this.hashLeaf(leafData);
    const proofPath: string[] = [];

    // In a real implementation, you would traverse the tree to get the actual proof path
    // For now, return a mock proof
    for (let i = 0; i < 3; i++) {
      proofPath.push(`proof_node_${i}_${Math.random().toString(36).substr(2, 9)}`);
    }

    return {
      leaf: leafHash,
      path: proofPath,
      root: snapshot.merkleRoot,
    };
  }
}
