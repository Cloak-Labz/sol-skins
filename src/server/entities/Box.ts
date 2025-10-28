import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Box - Stores batch data synchronized with on-chain state
 * Represents a loot box/batch that can be opened by users
 */
@Entity('boxes')
export class Box {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // On-chain batch ID (optional until batch is published)
  @Column({ type: 'integer', unique: true, nullable: true })
  @Index()
  batchId?: number;

  // Candy Machine address (Metaplex collection)
  @Column({ type: 'varchar', length: 88 })
  @Index()
  candyMachine!: string;

  // Collection mint address
  @Column({ type: 'varchar', length: 88 })
  @Index()
  collectionMint!: string;

  // Hidden Settings URI for placeholder metadata
  @Column({ type: 'text', nullable: true })
  hiddenSettingsUri?: string;

  // Box name/title
  @Column({ type: 'varchar', length: 255 })
  name!: string;

  // Box description
  @Column({ type: 'text', nullable: true })
  description?: string;

  // Box image URL
  @Column({ type: 'text' })
  imageUrl!: string;

  // Box price in SOL
  @Column({ type: 'decimal', precision: 10, scale: 6, default: 0 })
  priceSol!: number;

  // Box price in USDC
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  priceUsdc!: number;

  // Total items in this batch
  @Column({ type: 'integer', default: 0 })
  totalItems!: number;

  // Items available for opening
  @Column({ type: 'integer', default: 0 })
  itemsAvailable!: number;

  // Items that have been opened
  @Column({ type: 'integer', default: 0 })
  itemsOpened!: number;

  // Merkle root for this batch
  @Column({ type: 'varchar', length: 64 })
  merkleRoot!: string;

  // Metadata URIs for items in this batch
  @Column({ type: 'jsonb' })
  metadataUris!: string[];

  // Snapshot timestamp
  @Column({ type: 'bigint' })
  snapshotTime!: number;

  // Box status
  @Column({ type: 'varchar', length: 20, default: 'active' })
  @Index()
  status!: 'active' | 'paused' | 'sold_out' | 'ended';

  // On-chain transaction signatures
  @Column({ type: 'varchar', length: 88, nullable: true })
  createTx?: string;

  @Column({ type: 'varchar', length: 88, nullable: true })
  updateTx?: string;

  // Synchronization status
  @Column({ type: 'boolean', default: true })
  @Index()
  isSynced!: boolean;

  // Last sync timestamp
  @Column({ type: 'timestamp', nullable: true })
  lastSyncedAt?: Date;

  // Sync error message (if any)
  @Column({ type: 'text', nullable: true })
  syncError?: string;

  // Candy Machine specific fields
  @Column({ type: 'varchar', length: 88, nullable: true })
  @Index()
  candyGuard?: string;

  @Column({ type: 'varchar', length: 88, nullable: true })
  @Index()
  treasuryAddress?: string;

  @Column({ type: 'integer', nullable: true })
  itemsRedeemed?: number;

  @Column({ type: 'boolean', default: false })
  isMutable!: boolean;

  @Column({ type: 'integer', default: 500 })
  sellerFeeBasisPoints!: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  symbol?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
