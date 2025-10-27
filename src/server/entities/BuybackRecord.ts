import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './User';

/**
 * BuybackRecord - Tracks NFT buyback transactions
 */
@Entity('buyback_records')
export class BuybackRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // User who sold back the NFT
  @Column({ type: 'uuid', nullable: true })
  userId?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user?: User;

  // User's wallet address
  @Column({ type: 'varchar', length: 88 })
  @Index()
  userWallet!: string;

  // NFT mint address that was burned
  @Column({ type: 'varchar', length: 88 })
  @Index()
  nftMint!: string;

  // Amount paid to user in SOL
  @Column({ type: 'decimal', precision: 18, scale: 9 })
  amountPaid!: number;

  // Transaction signature
  @Column({ type: 'varchar', length: 88 })
  @Index()
  txSignature!: string;

  @CreateDateColumn()
  createdAt!: Date;
}

