import { apiClient } from './api.service'
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
    const data = await apiClient.post<{
      caseOpeningId: string
      nftMintAddress: string
      vrfRequestId: string
      transactionId: string
      estimatedCompletionTime: string
    }>('/cases/open', request)

    // apiClient.post returns the inner data directly, so wrap it in the expected format
    return { success: true, data }
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
    const data = await apiClient.post<{
      decision: string
      nftMintAddress: string
      addedToInventory: boolean
    }>(`/cases/opening/${id}/decision`, decision)

    // apiClient.post returns the inner data directly, so wrap it in the expected format
    return { success: true, data }
  }

  async getUserCaseOpenings(): Promise<{
    success: boolean
    data: CaseOpening[]
  }> {
    // The API interceptor will add walletAddress automatically for GET requests
    const data = await apiClient.get<CaseOpening[]>('/cases/openings');
    return { success: true, data };
  }
}

export const casesService = new CasesService()
