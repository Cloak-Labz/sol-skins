import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { ApiResponse } from "../types/api";
import { generateRequestNonce } from "../utils/nonce";

class ApiClient {
  public client: AxiosInstance;
  private walletAddress: string | null = null;
  private jwtToken: string | null = null;
  private csrfToken: string | null = null;
  private csrfTokenPromise: Promise<string | null> | null = null;
  private csrfTokenTimestamp: number | null = null; // Timestamp when token was obtained

  private readonly JWT_TOKEN_KEY = 'sol_skins_jwt_token';
  private readonly WALLET_ADDRESS_KEY = 'sol_skins_wallet_address';
  private readonly CSRF_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes (matches backend)
  private readonly CSRF_TOKEN_RENEWAL_THRESHOLD_MS = 5 * 60 * 1000; // Renew if less than 5 minutes remaining

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

    // Load persisted token and wallet address from localStorage
    if (typeof window !== 'undefined') {
      const savedToken = localStorage.getItem(this.JWT_TOKEN_KEY);
      const savedWallet = localStorage.getItem(this.WALLET_ADDRESS_KEY);
      if (savedToken) {
        this.jwtToken = savedToken;
      }
      if (savedWallet) {
        this.walletAddress = savedWallet;
      }
    }

    this.setupInterceptors();
    // Fetch CSRF token on initialization (fire and forget - will be fetched on first request if needed)
    // Don't await to avoid blocking constructor
    this.fetchCSRFToken().catch(err => {
      // Token will be fetched on first request if initialization fails
    });
  }

  /**
   * Check if CSRF token is expiring soon and needs renewal
   * More aggressive renewal to prevent expiration errors
   */
  private isCSRFTokenExpiringSoon(): boolean {
    if (!this.csrfToken || !this.csrfTokenTimestamp) {
      return true; // No token or timestamp, needs fetching
    }
    
    const elapsed = Date.now() - this.csrfTokenTimestamp;
    const remaining = this.CSRF_TOKEN_TTL_MS - elapsed;
    
    // More aggressive renewal strategy:
    // 1. Renew if less than threshold time remaining (5 minutes)
    // 2. Renew if token is older than 10 minutes (possible server restart or long session)
    // 3. Always err on the side of renewal to prevent expiration errors
    const MAX_TOKEN_AGE_MS = 10 * 60 * 1000; // 10 minutes - if token is older, renew proactively
    
    if (elapsed > MAX_TOKEN_AGE_MS) {
      return true; // Token is getting old, renew proactively
    }
    
    // Renew if less than 5 minutes remaining (more aggressive than before)
    return remaining < this.CSRF_TOKEN_RENEWAL_THRESHOLD_MS;
  }

  /**
   * Fetch CSRF token from server (public method to force refresh)
   */
  async refreshCSRFToken(): Promise<string | null> {
    // Clear existing token and promise to force refresh
    this.csrfToken = null;
    this.csrfTokenTimestamp = null;
    this.csrfTokenPromise = null;
    return this.fetchCSRFToken();
  }

  /**
   * Fetch CSRF token from server
   */
  private async fetchCSRFToken(): Promise<string | null> {
    // If already fetching, return the existing promise
    if (this.csrfTokenPromise) {
      return this.csrfTokenPromise;
    }

    // Create new promise to fetch CSRF token
    this.csrfTokenPromise = (async () => {
      try {
        // Use the base URL directly, not the axios client (avoid circular dependency)
        const baseUrl = this.client.defaults.baseURL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
        const url = `${baseUrl}/csrf-token`;
        
        // Use plain axios to avoid interceptors that might interfere
        const response = await axios.get<{ success: boolean; data: { csrfToken: string } }>(url, {
          timeout: 5000, // 5 second timeout
          validateStatus: (status) => status === 200, // Only accept 200
          // Don't use the client's interceptors for CSRF token fetch
        });
        
        // Handle ApiResponse format: { success: true, data: { csrfToken: string } }
        // Also check header as fallback
        const token = response.data?.data?.csrfToken || response.headers['x-csrf-token'] || response.headers['X-CSRF-Token'];
        
        if (!token) {
          throw new Error(`CSRF token not found in response. Response: ${JSON.stringify(response.data)}`);
        }
        
        this.csrfToken = token;
        this.csrfTokenTimestamp = Date.now(); // Store timestamp when token was obtained
        this.csrfTokenPromise = null; // Clear promise after success
        return this.csrfToken;
      } catch (error: any) {
        this.csrfTokenPromise = null; // Clear promise on error
        throw error;
      }
    })();

    return this.csrfTokenPromise;
  }

  /**
   * Get CSRF token, fetching if necessary or if expiring soon
   */
  private async ensureCSRFToken(): Promise<string | null> {
    // If we have a valid, non-expiring token, return it
    if (this.csrfToken && !this.isCSRFTokenExpiringSoon()) {
      return this.csrfToken;
    }

    // Otherwise, fetch it (missing, invalid, or expiring soon)
    try {
      // Clear if expiring soon
      if (this.isCSRFTokenExpiringSoon()) {
        this.csrfToken = null;
        this.csrfTokenTimestamp = null;
      }
      
      const token = await this.fetchCSRFToken();
      if (!token) {
        // If fetch failed silently, try again once
        this.csrfToken = null;
        this.csrfTokenTimestamp = null;
        this.csrfTokenPromise = null;
        return await this.fetchCSRFToken();
      }
      return token;
    } catch (error) {
      // Clear promise on error to allow retry
      this.csrfTokenPromise = null;
      // Try one more time
      try {
        return await this.fetchCSRFToken();
      } catch (retryError) {
        return null;
      }
    }
  }

  private setupInterceptors() {
    // Request interceptor to add wallet address, JWT token, CSRF token, and nonce to requests
    this.client.interceptors.request.use(
      async (config) => {
        // Add JWT token to Authorization header for authenticated requests
        // Skip for public endpoints
        const url = config.url || "";
        const isPublicEndpoint = 
          url.includes('/auth/connect') || 
          url.includes('/csrf-token') ||
          url.startsWith('/boxes') && ['get'].includes((config.method || "get").toLowerCase()); // Public GET /boxes
        
        // Ensure we have the latest token (in case it was updated)
        const token = this.jwtToken || (typeof window !== 'undefined' ? localStorage.getItem(this.JWT_TOKEN_KEY) : null);
        
        if (token && !isPublicEndpoint) {
          if (!config.headers) {
            config.headers = {} as any;
          }
          config.headers['Authorization'] = `Bearer ${token}`;
        }

        // Add CSRF token for state-changing operations (POST, PUT, DELETE)
        // Skip for GET, HEAD, OPTIONS and public endpoints
        const method = (config.method || "get").toLowerCase();
        const needsCSRF = ['post', 'put', 'delete'].includes(method) && 
                          !url.includes('/auth/connect') && // Exclude initial connection
                          !url.includes('/csrf-token'); // Exclude CSRF endpoint itself
        
        if (needsCSRF) {
          // ALWAYS ensure we have a fresh, valid CSRF token before making the request
          // This prevents expiration errors and improves UX significantly
          // Strategy: Always refresh if token is missing, invalid, or expiring soon (within 5 minutes)
          const shouldRefresh = 
            !this.csrfToken || 
            typeof this.csrfToken !== 'string' || 
            this.csrfToken.length < 32 || 
            this.isCSRFTokenExpiringSoon();
          
          if (shouldRefresh) {
            try {
              // Clear existing token to force a fresh fetch
              this.csrfToken = null;
              this.csrfTokenTimestamp = null;
              this.csrfTokenPromise = null; // Clear any pending fetch
              
              // Fetch a fresh token - this ensures we always have a valid token
              const fetchedToken = await this.fetchCSRFToken();
              if (!fetchedToken) {
                throw new Error('CSRF token fetch failed - unable to obtain token');
              }
              
              // Verify token is valid before using it
              if (typeof fetchedToken !== 'string' || fetchedToken.length < 32) {
                throw new Error('CSRF token validation failed - invalid token format');
              }
              
              this.csrfToken = fetchedToken;
            } catch (error: any) {
              // If we can't get a token, the request will fail anyway
              // But we should log this for debugging
              console.error('Failed to fetch CSRF token before request:', error);
              throw new Error(`CSRF token required but could not be obtained: ${error.message}`);
            }
          }
          
          const token = this.csrfToken;
          
          // Ensure headers object exists
          if (!config.headers) {
            config.headers = {} as any;
          }
          
          // Set the token in both formats to be safe
          config.headers['X-CSRF-Token'] = token;
          config.headers['x-csrf-token'] = token;
          
          // Verify header was actually set
          if (!config.headers['X-CSRF-Token'] && !config.headers['x-csrf-token']) {
          }
        }

        if (this.walletAddress) {
          const needsWalletInGetBody =
            url.includes("/leaderboard/rank") ||
            url.includes("/cases/opening") ||
            url.includes("/cases/openings") ||
            url.startsWith("/inventory") ||
            url.startsWith("/history") ||
            url.startsWith("/auth/profile");

          if (method !== "get") {
            // Ensure data object exists for POST/PUT/DELETE requests
            if (!config.data) {
              config.data = {};
            }
            
            // Add wallet address to request body for POST/PUT/DELETE requests
            if (this.walletAddress) {
              (config.data as any).walletAddress = this.walletAddress;
            }
            
            // Add nonce and timestamp for replay attack prevention (skip if already present)
            if (!(config.data as any).nonce) {
              const { nonce, timestamp } = generateRequestNonce();
              (config.data as any).nonce = nonce;
              (config.data as any).timestamp = timestamp;
            }
          } else if (method === "get" && needsWalletInGetBody) {
            // Browsers ignore GET bodies; pass wallet via query string
            const currentUrl = config.url || "";
            const separator = currentUrl.includes("?") ? "&" : "?";
            config.url =
              currentUrl +
              separator +
              "walletAddress=" +
              encodeURIComponent(this.walletAddress);
          }
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response: AxiosResponse<ApiResponse<any>>) => {
        return response; // Return the full response to maintain structure
      },
      async (error) => {
        // silent response errors (handled by caller)
        
        // Handle CSRF token errors - refresh token and retry automatically
        // This provides a seamless experience even if token expires between check and request
        if (error.response?.status === 403 && 
            (error.response?.data?.error?.code === 'CSRF_TOKEN_MISSING' || 
             error.response?.data?.error?.code === 'CSRF_TOKEN_INVALID' ||
             error.response?.data?.error?.message?.toLowerCase().includes('csrf'))) {

          console.warn('CSRF token error detected, refreshing and retrying...', {
            code: error.response?.data?.error?.code,
            message: error.response?.data?.error?.message,
          });

          // Clear invalid token and fetch new one
          this.csrfToken = null;
          this.csrfTokenTimestamp = null;
          this.csrfTokenPromise = null;
          
          // Try to fetch new token and retry request
          try {
            const token = await this.fetchCSRFToken();
            if (token && error.config) {
              // Validate token before using
              if (typeof token !== 'string' || token.length < 32) {
                console.error('Invalid CSRF token format after refresh');
                return Promise.reject(error);
              }
              
              // Create a new config object to ensure headers are properly set
              // Also need to recreate data if it was modified
              const retryConfig = {
                ...error.config,
                headers: {
                  ...error.config.headers,
                  'X-CSRF-Token': token,
                  'x-csrf-token': token,
                },
                // Ensure data is properly set if it exists
                data: error.config.data,
              };
              
              console.log('Retrying request with fresh CSRF token');
              // Retry the request with new token
              return this.client.request(retryConfig);
            } else {
              // If we can't get a token, reject with the original error
              console.error('Failed to fetch CSRF token for retry');
              return Promise.reject(error);
            }
          } catch (fetchError: any) {
            // If we can't fetch a new token, reject with the original error
            console.error('Error fetching CSRF token for retry:', fetchError);
            return Promise.reject(error);
          }
        }
        
        // Handle common errors
        if (error.response?.status === 401) {
          // Unauthorized - clear wallet session and token
          this.setWalletAddress(null);
          this.setJwtToken(null);
          // You might want to redirect to login or show a modal
        }

        return Promise.reject(error);
      }
    );
  }

  // Authentication methods
  setWalletAddress(address: string | null) {
    this.walletAddress = address;
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      if (address) {
        localStorage.setItem(this.WALLET_ADDRESS_KEY, address);
      } else {
        localStorage.removeItem(this.WALLET_ADDRESS_KEY);
      }
    }
  }

  getWalletAddress(): string | null {
    return this.walletAddress;
  }

  setJwtToken(token: string | null) {
    this.jwtToken = token;
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem(this.JWT_TOKEN_KEY, token);
      } else {
        localStorage.removeItem(this.JWT_TOKEN_KEY);
      }
    }
  }

  getJwtToken(): string | null {
    return this.jwtToken;
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

  // PATCH request helper
  async patch<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return this.request<T>({ ...config, method: "PATCH", url, data });
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
