import { apiClient } from './api';
import {
  Transaction,
  TransactionSummary,
  TransactionFilters
} from '../types/api';
// Mocks removed for production build

class HistoryService {
  // Get user transactions
  async getTransactions(filters?: TransactionFilters): Promise<{
    transactions: Transaction[];
    summary: TransactionSummary;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    // Always call API (mocks removed)

    const params = new URLSearchParams();
    
    if (filters?.search) params.append('search', filters.search);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const url = queryString ? `/history/transactions?${queryString}` : '/history/transactions';
    
    const response = await apiClient.get<{
      transactions: Transaction[];
      summary: TransactionSummary;
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(url);
    return response;
  }

  // Get specific transaction
  async getTransactionById(id: string): Promise<Transaction> {
    const response = await apiClient.get<Transaction>(`/history/transactions/${id}`);
    return response;
  }

  // Get transaction summary
  async getTransactionSummary(): Promise<TransactionSummary> {
    const response = await apiClient.get<TransactionSummary>('/history/summary');
    return response;
  }
}

export const historyService = new HistoryService();
export default historyService;
