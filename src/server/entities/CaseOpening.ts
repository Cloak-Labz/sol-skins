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
import { SkinTemplate } from './SkinTemplate';
import { UserSkin } from './UserSkin';

export enum UserDecision {
  KEEP = 'keep',
  BUYBACK = 'buyback',
}

@Entity('case_openings')
export class CaseOpening {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column('uuid')
  lootBoxTypeId: string;

  // VRF process
  @Column({ type: 'varchar', length: 100, nullable: true })
  vrfRequestId?: string;

  @Column({ type: 'varchar', length: 66, nullable: true })
  randomnessSeed?: string;

  // Result
  @Column('uuid', { nullable: true })
  skinTemplateId?: string;

  @Column('uuid', { nullable: true })
  userSkinId?: string;

  // Pack opening specific fields
  @Column({ type: 'varchar', length: 100, nullable: true })
  nftMintAddress?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  transactionId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  skinName?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  skinRarity?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  skinWeapon?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  skinValue?: number;

  @Column({ type: 'text', nullable: true })
  skinImage?: string;

  @Column({ type: 'boolean', default: false })
  isPackOpening: boolean;

  // Box price for pack openings
  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
  boxPriceSol?: number;

  // User decision
  @Column({
    type: 'enum',
    enum: UserDecision,
    nullable: true,
  })
  userDecision?: UserDecision;

  @Column({ type: 'timestamp', nullable: true })
  decisionAt?: Date;

  // Tracking
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  openedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, user => user.caseOpenings, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => LootBoxType, lootBoxType => lootBoxType.caseOpenings)
  @JoinColumn({ name: 'lootBoxTypeId' })
  lootBoxType: LootBoxType;

  @ManyToOne(() => SkinTemplate, skinTemplate => skinTemplate.caseOpenings)
  @JoinColumn({ name: 'skinTemplateId' })
  skinTemplate?: SkinTemplate;

  @ManyToOne(() => UserSkin, userSkin => userSkin.caseOpenings)
  @JoinColumn({ name: 'userSkinId' })
  userSkin?: UserSkin;
} 