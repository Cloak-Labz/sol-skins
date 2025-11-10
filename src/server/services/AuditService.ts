import { AppDataSource } from '../config/database';
import { AuditLog, AuditEventType, AuditSeverity } from '../entities/AuditLog';
import { logger } from '../middlewares/logger';

interface AuditLogData {
  userId?: string;
  walletAddress?: string;
  eventType: AuditEventType;
  severity?: AuditSeverity;
  ipAddress?: string;
  userAgent?: string;
  httpMethod?: string;
  requestPath?: string;
  description?: string;
  metadata?: Record<string, any>;
  success?: boolean;
  errorMessage?: string;
  txHash?: string;
  nftMint?: string;
  amountSol?: number;
  amountUsd?: number;
}

export class AuditService {
  private auditLogRepository = AppDataSource.getRepository(AuditLog);

  /**
   * Log an audit event
   */
  async log(data: AuditLogData): Promise<AuditLog> {
    try {
      const auditLog = this.auditLogRepository.create({
        userId: data.userId,
        walletAddress: data.walletAddress,
        eventType: data.eventType,
        severity: data.severity || AuditSeverity.MEDIUM,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        httpMethod: data.httpMethod,
        requestPath: data.requestPath,
        description: data.description,
        metadata: data.metadata,
        success: data.success !== false,
        errorMessage: data.errorMessage,
        txHash: data.txHash,
        nftMint: data.nftMint,
        amountSol: data.amountSol,
        amountUsd: data.amountUsd,
      });

      const saved = await this.auditLogRepository.save(auditLog);

      // Log critical/high severity events to console as well
      if (saved.severity === AuditSeverity.CRITICAL || saved.severity === AuditSeverity.HIGH) {
        logger.warn('High severity audit event', {
          eventType: saved.eventType,
          severity: saved.severity,
          walletAddress: saved.walletAddress,
          userId: saved.userId,
          ipAddress: saved.ipAddress,
        });
      }

      return saved;
    } catch (error) {
      // Don't fail the request if audit logging fails
      logger.error('Failed to create audit log', {
        error: error instanceof Error ? error.message : String(error),
        eventType: data.eventType,
      });
      throw error;
    }
  }

  /**
   * Log authentication events
   */
  async logAuth(
    eventType: AuditEventType.AUTH_LOGIN | AuditEventType.AUTH_LOGIN_FAILED | AuditEventType.AUTH_LOGOUT,
    data: {
      userId?: string;
      walletAddress?: string;
      ipAddress?: string;
      userAgent?: string;
      success?: boolean;
      errorMessage?: string;
    }
  ): Promise<AuditLog> {
    return this.log({
      ...data,
      eventType,
      severity: eventType === AuditEventType.AUTH_LOGIN_FAILED ? AuditSeverity.MEDIUM : AuditSeverity.LOW,
      description: `Authentication event: ${eventType}`,
    });
  }

