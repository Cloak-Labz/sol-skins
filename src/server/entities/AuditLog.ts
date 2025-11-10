import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum AuditEventType {
  // Authentication
  AUTH_LOGIN = 'auth_login',
  AUTH_LOGIN_FAILED = 'auth_login_failed',
  AUTH_LOGOUT = 'auth_logout',
  AUTH_TOKEN_REFRESH = 'auth_token_refresh',
  
  // Financial Transactions
  FINANCIAL_BUYBACK = 'financial_buyback',
  FINANCIAL_PACK_OPENING = 'financial_pack_opening',
  FINANCIAL_PAYOUT = 'financial_payout',
  FINANCIAL_CLAIM = 'financial_claim',
  
  // Admin Operations
  ADMIN_USER_CREATE = 'admin_user_create',
  ADMIN_USER_UPDATE = 'admin_user_update',
  ADMIN_USER_DELETE = 'admin_user_delete',
  ADMIN_USER_DEACTIVATE = 'admin_user_deactivate',
  ADMIN_BOX_CREATE = 'admin_box_create',
  ADMIN_BOX_UPDATE = 'admin_box_update',
  ADMIN_BOX_DELETE = 'admin_box_delete',
  ADMIN_SKIN_CREATE = 'admin_skin_create',
  ADMIN_SKIN_UPDATE = 'admin_skin_update',
  ADMIN_SKIN_DELETE = 'admin_skin_delete',
  ADMIN_INVENTORY_ADD = 'admin_inventory_add',
  ADMIN_INVENTORY_UPDATE = 'admin_inventory_update',
  
  // Security Events
  SECURITY_CSRF_FAILED = 'security_csrf_failed',
  SECURITY_RATE_LIMIT_EXCEEDED = 'security_rate_limit_exceeded',
  SECURITY_INVALID_SIGNATURE = 'security_invalid_signature',
  SECURITY_UNAUTHORIZED_ACCESS = 'security_unauthorized_access',
  SECURITY_ADMIN_ACCESS = 'security_admin_access',
  SECURITY_NONCE_MISSING = 'security_nonce_missing',
  SECURITY_REPLAY_ATTEMPT = 'security_replay_attempt',
  SECURITY_ACCOUNT_LOCKED = 'security_account_locked',
  SECURITY_SLOW_QUERY = 'security_slow_query',
  
  // Data Operations
  DATA_IMPORT = 'data_import',
  DATA_EXPORT = 'data_export',
  DATA_DELETE = 'data_delete',
}

export enum AuditSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

@Entity('audit_logs')
@Index(['eventType'])
@Index(['severity'])
@Index(['createdAt'])
@Index(['ipAddress'])
@Index(['walletAddress'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // User information
  @Column('uuid', { nullable: true })
  userId?: string;

  @Column({ type: 'varchar', length: 44, nullable: true })
  walletAddress?: string;

  // Event information
  @Column({
    type: 'enum',
    enum: AuditEventType,
  })
  eventType: AuditEventType;

  @Column({
    type: 'enum',
    enum: AuditSeverity,
    default: AuditSeverity.MEDIUM,
  })
  severity: AuditSeverity;

  // Request information
  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress?: string;

  @Column({ type: 'text', nullable: true })
  userAgent?: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  httpMethod?: string;

  @Column({ type: 'text', nullable: true })
  requestPath?: string;

  // Event details
  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  // Success/failure
  @Column({ type: 'boolean', default: true })
  success: boolean;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  // Blockchain transaction info (if applicable)
  @Column({ type: 'varchar', length: 88, nullable: true })
  txHash?: string;

  @Column({ type: 'varchar', length: 88, nullable: true })
  nftMint?: string;

  // Financial amounts (if applicable)
  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
  amountSol?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  amountUsd?: number;

  @CreateDateColumn()
  createdAt: Date;
}

