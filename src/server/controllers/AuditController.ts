import { Request, Response } from 'express';
import { AuditService } from '../services/AuditService';
import { ResponseUtil } from '../utils/response';
import { catchAsync } from '../middlewares/errorHandler';
import { AuditEventType, AuditSeverity } from '../entities/AuditLog';

export class AuditController {
  private auditService: AuditService;

  constructor() {
    this.auditService = new AuditService();
  }

  /**
   * GET /admin/audit-logs
   * Get audit logs with filters (admin only)
   */
  getAuditLogs = catchAsync(async (req: Request, res: Response) => {
    const {
      userId,
      walletAddress,
      eventType,
      severity,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = req.query;

    const filters = {
      userId: userId as string | undefined,
      walletAddress: walletAddress as string | undefined,
      eventType: eventType as AuditEventType | undefined,
      severity: severity as AuditSeverity | undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: parseInt(limit as string),
      offset: (parseInt(page as string) - 1) * parseInt(limit as string),
    };

    const result = await this.auditService.getLogs(filters);

    ResponseUtil.success(res, result.logs, 200, {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total: result.total,
      totalPages: Math.ceil(result.total / parseInt(limit as string)),
    });
  });

  /**
   * GET /admin/audit-stats
   * Get audit log statistics (admin only)
   */
  getAuditStats = catchAsync(async (req: Request, res: Response) => {
    const { startDate, endDate, eventType } = req.query;

    const filters = {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      eventType: eventType as AuditEventType | undefined,
    };

    const stats = await this.auditService.getStatistics(filters);

    ResponseUtil.success(res, stats);
  });
}

