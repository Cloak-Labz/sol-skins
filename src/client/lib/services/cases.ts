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
    return response.data
  }

  async getOpeningStatus(id: string): Promise<{
    success: boolean
    data: CaseOpening
  }> {
    const response = await apiClient.get(`/cases/opening/${id}/status`)
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
    return response.data
  }

  async getUserCaseOpenings(): Promise<{
    success: boolean
    data: CaseOpening[]
  }> {
    const response = await apiClient.get('/cases/openings')
    return response.data
  }
}

export const casesService = new CasesService()
