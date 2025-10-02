import { apiClient } from './api';
import {
  Transaction,
  TransactionSummary,
  TransactionFilters
} from '../types/api';
import { MOCK_CONFIG } from '../config/mock';
import { mockHistoryService } from '../mocks/services';

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
    if (MOCK_CONFIG.ENABLE_MOCK) {
      const result = await mockHistoryService.getHistory(filters);
      return result.data;
    }

    const params = new URLSearchParams();
    
    if (filters?.search) params.append('search', filters.search);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const url = queryString ? `/history/transactions?${queryString}` : '/history/transactions';
    
    const response = await apiClient.get(url);
    console.log('HistoryService: Received response:', response);
    console.log('HistoryService: Response type:', typeof response);
    console.log('HistoryService: Full response structure:', JSON.stringify(response, null, 2));
    
    // Check if response is already the data object (from interceptor) or if it's the full response
    if (response && !response.success && !response.data) {
      console.log('HistoryService: Response is already the data object, returning directly');
      return response;
    }
    
    return response.data;
  }

  // Get specific transaction
  async getTransactionById(id: string): Promise<Transaction> {
    const response = await apiClient.get(`/history/transactions/${id}`);
    
    // Check if response is already the data object (from interceptor) or if it's the full response
    if (response && !response.success && !response.data) {
      console.log('HistoryService: Response is already the data object, returning directly');
      return response;
    }
    
    return response.data;
  }

  // Get transaction summary
  async getTransactionSummary(): Promise<TransactionSummary> {
    const response = await apiClient.get('/history/summary');
    
    // Check if response is already the data object (from interceptor) or if it's the full response
    if (response && !response.success && !response.data) {
      console.log('HistoryService: Response is already the data object, returning directly');
      return response;
    }
    
    return response.data;
  }
}

export const historyService = new HistoryService();
export default historyService;
