import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { LootBoxSkinPool } from './LootBoxSkinPool';
import { UserSkin } from './UserSkin';
import { Transaction } from './Transaction';
import { CaseOpening } from './CaseOpening';

export enum LootBoxRarity {
  STANDARD = 'Standard',
  PREMIUM = 'Premium',
  SPECIAL = 'Special',
  LIMITED = 'Limited',
  LEGENDARY = 'Legendary',
}

@Entity('loot_box_types')
export class LootBoxType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'decimal', precision: 10, scale: 4 })
  priceSol: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  priceUsdc?: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  imageUrl?: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  isFeatured: boolean;

  @Column({
    type: 'enum',
    enum: LootBoxRarity,
  })
  rarity: LootBoxRarity;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Drop chances
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  chanceCommon: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  chanceUncommon: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  chanceRare: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  chanceEpic: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  chanceLegendary: number;

  // Relations
  @OneToMany(() => LootBoxSkinPool, pool => pool.lootBoxType)
  skinPools: LootBoxSkinPool[];

  @OneToMany(() => UserSkin, userSkin => userSkin.lootBoxType)
  userSkins: UserSkin[];

  @OneToMany(() => Transaction, transaction => transaction.lootBoxType)
  transactions: Transaction[];

  @OneToMany(() => CaseOpening, caseOpening => caseOpening.lootBoxType)
  caseOpenings: CaseOpening[];
} 