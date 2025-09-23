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
  @Column({ length: 100, nullable: true })
  vrfRequestId?: string;

  @Column({ length: 66, nullable: true })
  randomnessSeed?: string;

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