  /**
   * Log financial transactions
   */
  async logFinancial(
    eventType: AuditEventType.FINANCIAL_BUYBACK | AuditEventType.FINANCIAL_PACK_OPENING | AuditEventType.FINANCIAL_PAYOUT | AuditEventType.FINANCIAL_CLAIM,
    data: {
      userId?: string;
      walletAddress?: string;
      ipAddress?: string;
      userAgent?: string;
      txHash?: string;
      nftMint?: string;
      amountSol?: number;
      amountUsd?: number;
      success?: boolean;
      errorMessage?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<AuditLog> {
    return this.log({
      ...data,
      eventType,
      severity: AuditSeverity.HIGH,
      description: `Financial transaction: ${eventType}`,
    });
  }

  /**
   * Log admin operations
   */
  async logAdmin(
    eventType: AuditEventType,
    data: {
      userId?: string;
      walletAddress?: string;
      ipAddress?: string;
      userAgent?: string;
      requestPath?: string;
      httpMethod?: string;
      description?: string;
      metadata?: Record<string, any>;
      success?: boolean;
      errorMessage?: string;
    }
  ): Promise<AuditLog> {
    return this.log({
      ...data,
      eventType,
      severity: AuditSeverity.CRITICAL,
      description: data.description || `Admin operation: ${eventType}`,
    });
  }

  /**
   * Log security events
   */
  async logSecurity(
    eventType: AuditEventType.SECURITY_CSRF_FAILED | AuditEventType.SECURITY_RATE_LIMIT_EXCEEDED | AuditEventType.SECURITY_INVALID_SIGNATURE | AuditEventType.SECURITY_UNAUTHORIZED_ACCESS | AuditEventType.SECURITY_ADMIN_ACCESS | AuditEventType.SECURITY_NONCE_MISSING | AuditEventType.SECURITY_REPLAY_ATTEMPT | AuditEventType.SECURITY_ACCOUNT_LOCKED,
    data: {
      userId?: string;
      walletAddress?: string;
      ipAddress?: string;
      userAgent?: string;
      requestPath?: string;
      httpMethod?: string;
      description?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<AuditLog> {
    return this.log({
      ...data,
      eventType,
      severity: AuditSeverity.HIGH,
      description: data.description || `Security event: ${eventType}`,
      success: false, // Security events are usually failures
    });
  }

  /**
   * Query audit logs
   */
  async getLogs(filters: {
    userId?: string;
    walletAddress?: string;
    eventType?: AuditEventType;
    severity?: AuditSeverity;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: AuditLog[]; total: number }> {
    const queryBuilder = this.auditLogRepository.createQueryBuilder('audit');

    if (filters.userId) {
      queryBuilder.andWhere('audit.userId = :userId', { userId: filters.userId });
    }

    if (filters.walletAddress) {
      queryBuilder.andWhere('audit.walletAddress = :walletAddress', { walletAddress: filters.walletAddress });
    }

    if (filters.eventType) {
      queryBuilder.andWhere('audit.eventType = :eventType', { eventType: filters.eventType });
    }

    if (filters.severity) {
      queryBuilder.andWhere('audit.severity = :severity', { severity: filters.severity });
    }

    if (filters.startDate) {
      queryBuilder.andWhere('audit.createdAt >= :startDate', { startDate: filters.startDate });
    }

    if (filters.endDate) {
      queryBuilder.andWhere('audit.createdAt <= :endDate', { endDate: filters.endDate });
    }

    queryBuilder.orderBy('audit.createdAt', 'DESC');

    const total = await queryBuilder.getCount();

    if (filters.limit) {
      queryBuilder.limit(filters.limit);
    }

    if (filters.offset) {
      queryBuilder.offset(filters.offset);
    }

    const logs = await queryBuilder.getMany();

    return { logs, total };
  }

  /**
   * Get audit statistics
   */
  async getStatistics(filters: {
    startDate?: Date;
    endDate?: Date;
    eventType?: AuditEventType;
  }): Promise<{
    totalEvents: number;
    byEventType: Record<string, number>;
    bySeverity: Record<string, number>;
    successRate: number;
    failedEvents: number;
  }> {
    const queryBuilder = this.auditLogRepository.createQueryBuilder('audit');

    if (filters.startDate) {
      queryBuilder.andWhere('audit.createdAt >= :startDate', { startDate: filters.startDate });
    }

    if (filters.endDate) {
      queryBuilder.andWhere('audit.createdAt <= :endDate', { endDate: filters.endDate });
    }

    if (filters.eventType) {
      queryBuilder.andWhere('audit.eventType = :eventType', { eventType: filters.eventType });
    }

    const allLogs = await queryBuilder.getMany();

    const totalEvents = allLogs.length;
    const failedEvents = allLogs.filter(log => !log.success).length;
    const successRate = totalEvents > 0 ? ((totalEvents - failedEvents) / totalEvents) * 100 : 0;

    const byEventType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    allLogs.forEach(log => {
      byEventType[log.eventType] = (byEventType[log.eventType] || 0) + 1;
      bySeverity[log.severity] = (bySeverity[log.severity] || 0) + 1;
    });

    return {
      totalEvents,
      byEventType,
      bySeverity,
      successRate,
      failedEvents,
    };
  }
}

