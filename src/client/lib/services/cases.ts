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
