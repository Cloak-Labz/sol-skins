import { apiClient } from './api.service';
import { Connection, Transaction } from '@solana/web3.js';

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
  amountPaid: number;
  txSignature?: string;
  signature?: string;
  transactionSignature?: string;
  hash?: string;
  tx?: string;
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
  async requestBuyback(nftMint: string): Promise<BuybackRequestResponse> {
    const response = await apiClient.post<BuybackRequestResponse>('/buyback/request', {
      nftMint,
    });
    return response;
  }

  /**
   * Sign buyback transaction and return base64-encoded signed tx (do NOT send to RPC here)
   */
  async signBuybackTransaction(
    transactionBase64: string,
    wallet: any
  ): Promise<string> {
    const transactionBuffer = Buffer.from(transactionBase64, 'base64');
    const transaction = Transaction.from(transactionBuffer);
    const signedTransaction = await wallet.signTransaction(transaction);
    return Buffer.from(signedTransaction.serialize()).toString('base64');
  }

  /**
   * Confirm buyback with backend using signed transaction
   */
  async confirmBuybackSigned(
    params: { nftMint: string; walletAddress: string; signedTransaction: string }
  ): Promise<BuybackConfirmResponse> {
    const response = await apiClient.post<BuybackConfirmResponse>('/buyback/confirm', params);
    return response;
  }

  async getStatus(): Promise<BuybackStatus> {
    const response = await apiClient.get<BuybackStatus>('/buyback/status');
    return response;
  }

  async calculateBuyback(nftMint: string): Promise<BuybackCalculation> {
    const response = await apiClient.get<BuybackCalculation>(
      `/buyback/calculate/${nftMint}`
    );
    return response;
  }

  async getHistory(): Promise<BuybackHistoryRecord[]> {
    try {
      const response = await apiClient.get<BuybackHistoryRecord[]>('/buyback/history');
      return response;
    } catch {
      return [];
    }
  }

  /**
   * Execute complete buyback flow (request → sign → confirm). Caller handles toasts.
   */
  async executeBuyback(
    nftMint: string,
    wallet: any,
    connection: Connection
  ): Promise<BuybackConfirmResponse> {
    // 1) Request unsigned tx
    const requestData = await this.requestBuyback(nftMint);
    // 2) Sign locally
    const signedTxBase64 = await this.signBuybackTransaction(requestData.transaction, wallet);
    // 3) Confirm with backend (backend will send and record the tx)
    const walletAddress = wallet?.publicKey?.toBase58?.() || wallet?.publicKey?.toString?.() || '';
    const confirmation = await this.confirmBuybackSigned({
      nftMint,
      walletAddress,
      signedTransaction: signedTxBase64,
    });
    return confirmation;
  }
}

export const buybackService = new BuybackService();

