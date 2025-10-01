import { apiClient } from './api'
import { CaseOpening, OpenCaseRequest, CaseDecisionRequest } from '../types/api'

export class CasesService {
  async openCase(request: OpenCaseRequest): Promise<{
    success: boolean
    data: {
      caseOpeningId: string
      nftMintAddress: string
      vrfRequestId: string
      transactionId: string
      estimatedCompletionTime: string
    }
  }> {
    const response = await apiClient.post('/cases/open', request)
    console.log('CasesService: Received response:', response);
    console.log('CasesService: Response type:', typeof response);
    console.log('CasesService: Full response structure:', JSON.stringify(response, null, 2));
    
    // Check if response is already the data object (from interceptor) or if it's the full response
    if (response && !response.success && !response.data) {
      console.log('CasesService: Response is already the data object, wrapping it');
      return { success: true, data: response };
    }
    
    return response.data
  }

  async getOpeningStatus(id: string): Promise<CaseOpening> {
    const wallet = apiClient.getWalletAddress();
    const url = wallet
      ? `/cases/opening/${id}/status?walletAddress=${encodeURIComponent(wallet)}`
      : `/cases/opening/${id}/status`;
    
    // ApiClient returns the inner data object (CaseOpening)
    return apiClient.get<CaseOpening>(url);
  }

  async makeDecision(id: string, decision: CaseDecisionRequest): Promise<{
    success: boolean
    data: {
      decision: string
      nftMintAddress: string
      addedToInventory: boolean
    }
  }> {
    const response = await apiClient.post(`/cases/opening/${id}/decision`, decision)
    
    // Check if response is already the data object (from interceptor) or if it's the full response
    if (response && !response.success && !response.data) {
      console.log('CasesService: Response is already the data object, wrapping it');
      return { success: true, data: response };
    }
    
    return response.data
  }

  async getUserCaseOpenings(): Promise<{
    success: boolean
    data: CaseOpening[]
  }> {
    const wallet = apiClient.getWalletAddress();
    const url = wallet
      ? `/cases/openings?walletAddress=${encodeURIComponent(wallet)}`
      : '/cases/openings';
    return apiClient.get(url);
  }
}

export const casesService = new CasesService()
