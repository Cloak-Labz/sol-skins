import { apiClient } from './api'
import { CaseOpening, OpenCaseRequest, CaseDecisionRequest } from '../types/api'
import { MOCK_CONFIG } from '../config/mock'
import { mockLootBoxService } from '../mocks/services'

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
    if (MOCK_CONFIG.ENABLE_MOCK) {
      const mockResult = await mockLootBoxService.openLootBox(request.lootBoxTypeId);
      return {
        success: true,
        data: {
          caseOpeningId: 'mock-case-' + Date.now(),
          nftMintAddress: mockResult.data.skin.mintAddress,
          vrfRequestId: 'mock-vrf-' + Date.now(),
          transactionId: mockResult.data.transaction,
          estimatedCompletionTime: new Date(Date.now() + 5000).toISOString()
        }
      };
    }

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
    // The API interceptor will add walletAddress automatically for GET requests
    // ApiClient returns the inner data object (CaseOpening)
    return apiClient.get<CaseOpening>(`/cases/opening/${id}/status`);
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
    // The API interceptor will add walletAddress automatically for GET requests
    return apiClient.get('/cases/openings');
  }
}

export const casesService = new CasesService()
