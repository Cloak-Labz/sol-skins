import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { ApiResponse } from "../types/api";

class ApiClient {
  public client: AxiosInstance;
  private walletAddress: string | null = null;

  constructor() {
    // Handle both cases: with and without /api/v1 suffix
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
    const normalizedBaseUrl = baseUrl.endsWith('/api/v1') ? baseUrl : `${baseUrl}/api/v1`;
    
    this.client = axios.create({
      baseURL: normalizedBaseUrl,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add wallet address to request body
    this.client.interceptors.request.use(
      (config) => {
        console.log("API Request:", config.method?.toUpperCase(), config.url);
        console.log("Request data before interceptor:", config.data);
        console.log("Wallet address:", this.walletAddress);

        if (this.walletAddress) {
          const url = config.url || "";
          const method = (config.method || "get").toLowerCase();

          const needsWalletInGetBody =
            url.includes("/leaderboard/rank") ||
            url.includes("/cases/opening") ||
            url.includes("/cases/openings") ||
            url.startsWith("/inventory") ||
            url.startsWith("/history") ||
            url.startsWith("/auth/profile");

          if (config.data && method !== "get") {
            // Add wallet address to request body for POST/PUT requests
            (config.data as any).walletAddress = this.walletAddress;
            console.log("Request data after adding wallet:", config.data);
          } else if (method === "get" && needsWalletInGetBody) {
            // Browsers ignore GET bodies; pass wallet via query string
            const currentUrl = config.url || "";
            const separator = currentUrl.includes("?") ? "&" : "?";
            config.url =
              currentUrl +
              separator +
              "walletAddress=" +
              encodeURIComponent(this.walletAddress);
            console.log("Request url after adding wallet for GET:", config.url);
          }
        }
        return config;
      },
      (error) => {
        console.error("Request interceptor error:", error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response: AxiosResponse<ApiResponse<any>>) => {
        console.log("API Response:", response.status, response.data);
        return response; // Return the full response to maintain structure
      },
      (error) => {
        console.error(
          "API Error:",
          error.response?.status,
          error.response?.data
        );
        // Handle common errors
        if (error.response?.status === 401) {
          // Unauthorized - clear wallet session
          this.walletAddress = null;
          // You might want to redirect to login or show a modal
        }

        return Promise.reject(error);
      }
    );
  }

  // Authentication methods
  setWalletAddress(address: string | null) {
    console.log("Setting wallet address:", address);
    this.walletAddress = address;
  }

  getWalletAddress(): string | null {
    return this.walletAddress;
  }

  // Generic request method
  private async request<T>(config: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.client.request<ApiResponse<T>>(config);

      if (!response.data.success) {
        throw new Error(response.data.error?.message || "API request failed");
      }

      return response.data.data as T;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error?.message || error.message;
        throw new Error(message);
      }
      throw error;
    }
  }

  // GET request helper
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: "GET", url });
  }

  // POST request helper
  async post<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return this.request<T>({ ...config, method: "POST", url, data });
  }

  // PUT request helper
  async put<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return this.request<T>({ ...config, method: "PUT", url, data });
  }

  // DELETE request helper
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: "DELETE", url });
  }

  // Health check
  async healthCheck(): Promise<{
    status: string;
    timestamp: string;
    version: string;
  }> {
    // Health endpoint is at root level, not under /api/v1
    const baseUrl = this.client.defaults.baseURL || '';
    const healthUrl = baseUrl.replace('/api/v1', '') + '/health';
    const response = await axios.get(healthUrl);
    return response.data.data;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
