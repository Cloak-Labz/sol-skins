import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserSkin } from './UserSkin';
import { Transaction } from './Transaction';
import { CaseOpening } from './CaseOpening';
import { UserSession } from './UserSession';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true, length: 44 })
  walletAddress: string;

  @Column({ type: 'varchar', nullable: true, length: 50 })
  username?: string;

  @Column({ type: 'varchar', nullable: true })
  email?: string;

  @Column({ type: 'varchar', nullable: true })
  tradeUrl?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true, type: 'timestamp' })
  lastLogin?: Date;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalSpent: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalEarned: number;

  @Column({ type: 'int', default: 0 })
  casesOpened: number;

  // Relations
  @OneToMany(() => UserSkin, userSkin => userSkin.user)
  skins: UserSkin[];

  @OneToMany(() => Transaction, transaction => transaction.user)
  transactions: Transaction[];

  @OneToMany(() => CaseOpening, caseOpening => caseOpening.user)
  caseOpenings: CaseOpening[];

  @OneToMany(() => UserSession, session => session.user)
  sessions: UserSession[];
} 