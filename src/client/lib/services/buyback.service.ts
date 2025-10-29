import { apiClient } from './api.service';
import { Connection, Transaction, PublicKey } from '@solana/web3.js';
import { toast } from 'react-hot-toast';

export interface BuybackCalculation {
  nftMint: string;
  skinPrice: number;
  buybackAmount: number;
  buybackAmountLamports: string;
}

export interface BuybackRequestResponse {
  transaction: string; // Base64 encoded transaction
  buybackAmount: number;
  buybackAmountLamports: string;
  skinPrice: number;
  nftMint: string;
}

export interface BuybackConfirmResponse {
  message: string;
  txSignature: string;
  amountPaid: number;
}

export interface BuybackStatus {
  enabled: boolean;
  treasuryAddress: string;
  collectionMint: string;
  minTreasuryBalance: string;
}

export interface BuybackHistoryRecord {
  id: string;
  userWallet: string;
  nftMint: string;
  amountPaid: number;
  txSignature: string;
  createdAt: string;
}

class BuybackService {
  /**
   * Request a buyback transaction from the backend
   */
  async requestBuyback(nftMint: string): Promise<BuybackRequestResponse> {
    try {
      const response = await apiClient.post<BuybackRequestResponse>('/buyback/request', {
        nftMint,
      });
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to request buyback';
      toast.error(message);
      throw new Error(message);
    }
  }

  /**
   * Sign and send buyback transaction
   */
  async signAndSendBuyback(
    transactionBase64: string,
    wallet: any,
    connection: Connection
  ): Promise<string> {
    try {
      // Deserialize transaction
      const transactionBuffer = Buffer.from(transactionBase64, 'base64');
      const transaction = Transaction.from(transactionBuffer);

      // User signs the transaction
      const signedTransaction = await wallet.signTransaction(transaction);

      // Send transaction
      const signature = await connection.sendRawTransaction(signedTransaction.serialize());

      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');

      return signature;
    } catch (error: any) {
      toast.error('Failed to send transaction');
      throw error;
    }
  }

  /**
   * Confirm buyback transaction with backend
   */
  async confirmBuyback(
    txSignature: string,
    nftMint: string
  ): Promise<BuybackConfirmResponse> {
    try {
      const response = await apiClient.post<BuybackConfirmResponse>('/buyback/confirm', {
        txSignature,
        nftMint,
      });
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to confirm buyback';
      toast.error(message);
      throw new Error(message);
    }
  }

  /**
   * Get buyback system status
   */
  async getStatus(): Promise<BuybackStatus> {
    try {
      const response = await apiClient.get<BuybackStatus>('/buyback/status');
      return response;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Calculate buyback amount for an NFT
   */
  async calculateBuyback(nftMint: string): Promise<BuybackCalculation> {
    try {
      const response = await apiClient.get<BuybackCalculation>(
        `/buyback/calculate/${nftMint}`
      );
      return response;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Get user's buyback history
   */
  async getHistory(): Promise<BuybackHistoryRecord[]> {
    try {
      const response = await apiClient.get<BuybackHistoryRecord[]>('/buyback/history');
      return response;
    } catch (error: any) {
      return [];
    }
  }

  /**
   * Execute complete buyback flow
   */
  async executeBuyback(
    nftMint: string,
    wallet: any,
    connection: Connection
  ): Promise<BuybackConfirmResponse> {
    // Step 1: Request transaction from backend
    toast.loading('Preparing buyback transaction...', { id: 'buyback' });
    const requestData = await this.requestBuyback(nftMint);

    // Step 2: Sign and send transaction
    toast.loading('Please sign the transaction...', { id: 'buyback' });
    const signature = await this.signAndSendBuyback(
      requestData.transaction,
      wallet,
      connection
    );

    // Step 3: Confirm with backend
    toast.loading('Confirming transaction...', { id: 'buyback' });
    const confirmation = await this.confirmBuyback(signature, nftMint);

    toast.success(
      `Buyback complete! Received ${confirmation.amountPaid.toFixed(4)} SOL`,
      { id: 'buyback' }
    );

    return confirmation;
  }
}

export const buybackService = new BuybackService();

