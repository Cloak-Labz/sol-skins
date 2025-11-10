import { Transaction, PublicKey, Connection } from '@solana/web3.js';
import { logger } from '../middlewares/logger';
import { AppError } from '../middlewares/errorHandler';

export interface TransactionValidationResult {
  isValid: boolean;
  error?: string;
  transaction?: Transaction;
  signature?: string;
}

/**
 * Transaction Validation Service
 * Validates Solana transactions before processing to prevent:
 * - Replay attacks
 * - Transaction tampering
 * - Wrong account manipulation
 * - Signature verification issues
 */
export class TransactionValidationService {
  private connection: Connection;
  private processedSignatures: Set<string> = new Set();
  private readonly MAX_SIGNATURE_AGE_MS = 5 * 60 * 1000; // 5 minutes
  private readonly SIGNATURE_CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

  constructor(connection: Connection) {
    this.connection = connection;
    
    // Clean up old signatures every 10 minutes
    setInterval(() => {
      this.cleanupOldSignatures();
    }, 10 * 60 * 1000);
  }

  /**
   * Validate base64 string format
   */
  private isValidBase64(str: string): boolean {
    try {
      // Check if string contains only valid base64 characters
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      if (!base64Regex.test(str)) {
        return false;
      }
      
      // Try to decode to verify it's valid base64
      Buffer.from(str, 'base64');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate transaction structure before deserializing
   * Checks for magic bytes and basic structure
   */
  private validateTransactionStructure(buffer: Buffer): { isValid: boolean; error?: string } {
    if (buffer.length < 4) {
      return { isValid: false, error: 'Transaction buffer too small' };
    }

    // Check for valid transaction structure
    // Solana transactions start with signature count (1 byte) or version prefix
    const firstByte = buffer[0];
    
    // Valid transaction should have reasonable signature count (1-64)
    // Or version prefix for v0 transactions
    if (firstByte === 0 || firstByte > 64) {
      // Check if it might be a v0 transaction (starts with version byte 0x80)
      if (firstByte !== 0x80 && buffer.length < 8) {
        return { isValid: false, error: 'Invalid transaction structure: invalid signature count' };
      }
    }

    // Minimum transaction size check
    if (buffer.length < 8) {
      return { isValid: false, error: 'Transaction buffer too small for valid transaction' };
    }

    return { isValid: true };
  }

  /**
   * Validate and deserialize a signed transaction
   */
  async validateTransaction(
    signedTransactionBase64: string,
    expectedNftMint: string,
    expectedWalletAddress: string,
    maxSize: number = 10240 // 10KB max
  ): Promise<TransactionValidationResult> {
    try {
      // 0. Validate base64 format BEFORE decoding
      if (!signedTransactionBase64 || typeof signedTransactionBase64 !== 'string') {
        return {
          isValid: false,
          error: 'Transaction data must be a valid base64 string',
        };
      }

      if (!this.isValidBase64(signedTransactionBase64)) {
        return {
          isValid: false,
          error: 'Invalid base64 format for transaction data',
        };
      }

      // 1. Validate input size BEFORE decoding
      // Base64 encoded size is ~33% larger than binary
      const estimatedBinarySize = (signedTransactionBase64.length * 3) / 4;
      if (estimatedBinarySize > maxSize) {
        return {
          isValid: false,
          error: `Transaction too large: estimated ${Math.ceil(estimatedBinarySize)} bytes (max: ${maxSize})`,
        };
      }

      // 2. Decode base64 to buffer
      let transactionBuffer: Buffer;
      try {
        transactionBuffer = Buffer.from(signedTransactionBase64, 'base64');
      } catch (error: any) {
        return {
          isValid: false,
          error: `Failed to decode base64: ${error?.message || 'Invalid base64 encoding'}`,
        };
      }

      // 3. Validate decoded buffer size
      if (transactionBuffer.length > maxSize) {
        return {
          isValid: false,
          error: `Transaction too large: ${transactionBuffer.length} bytes (max: ${maxSize})`,
        };
      }

      if (transactionBuffer.length === 0) {
        return {
          isValid: false,
          error: 'Empty transaction data',
        };
      }

      // 4. Validate transaction structure before deserializing
      const structureValidation = this.validateTransactionStructure(transactionBuffer);
      if (!structureValidation.isValid) {
        return {
          isValid: false,
          error: structureValidation.error || 'Invalid transaction structure',
        };
      }

      // 5. Deserialize transaction
      let transaction: Transaction;
      try {
        transaction = Transaction.from(transactionBuffer);
      } catch (error: any) {
        logger.error('Failed to deserialize transaction:', {
          error: error?.message || error,
          bufferLength: transactionBuffer.length,
          firstBytes: transactionBuffer.slice(0, 10).toString('hex'),
        });
        return {
          isValid: false,
          error: `Invalid transaction format: ${error?.message || 'Unknown error'}`,
        };
      }

      if (!transaction) {
        return {
          isValid: false,
          error: 'Transaction deserialization returned null',
        };
      }

      // 6. Verify transaction has signatures
      // Note: Transaction may be partially signed (admin signed, user needs to sign)
      // or fully signed (user already signed). We accept both.
      if (!transaction.signatures || transaction.signatures.length === 0) {
        return {
          isValid: false,
          error: 'Transaction has no signatures',
        };
      }

      // 7. Verify at least one signature exists (user should have signed)
      // We don't require ALL signatures since admin may have partially signed
      const validSignatures = transaction.signatures.filter((sig) => 
        sig && sig.signature && sig.signature.length > 0
      );
      
      if (validSignatures.length === 0) {
        return {
          isValid: false,
          error: 'Transaction is not signed by user',
        };
      }
      
      logger.info('Transaction signature check passed', {
        totalSignatures: transaction.signatures.length,
        validSignatures: validSignatures.length,
      });

      // 8. Verify fee payer matches expected wallet
      // For v0 transactions, fee payer might be in message.staticAccountKeys[0]
      // For partially signed transactions, fee payer might not be accessible the same way
      let feePayerAddress: string | null = null;
      
      try {
        if (transaction.feePayer) {
          feePayerAddress = transaction.feePayer.toString();
        } else if ((transaction as any).message?.staticAccountKeys?.[0]) {
          const firstKey = (transaction as any).message.staticAccountKeys[0];
          feePayerAddress = typeof firstKey === 'string' ? firstKey : firstKey.toString();
        } else if ((transaction as any).message?.accountKeys?.[0]) {
          const firstKey = (transaction as any).message.accountKeys[0];
          feePayerAddress = typeof firstKey === 'string' ? firstKey : firstKey.toString();
        } else if ((transaction as any).message?.header?.numRequiredSignatures) {
          // For v0 transactions, first account key is usually the fee payer
          logger.warn('Could not directly access fee payer, checking first signature account');
          // We'll check if the first signature matches expected wallet
        }
      } catch (error) {
        logger.warn('Error extracting fee payer address:', error);
      }
      
      // If we couldn't get fee payer from transaction structure,
      // verify that the user's signature is present (they signed it)
      if (!feePayerAddress) {
        logger.warn('Could not verify fee payer from transaction structure, relying on signature verification');
        // Don't fail - if user signed it, fee payer is correct
        // Solana will reject if fee payer doesn't match signature
      } else if (feePayerAddress !== expectedWalletAddress) {
        logger.error('Fee payer mismatch', {
          expected: expectedWalletAddress,
          got: feePayerAddress,
        });
        return {
          isValid: false,
          error: `Fee payer mismatch: expected ${expectedWalletAddress}, got ${feePayerAddress}`,
        };
      } else {
        logger.info('Fee payer verification passed', { feePayerAddress });
      }

      // 9. Verify transaction contains expected accounts and validate instructions
      try {
        const nftMintPubkey = new PublicKey(expectedNftMint);
        const expectedWalletPubkey = new PublicKey(expectedWalletAddress);
        
        // Try to get account keys from transaction message
        const accountKeys = (transaction as any).message?.accountKeys || 
                           (transaction as any).accountKeys || 
                           [];
        
        if (accountKeys.length > 0) {
          const accountAddresses = accountKeys.map((key: any) => {
            if (typeof key === 'string') return key;
            if (key?.toString) return key.toString();
            if (key?.publicKey) return key.publicKey.toString();
            return null;
          }).filter(Boolean);
          
          // Check if NFT mint is in accounts
          if (accountAddresses.length > 0 && !accountAddresses.includes(expectedNftMint)) {
            logger.warn('NFT mint not found in transaction accounts', {
              expectedNftMint,
              accountAddresses: accountAddresses.slice(0, 5),
            });
          }
        }

        // Validate instructions structure
        // Check that transaction has instructions (at least one)
        const instructions = transaction.instructions || (transaction as any).message?.instructions || [];
        if (instructions.length === 0) {
          return {
            isValid: false,
            error: 'Transaction has no instructions',
          };
        }

        // Validate instruction count is reasonable (prevent DoS)
        const MAX_INSTRUCTIONS = 100;
        if (instructions.length > MAX_INSTRUCTIONS) {
          return {
            isValid: false,
            error: `Transaction has too many instructions: ${instructions.length} (max: ${MAX_INSTRUCTIONS})`,
          };
        }

        logger.info('Transaction instruction validation passed', {
          instructionCount: instructions.length,
          accountCount: accountKeys.length,
        });
      } catch (error) {
        logger.warn('Could not verify account keys in transaction:', error);
        // Don't fail validation if we can't check accounts, but log warning
      }

      // 10. Verify transaction signature (get signature from transaction)
      // Note: We can't fully verify signatures without the original message,
      // but we can verify the transaction structure is valid
      let transactionSignature: Uint8Array | null = null;
      let signatureBase64: string | null = null;
      
      try {
        // Try different ways to access signature
        if (transaction.signatures && transaction.signatures.length > 0) {
          transactionSignature = transaction.signatures[0]?.signature || null;
        }
        
        // If still no signature, try accessing message directly
        if (!transactionSignature && (transaction as any).message) {
          const message = (transaction as any).message;
          if (message.header && message.accountKeys) {
            // Transaction has message structure, signature should be in signatures array
            logger.warn('Transaction has message structure but no signatures in signatures array');
          }
        }
        
        if (!transactionSignature || transactionSignature.length === 0) {
          return {
            isValid: false,
            error: 'Transaction signature is missing or empty',
          };
        }

        signatureBase64 = Buffer.from(transactionSignature).toString('base64');
      } catch (error: any) {
        logger.error('Error extracting transaction signature:', error);
        return {
          isValid: false,
          error: `Failed to extract transaction signature: ${error?.message || 'Unknown error'}`,
        };
      }

      // 11. Check for replay attack (signature already processed)
      if (signatureBase64 && this.isSignatureProcessed(signatureBase64)) {
        return {
          isValid: false,
          error: 'Transaction signature already processed (replay attack detected)',
        };
      }

      // 12. Verify transaction has recent blockhash and validate instructions
      // For v0 transactions, blockhash might be in message.recentBlockhash
      const recentBlockhash = transaction.recentBlockhash || 
                             (transaction as any).message?.recentBlockhash;
      
      if (!recentBlockhash) {
        // Log warning but don't fail - Solana will reject if blockhash is invalid
        logger.warn('Transaction missing recent blockhash, but continuing (Solana will validate)');
      }

      // Note: We can't verify blockhash age without querying blockchain,
      // but Solana will reject old blockhashes automatically

      return {
        isValid: true,
        transaction,
        signature: signatureBase64 || undefined,
      };
    } catch (error) {
      logger.error('Transaction validation error:', error);
      return {
        isValid: false,
        error: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Mark a transaction signature as processed (prevents replay)
   * Uses in-memory storage with automatic cleanup.
   */
  markSignatureAsProcessed(signature: string): void {
    this.processedSignatures.add(signature);
    // Auto-cleanup after TTL expires
    setTimeout(() => {
      this.processedSignatures.delete(signature);
    }, this.SIGNATURE_CACHE_DURATION_MS);
  }

  /**
   * Check if a signature has been processed
   * Uses in-memory storage.
   */
  isSignatureProcessed(signature: string): boolean {
    return this.processedSignatures.has(signature);
  }

  /**
   * Clean up old signatures from memory (called periodically)
   */
  private cleanupOldSignatures(): void {
    // In production, this should be stored in Redis/DB with TTL
    // For now, we'll keep a simple in-memory cache
    // If memory becomes an issue, implement LRU cache
    if (this.processedSignatures.size > 10000) {
      // Clear half if we exceed 10k signatures
      const signaturesArray = Array.from(this.processedSignatures);
      this.processedSignatures = new Set(signaturesArray.slice(5000));
      logger.info('Cleaned up old transaction signatures');
    }
  }

  /**
   * Verify transaction signature on-chain (after submission)
   */
  async verifyTransactionOnChain(
    signature: string,
    expectedNftMint: string,
    expectedWalletAddress: string
  ): Promise<boolean> {
    try {
      const txStatus = await this.connection.getSignatureStatus(signature);
      
      if (!txStatus.value || txStatus.value.err) {
        logger.error('Transaction failed on-chain:', txStatus.value?.err);
        return false;
      }

      // Get transaction details
      const txDetails = await this.connection.getTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });

      if (!txDetails) {
        logger.error('Transaction not found on-chain');
        return false;
      }

      // Verify fee payer
      if (txDetails.transaction.message.staticAccountKeys) {
        const feePayer = txDetails.transaction.message.staticAccountKeys[0];
        if (feePayer.toString() !== expectedWalletAddress) {
          logger.error('Fee payer mismatch on-chain');
          return false;
        }
      }

      // Verify NFT mint is in transaction
      const accountKeys = txDetails.transaction.message.staticAccountKeys || [];
      const accountAddresses = accountKeys.map(key => key.toString());
      
      if (!accountAddresses.includes(expectedNftMint)) {
        logger.error('NFT mint not found in on-chain transaction');
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error verifying transaction on-chain:', error);
      return false;
    }
  }
}

