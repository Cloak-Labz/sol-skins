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

  // VRF process (on-chain - deprecated)
  @Column({ type: 'varchar', length: 100, nullable: true })
  vrfRequestId?: string;

  @Column({ type: 'varchar', length: 66, nullable: true })
  randomnessSeed?: string;

  // Off-chain randomization
  @Column({ type: 'varchar', length: 200, nullable: true })
  randomSeed?: string; // Public seed for provably fair randomization

  @Column({ type: 'decimal', precision: 20, scale: 18, nullable: true })
  randomValue?: number; // 0-1 random value generated

  @Column({ type: 'varchar', length: 64, nullable: true })
  randomHash?: string; // SHA-256 hash for verification

  @Column({ type: 'varchar', length: 20, default: 'revealing' })
  status?: string; // 'revealing', 'decided', 'completed'

  // Result
  @Column('uuid', { nullable: true })
  skinTemplateId?: string;

  @Column('uuid', { nullable: true })
  userSkinId?: string;

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