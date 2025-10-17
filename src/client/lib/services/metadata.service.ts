import { apiClient } from "./api";

class MetadataService {
  async upload(json: any): Promise<{ id: string; uri: string }> {
    const res = await apiClient.post("/metadata", { json });
    const id = res?.id || res?.data?.id || res?.data?.data?.id || res?.data?.data?.data?.id;
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/api/v1";
    return { id, uri: `${base}/metadata/${id}` };
  }

  async fetch(id: string): Promise<any> {
    return await apiClient.get(`/metadata/${id}`);
  }
}

export const metadataService = new MetadataService();


