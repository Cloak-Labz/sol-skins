import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * RequestNonce entity for preventing replay attacks
 * Stores nonces used in requests to ensure each request can only be used once
 */
@Entity('request_nonces')
@Index(['nonce'], { unique: true })
@Index(['createdAt'])
@Index(['ipAddress'])
export class RequestNonce {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  nonce: string;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  walletAddress: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  endpoint: string;

  @Column({ type: 'bigint', nullable: true })
  timestamp: number;

  @CreateDateColumn()
  createdAt: Date;
}

