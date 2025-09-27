import { apiClient } from './api';
import { 
  CaseOpening, 
  OpenCaseRequest, 
  CaseDecisionRequest 
} from '../types/api';

class CasesService {
  // Open a case
  async openCase(request: OpenCaseRequest): Promise<{
    caseOpeningId: string;
    nftMintAddress: string;
    vrfRequestId: string;
    transactionId: string;
    estimatedCompletionTime: string;
  }> {
    return apiClient.post('/cases/open', request);
  }

  // Get case opening status
  async getCaseOpeningStatus(id: string): Promise<CaseOpening> {
    return apiClient.get(`/cases/opening/${id}/status`);
  }

  // Make decision on case opening
  async makeCaseDecision(id: string, decision: CaseDecisionRequest): Promise<{
    decision: string;
    nftMintAddress: string;
    addedToInventory: boolean;
  }> {
    return apiClient.post(`/cases/opening/${id}/decision`, decision);
  }

  // Get user's case openings
  async getUserCaseOpenings(): Promise<CaseOpening[]> {
    return apiClient.get('/cases/openings');
  }
}

export const casesService = new CasesService();
export default casesService;
