import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from './User';
import { UserSkin } from './UserSkin';

@Entity('skin_listings')
export class SkinListing {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column('uuid', { name: 'user_skin_id' })
  userSkinId!: string;

  @ManyToOne(() => UserSkin)
  @JoinColumn({ name: 'user_skin_id' })
  userSkin!: UserSkin;

  @Column('decimal', { precision: 10, scale: 2, name: 'price_usd' })
  priceUsd!: string;

  @Column('decimal', { precision: 10, scale: 6, name: 'price_sol', nullable: true })
  priceSol!: string;

  @Column('varchar', { default: 'active' })
  status!: 'active' | 'sold' | 'cancelled';

  @Column('uuid', { name: 'sold_to_user_id', nullable: true })
  soldToUserId?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'sold_to_user_id' })
  soldToUser?: User;

  @Column({ name: 'sold_at', type: 'timestamp', nullable: true })
  soldAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

