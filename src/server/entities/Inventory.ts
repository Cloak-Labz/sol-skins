import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Inventory - Stores minted NFTs that can be used in batches
 * These are the NFTs that have been minted on-chain
 */
@Entity('inventory')
export class Inventory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  @Index()
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'text' })
  imageUrl!: string;

  @Column({ type: 'varchar', length: 50, default: 'Common' })
  @Index()
  rarity!: string;

  @Column({ type: 'jsonb', nullable: true })
  attributes?: Record<string, any>;

  // Metadata URI
  @Column({ type: 'text', nullable: true })
  @Index()
  metadataUri?: string;

  // Solana NFT mint address (Core NFT asset)
  @Column({ type: 'varchar', length: 88, nullable: true, unique: true })
  @Index()
  mintedAsset?: string;

  // Transaction signature from minting
  @Column({ type: 'text', nullable: true })
  mintTx?: string;

  @Column({ type: 'timestamp', nullable: true })
  mintedAt?: Date;

  // Track if this NFT has been assigned to a batch
  @Column({ type: 'boolean', default: false })
  @Index()
  assignedToBatch!: boolean;

  // Which batch this NFT is assigned to (if any)
  @Column({ type: 'integer', nullable: true })
  @Index()
  batchId?: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
