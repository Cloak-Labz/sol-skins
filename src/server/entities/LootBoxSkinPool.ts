import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { LootBoxType } from './LootBoxType';
import { SkinTemplate } from './SkinTemplate';

@Entity('loot_box_skin_pools')
@Index(['lootBoxTypeId', 'skinTemplateId'], { unique: true })
export class LootBoxSkinPool {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  lootBoxTypeId: string;

  @Column('uuid')
  skinTemplateId: string;

  @Column({ default: 1 })
  weight: number;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => LootBoxType, lootBoxType => lootBoxType.skinPools, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'lootBoxTypeId' })
  lootBoxType: LootBoxType;

  @ManyToOne(() => SkinTemplate, skinTemplate => skinTemplate.lootBoxPools, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'skinTemplateId' })
  skinTemplate: SkinTemplate;
} 