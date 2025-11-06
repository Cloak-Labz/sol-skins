import { logger } from '../middlewares/logger';

/**
 * Query Timeout Utility
 * 
 * Prevents slow query attacks by enforcing timeouts on database operations.
 * All database queries should use this utility to ensure they don't hang indefinitely.
 * 
 * SECURITY: Database Query Timeout Protection
 * - Default timeout: 5 seconds (5000ms)
 * - Prevents DoS via slow queries
 * - Automatically cancels queries that exceed timeout
 * - Logs timeout violations for monitoring
 */

const DEFAULT_QUERY_TIMEOUT_MS = 5000; // 5 seconds
const MAX_QUERY_TIMEOUT_MS = 30000; // 30 seconds (for complex operations)

/**
 * Execute a database query with timeout protection
 * 
 * @param queryPromise - The database query promise
 * @param timeoutMs - Timeout in milliseconds (default: 5000ms)
 * @param operationName - Name of the operation for logging
 * @returns The query result
 * @throws Error if query times out
 */
export async function withQueryTimeout<T>(
  queryPromise: Promise<T>,
  timeoutMs: number = DEFAULT_QUERY_TIMEOUT_MS,
  operationName: string = 'database query'
): Promise<T> {
  // Validate timeout is within reasonable bounds
  if (timeoutMs > MAX_QUERY_TIMEOUT_MS) {
    logger.warn(`Query timeout ${timeoutMs}ms exceeds maximum ${MAX_QUERY_TIMEOUT_MS}ms, capping to maximum`);
    timeoutMs = MAX_QUERY_TIMEOUT_MS;
  }

  // Create a timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new QueryTimeoutError(
        `${operationName} exceeded timeout of ${timeoutMs}ms`,
        timeoutMs,
        operationName
      ));
    }, timeoutMs);
  });

  try {
    // Race between query and timeout
    const result = await Promise.race([queryPromise, timeoutPromise]);
    return result;
  } catch (error) {
    if (error instanceof QueryTimeoutError) {
      logger.error('Database query timeout:', {
        operation: operationName,
        timeoutMs,
        error: error.message,
      });
      
      // Log to audit (if available)
      try {
        const { AuditService } = require('../services/AuditService');
        const { AuditEventType, AuditSeverity } = require('../entities/AuditLog');
        const auditService = new AuditService();
        
        auditService.logSecurity(AuditEventType.SECURITY_SLOW_QUERY, {
          description: `Database query timeout: ${operationName}`,
          metadata: {
            operation: operationName,
            timeoutMs,
          },
          severity: AuditSeverity.MEDIUM,
        }).catch((auditError: any) => {
          logger.error('Failed to log query timeout audit event:', auditError);
        });
      } catch (auditError) {
        // Audit service not available, skip logging
      }
      
      throw error;
    }
    
    // Re-throw other errors
    throw error;
  }
}

/**
 * Custom error for query timeouts
 */
export class QueryTimeoutError extends Error {
  constructor(
    message: string,
    public readonly timeoutMs: number,
    public readonly operationName: string
  ) {
    super(message);
    this.name = 'QueryTimeoutError';
    Error.captureStackTrace(this, QueryTimeoutError);
  }
}

/**
 * Wrapper for TypeORM repository find operations with timeout
 */
export async function findWithTimeout<T>(
  findPromise: Promise<T>,
  timeoutMs: number = DEFAULT_QUERY_TIMEOUT_MS,
  operationName: string = 'find operation'
): Promise<T> {
  return withQueryTimeout(findPromise, timeoutMs, operationName);
}

/**
 * Wrapper for TypeORM query builder operations with timeout
 */
export async function queryBuilderWithTimeout<T>(
  queryPromise: Promise<T>,
  timeoutMs: number = DEFAULT_QUERY_TIMEOUT_MS,
  operationName: string = 'query builder operation'
): Promise<T> {
  return withQueryTimeout(queryPromise, timeoutMs, operationName);
}

/**
 * Wrapper for TypeORM save operations with timeout
 */
export async function saveWithTimeout<T>(
  savePromise: Promise<T>,
  timeoutMs: number = DEFAULT_QUERY_TIMEOUT_MS,
  operationName: string = 'save operation'
): Promise<T> {
  return withQueryTimeout(savePromise, timeoutMs, operationName);
}

/**
 * Wrapper for TypeORM delete operations with timeout
 */
export async function deleteWithTimeout(
  deletePromise: Promise<any>,
  timeoutMs: number = DEFAULT_QUERY_TIMEOUT_MS,
  operationName: string = 'delete operation'
): Promise<any> {
  return withQueryTimeout(deletePromise, timeoutMs, operationName);
}

/**
 * Wrapper for TypeORM update operations with timeout
 */
export async function updateWithTimeout(
  updatePromise: Promise<any>,
  timeoutMs: number = DEFAULT_QUERY_TIMEOUT_MS,
  operationName: string = 'update operation'
): Promise<any> {
  return withQueryTimeout(updatePromise, timeoutMs, operationName);
}

/**
 * Get timeout for different operation types
 */
export function getTimeoutForOperation(operationType: 'read' | 'write' | 'complex'): number {
  switch (operationType) {
    case 'read':
      return 5000; // 5 seconds for simple reads
    case 'write':
      return 10000; // 10 seconds for writes (inserts, updates)
    case 'complex':
      return 30000; // 30 seconds for complex queries (joins, aggregations)
    default:
      return DEFAULT_QUERY_TIMEOUT_MS;
  }
}

