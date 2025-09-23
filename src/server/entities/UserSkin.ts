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

  @Column('uuid')
  userId: string;

  @Column('uuid', { nullable: true })
  skinTemplateId?: string;

  @Column({ unique: true, length: 44 })
  nftMintAddress: string;

  // Opening data
  @Column('uuid', { nullable: true })
  lootBoxTypeId?: string;

  @Column({ type: 'timestamp' })
  openedAt: Date;

  // Status
  @Column({ default: true })
  isInInventory: boolean;

  @Column({ default: false })
  soldViaBuyback: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  buybackAmount?: number;

  @Column({ type: 'timestamp', nullable: true })
  buybackAt?: Date;

  // NFT data
  @Column({ length: 500, nullable: true })
  metadataUri?: string;

  @Column({ length: 200, nullable: true })
  name?: string;

  @Column({ length: 10, nullable: true })
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