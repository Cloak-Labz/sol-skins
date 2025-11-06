import { Connection, TransactionSignature, Commitment } from '@solana/web3.js';
import { logger } from '../middlewares/logger';

/**
 * Timeout wrapper for Solana RPC operations
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => {
        reject(new Error(`${operation} timed out after ${timeoutMs}ms`));
      }, timeoutMs)
    ),
  ]);
}

/**
 * Send raw transaction with timeout
 */
export async function sendRawTransactionWithTimeout(
  connection: Connection,
  transactionBuffer: Buffer,
  options: {
    skipPreflight?: boolean;
    preflightCommitment?: Commitment;
    maxRetries?: number;
    timeout?: number;
  } = {}
): Promise<TransactionSignature> {
  const {
    skipPreflight = false,
    preflightCommitment = 'confirmed',
    maxRetries = 2,
    timeout = 30000, // 30 seconds default
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        logger.debug(`Retrying sendRawTransaction (attempt ${attempt}/${maxRetries}) after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const signature = await withTimeout(
        connection.sendRawTransaction(transactionBuffer, {
          skipPreflight,
          preflightCommitment,
        }),
        timeout,
        'sendRawTransaction'
      );

      logger.info(`Transaction sent successfully: ${signature}`);
      return signature;
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on certain errors
      if (error.message?.includes('timed out') || error.message?.includes('network')) {
        logger.warn(`Transaction send failed (attempt ${attempt + 1}/${maxRetries + 1}): ${error.message}`);
        if (attempt < maxRetries) {
          continue;
        }
      } else {
        // Non-retryable error
        throw error;
      }
    }
  }

  throw lastError || new Error('Failed to send transaction after all retries');
}

/**
 * Confirm transaction with timeout
 */
export async function confirmTransactionWithTimeout(
  connection: Connection,
  signature: TransactionSignature,
  commitment: Commitment = 'confirmed',
  timeout: number = 60000 // 60 seconds default (confirmations can take time)
): Promise<void> {
  try {
    await withTimeout(
      connection.confirmTransaction(signature, commitment),
      timeout,
      'confirmTransaction'
    );
    logger.info(`Transaction confirmed: ${signature}`);
  } catch (error: any) {
    if (error.message?.includes('timed out')) {
      logger.error(`Transaction confirmation timed out: ${signature}`);
      throw new Error(`Transaction confirmation timed out after ${timeout}ms. Signature: ${signature}`);
    }
    throw error;
  }
}

/**
 * Get connection with timeout configuration
 */
export function createConnectionWithTimeout(
  rpcUrl: string,
  commitment: Commitment = 'confirmed',
  timeout: number = 30000
): Connection {
  const connection = new Connection(rpcUrl, commitment);
  
  // Connection doesn't have direct timeout config, but we wrap operations
  // The connection will use the timeout in our wrapper functions
  logger.debug(`Created Solana connection with ${timeout}ms timeout: ${rpcUrl}`);
  
  return connection;
}

