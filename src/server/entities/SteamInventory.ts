import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './User';

@Entity('steam_inventories')
@Index(['userId', 'steamId64'])
export class SteamInventory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', length: 100 })
  steamId64: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  steamUserId?: string;

  @Column({ type: 'varchar', length: 200 })
  marketHashName: string;

  @Column({ type: 'varchar', length: 200 })
  marketName: string;

  @Column({ type: 'varchar', length: 200 })
  type: string;

  @Column({ type: 'boolean', default: false })
  marketable: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  exterior?: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  itemSet?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  quality?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  rarity?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  weapon?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  lowestPrice?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  medianPrice?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  volume?: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  currency?: string;

  @CreateDateColumn()
  importedAt: Date;
}

