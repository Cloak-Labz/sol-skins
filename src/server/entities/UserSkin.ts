import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from './User';
import { SkinTemplate } from './SkinTemplate';
import { LootBoxType } from './LootBoxType';
import { Transaction } from './Transaction';
import { CaseOpening } from './CaseOpening';

@Entity('user_skins')
export class UserSkin {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { nullable: true })
  userId?: string;

  @Column('uuid', { nullable: true })
  skinTemplateId?: string;

  @Column({ type: 'varchar', unique: true, length: 44 })
  nftMintAddress: string;

  // Alias for compatibility with buyback service
  get nftMint(): string {
    return this.nftMintAddress;
  }

  // Opening data
  @Column('uuid', { nullable: true })
  lootBoxTypeId?: string;

  @Column({ type: 'timestamp', nullable: true })
  openedAt?: Date;

  // Status
  @Column({ type: 'boolean', default: true })
  isInInventory: boolean;

  @Column({ type: 'boolean', default: false })
  soldViaBuyback: boolean;

  @Column({ type: 'boolean', default: false })
  isWaitingTransfer: boolean;

  // Alias for compatibility with buyback service
  get isBurnedBack(): boolean {
    return this.soldViaBuyback;
  }

  set isBurnedBack(value: boolean) {
    this.soldViaBuyback = value;
  }

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  buybackAmount?: number;

  @Column({ type: 'timestamp', nullable: true })
  buybackAt?: Date;

  @Column({ type: 'varchar', length: 88, nullable: true })
  buybackTxSignature?: string;

  // NFT data
  @Column({ type: 'varchar', length: 500, nullable: true })
  metadataUri?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  imageUrl?: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  name?: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  symbol?: string;

  // Tracking
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  currentPriceUsd?: number;

  @Column({ type: 'timestamp', nullable: true })
  lastPriceUpdate?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, user => user.skins, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => SkinTemplate, skinTemplate => skinTemplate.userSkins)
  @JoinColumn({ name: 'skinTemplateId' })
  skinTemplate?: SkinTemplate;

  @ManyToOne(() => LootBoxType, lootBoxType => lootBoxType.userSkins)
  @JoinColumn({ name: 'lootBoxTypeId' })
  lootBoxType?: LootBoxType;

  @OneToMany(() => Transaction, transaction => transaction.userSkin)
  transactions: Transaction[];

  @OneToMany(() => CaseOpening, caseOpening => caseOpening.userSkin)
  caseOpenings: CaseOpening[];
} 