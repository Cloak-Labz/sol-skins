import { apiClient } from './api';

export interface IrysUploadResult {
  id: string;
  uri: string;
  size: number;
}

class IrysService {
  /**
   * Upload metadata to Irys via server-side endpoint
   * This bypasses wallet signMessage requirements
   */
  async uploadMetadata(metadata: any): Promise<IrysUploadResult> {
    try {
      const response = await apiClient.post<any>('/irys/upload', { metadata });
      // Handle nested response structure
      const result = response?.data || response;
      return {
        id: result.id,
        uri: result.uri,
        size: result.size || 0,
      };
    } catch (error) {
      throw new Error('Failed to upload metadata to Irys');
    }
  }

  /**
   * Upload multiple metadata objects in batch
   */
  async uploadMetadataBatch(metadataList: any[]): Promise<IrysUploadResult[]> {
    try {
      const promises = metadataList.map(metadata => this.uploadMetadata(metadata));
      return await Promise.all(promises);
    } catch (error) {
      throw new Error('Failed to upload metadata batch to Irys');
    }
  }
}

export const irysService = new IrysService();
