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

  async getOpeningStatus(id: string): Promise<{
    success: boolean
    data: CaseOpening
  }> {
    const response = await apiClient.get(`/cases/opening/${id}/status`)
    
    // Check if response is already the data object (from interceptor) or if it's the full response
    if (response && !response.success && !response.data) {
      console.log('CasesService: Response is already the data object, wrapping it');
      return { success: true, data: response };
    }
    
    return response.data
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
    const response = await apiClient.get('/cases/openings')
    
    // Check if response is already the data array (from interceptor) or if it's the full response
    if (Array.isArray(response)) {
      console.log('CasesService: Response is already an array, returning directly');
      return { success: true, data: response };
    }
    
    return response.data
  }
}

export const casesService = new CasesService()
