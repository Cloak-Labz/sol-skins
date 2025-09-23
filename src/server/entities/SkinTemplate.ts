import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { LootBoxSkinPool } from './LootBoxSkinPool';
import { UserSkin } from './UserSkin';
import { PriceHistory } from './PriceHistory';
import { CaseOpening } from './CaseOpening';

export enum SkinRarity {
  COMMON = 'Common',
  UNCOMMON = 'Uncommon',
  RARE = 'Rare',
  EPIC = 'Epic',
  LEGENDARY = 'Legendary',
}

export enum SkinCondition {
  FACTORY_NEW = 'Factory New',
  MINIMAL_WEAR = 'Minimal Wear',
  FIELD_TESTED = 'Field-Tested',
  WELL_WORN = 'Well-Worn',
  BATTLE_SCARRED = 'Battle-Scarred',
}

@Entity('skin_templates')
@Index(['weapon', 'skinName', 'condition'], { unique: true })
export class SkinTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 })
  weapon: string;

  @Column({ length: 100 })
  skinName: string;

  @Column({
    type: 'enum',
    enum: SkinRarity,
  })
  rarity: SkinRarity;

  @Column({
    type: 'enum',
    enum: SkinCondition,
  })
  condition: SkinCondition;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  basePriceUsd: number;

  @Column({ length: 500, nullable: true })
  imageUrl?: string;

  @Column({ length: 500, nullable: true })
  exteriorImageUrl?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ length: 100, nullable: true })
  collection?: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => LootBoxSkinPool, pool => pool.skinTemplate)
  lootBoxPools: LootBoxSkinPool[];

  @OneToMany(() => UserSkin, userSkin => userSkin.skinTemplate)
  userSkins: UserSkin[];

  @OneToMany(() => PriceHistory, priceHistory => priceHistory.skinTemplate)
  priceHistory: PriceHistory[];

  @OneToMany(() => CaseOpening, caseOpening => caseOpening.skinTemplate)
  caseOpenings: CaseOpening[];
} 