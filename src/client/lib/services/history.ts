import { apiClient } from './api';
import { 
  Transaction, 
  TransactionSummary, 
  TransactionFilters 
} from '../types/api';

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
    const params = new URLSearchParams();
    
    if (filters?.search) params.append('search', filters.search);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const url = queryString ? `/history/transactions?${queryString}` : '/history/transactions';
    
    return apiClient.get(url);
  }

  // Get specific transaction
  async getTransactionById(id: string): Promise<Transaction> {
    return apiClient.get(`/history/transactions/${id}`);
  }

  // Get transaction summary
  async getTransactionSummary(): Promise<TransactionSummary> {
    return apiClient.get('/history/summary');
  }
}

export const historyService = new HistoryService();
export default historyService;
