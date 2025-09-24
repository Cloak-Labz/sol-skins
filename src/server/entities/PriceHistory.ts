import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { SkinTemplate } from './SkinTemplate';

export enum PriceSource {
  STEAM_MARKET = 'steam_market',
  CSGOFLOAT = 'csgofloat',
  DMARKET = 'dmarket',
}

@Entity('price_history')
@Index(['skinTemplateId', 'recordedAt'])
export class PriceHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  skinTemplateId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  priceUsd: number;

  @Column({
    type: 'varchar',
    enum: PriceSource,
  })
  source: PriceSource;

  @CreateDateColumn()
  recordedAt: Date;

  // Relations
  @ManyToOne(() => SkinTemplate, skinTemplate => skinTemplate.priceHistory, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'skinTemplateId' })
  skinTemplate: SkinTemplate;
} 