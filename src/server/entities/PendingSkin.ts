import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('pending_skins')
export class PendingSkin {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  userId: string;

  @Column({ type: 'varchar' })
  skinName: string;

  @Column({ type: 'varchar' })
  skinRarity: string;

  @Column({ type: 'varchar' })
  skinWeapon: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  skinValue: number;

  @Column({ type: 'varchar' })
  skinImage: string;

  @Column({ type: 'varchar', nullable: true })
  nftMintAddress: string;

  @Column({ type: 'varchar', nullable: true })
  transactionHash: string;

  @Column({ type: 'varchar', nullable: true })
  caseOpeningId: string;

  @Column({ type: 'varchar', default: 'pending' })
  status: 'pending' | 'claimed' | 'expired';

  @Column({ type: 'timestamp', nullable: true })
  claimedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
