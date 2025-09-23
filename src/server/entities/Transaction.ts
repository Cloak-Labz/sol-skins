import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './User';
import { LootBoxType } from './LootBoxType';
import { UserSkin } from './UserSkin';

export enum TransactionType {
  OPEN_CASE = 'open_case',
  BUYBACK = 'buyback',
  PAYOUT = 'payout',
}

export enum TransactionStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  transactionType: TransactionType;

  // Values
  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
  amountSol?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  amountUsdc?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amountUsd: number;

  // References
  @Column('uuid', { nullable: true })
  lootBoxTypeId?: string;

  @Column('uuid', { nullable: true })
  userSkinId?: string;

  // Blockchain
  @Column({ unique: true, length: 88, nullable: true })
  txHash?: string;

  @Column({ type: 'bigint', nullable: true })
  blockSlot?: number;

  @Column({ type: 'timestamp', nullable: true })
  confirmedAt?: Date;

  // Status
  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, user => user.transactions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => LootBoxType, lootBoxType => lootBoxType.transactions)
  @JoinColumn({ name: 'lootBoxTypeId' })
  lootBoxType?: LootBoxType;

  @ManyToOne(() => UserSkin, userSkin => userSkin.transactions)
  @JoinColumn({ name: 'userSkinId' })
  userSkin?: UserSkin;
} 