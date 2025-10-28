import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Box } from './Box';
import { SkinTemplate } from './SkinTemplate';

/**
 * BoxSkin - Stores skin metadata for each box
 * Links skins to specific boxes with rarity and odds
 */
@Entity('box_skins')
export class BoxSkin {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Reference to the box
  @Column({ type: 'uuid' })
  @Index()
  boxId!: string;

  @ManyToOne(() => Box, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'boxId' })
  box!: Box;

  // Skin metadata
  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 100 })
  weapon!: string;

  @Column({ type: 'varchar', length: 100 })
  rarity!: string;

  @Column({ type: 'varchar', length: 100 })
  condition!: string;

  @Column({ type: 'text', nullable: true })
  imageUrl?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  basePriceUsd!: number;

  // Metadata URI for this skin
  @Column({ type: 'text', nullable: true })
  metadataUri?: string;

  // Rarity weight/odds (higher = more likely)
  @Column({ type: 'integer', default: 1 })
  weight!: number;

  // Skin template ID for reference
  @Column({ type: 'uuid', nullable: true })
  @Index()
  skinTemplateId?: string;

  @ManyToOne(() => SkinTemplate, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'skinTemplateId' })
  skinTemplate?: SkinTemplate;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
