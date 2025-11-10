import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { logger } from '../middlewares/logger';

/**
 * Circuit Breaker States
 */
enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing, reject requests immediately
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

interface CircuitBreakerConfig {
  failureThreshold: number;      // Open circuit after N failures
  successThreshold: number;      // Close circuit after N successes
  timeout: number;               // Time to wait before trying again (ms)
}

interface RetryConfig {
  maxRetries: number;            // Maximum number of retries
  retryDelay: number;            // Initial delay between retries (ms)
  maxRetryDelay: number;          // Maximum delay between retries (ms)
  retryableStatusCodes: number[]; // HTTP status codes that should trigger retry
}

/**
 * HTTP Service with timeout, circuit breaker, and retry logic
 */
export class HttpService {
  private axiosInstance: AxiosInstance;
  private circuitBreakers: Map<string, {
    state: CircuitState;
    failures: number;
    successes: number;
    nextAttempt: number;
  }> = new Map();

  private readonly defaultTimeout = 10000; // 10 seconds
  private readonly defaultCircuitBreaker: CircuitBreakerConfig = {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 30000, // 30 seconds
  };
  private readonly defaultRetry: RetryConfig = {
    maxRetries: 3,
    retryDelay: 1000,
    maxRetryDelay: 10000,
    retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  };

  constructor(baseURL?: string, defaultConfig?: AxiosRequestConfig) {
    this.axiosInstance = axios.create({
      baseURL,
      timeout: this.defaultTimeout,
      ...defaultConfig,
    });

    // Setup interceptors for logging
    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      (config) => {
        logger.debug('HTTP Request', {
          method: config.method?.toUpperCase(),
          url: config.url,
          baseURL: config.baseURL,
        });
        return config;
      },
      (error) => {
        logger.error('HTTP Request Error', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => {
        logger.debug('HTTP Response', {
          status: response.status,
          url: response.config.url,
        });
        return response;
      },
      (error) => {
        if (error.response) {
          logger.warn('HTTP Response Error', {
            status: error.response.status,
            url: error.config?.url,
            message: error.message,
          });
        } else if (error.request) {
          logger.error('HTTP Request Timeout/No Response', {
            url: error.config?.url,
            message: error.message,
          });
        } else {
          logger.error('HTTP Error', error);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Check if circuit breaker allows request
   */
  private checkCircuitBreaker(serviceName: string, config: CircuitBreakerConfig): boolean {
    const breaker = this.circuitBreakers.get(serviceName) || {
      state: CircuitState.CLOSED,
      failures: 0,
      successes: 0,
      nextAttempt: 0,
    };

    const now = Date.now();

    // If circuit is OPEN, check if we should try again
    if (breaker.state === CircuitState.OPEN) {
      if (now < breaker.nextAttempt) {
        logger.warn(`Circuit breaker OPEN for ${serviceName}, rejecting request`);
        return false;
      }
      // Move to HALF_OPEN to test if service recovered
      breaker.state = CircuitState.HALF_OPEN;
      breaker.successes = 0;
      logger.info(`Circuit breaker HALF_OPEN for ${serviceName}, testing recovery`);
    }

    this.circuitBreakers.set(serviceName, breaker);
    return true;
  }

  /**
   * Record circuit breaker success
   */
  private recordSuccess(serviceName: string, config: CircuitBreakerConfig) {
    const breaker = this.circuitBreakers.get(serviceName) || {
      state: CircuitState.CLOSED,
      failures: 0,
      successes: 0,
      nextAttempt: 0,
    };

    if (breaker.state === CircuitState.HALF_OPEN) {
      breaker.successes++;
      if (breaker.successes >= config.successThreshold) {
        breaker.state = CircuitState.CLOSED;
        breaker.failures = 0;
        logger.info(`Circuit breaker CLOSED for ${serviceName}, service recovered`);
      }
    } else {
      // Reset failure count on success
      breaker.failures = 0;
    }

    this.circuitBreakers.set(serviceName, breaker);
  }

  /**
   * Record circuit breaker failure
   */
  private recordFailure(serviceName: string, config: CircuitBreakerConfig) {
    const breaker = this.circuitBreakers.get(serviceName) || {
      state: CircuitState.CLOSED,
      failures: 0,
      successes: 0,
      nextAttempt: 0,
    };

    breaker.failures++;

    if (breaker.failures >= config.failureThreshold) {
      breaker.state = CircuitState.OPEN;
      breaker.nextAttempt = Date.now() + config.timeout;
      logger.error(`Circuit breaker OPEN for ${serviceName} after ${breaker.failures} failures`);
    }

    this.circuitBreakers.set(serviceName, breaker);
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateRetryDelay(attempt: number, config: RetryConfig): number {
    const delay = Math.min(
      config.retryDelay * Math.pow(2, attempt),
      config.maxRetryDelay
    );
    // Add jitter to prevent thundering herd
    return delay + Math.random() * 1000;
  }

  /**
   * Check if error should trigger retry
   */
  private shouldRetry(error: AxiosError, attempt: number, config: RetryConfig): boolean {
    if (attempt >= config.maxRetries) {
      return false;
    }

    // Network errors or timeouts
    if (!error.response) {
      return true;
    }

    // Retry on specific status codes
    if (config.retryableStatusCodes.includes(error.response.status)) {
      return true;
    }

    return false;
  }

  /**
   * Make HTTP request with timeout, circuit breaker, and retry logic
   */
  async request<T = any>(
    config: AxiosRequestConfig,
    options?: {
      serviceName?: string;
      timeout?: number;
      circuitBreaker?: Partial<CircuitBreakerConfig>;
      retry?: Partial<RetryConfig>;
    }
  ): Promise<T> {
    const serviceName = options?.serviceName || 'default';
    const timeout = options?.timeout || this.defaultTimeout;
    const circuitBreakerConfig = {
      ...this.defaultCircuitBreaker,
      ...options?.circuitBreaker,
    };
    const retryConfig = {
      ...this.defaultRetry,
      ...options?.retry,
    };

    // Check circuit breaker
    if (!this.checkCircuitBreaker(serviceName, circuitBreakerConfig)) {
      throw new Error(`Circuit breaker OPEN for ${serviceName}`);
    }

    // Ensure timeout is set
    const requestConfig: AxiosRequestConfig = {
      ...config,
      timeout,
    };

    let lastError: AxiosError | null = null;

    // Retry loop
    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = this.calculateRetryDelay(attempt - 1, retryConfig);
          logger.debug(`Retrying request (attempt ${attempt}/${retryConfig.maxRetries}) after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        const response = await this.axiosInstance.request<T>(requestConfig);
        
        // Record success for circuit breaker
        this.recordSuccess(serviceName, circuitBreakerConfig);
        
        return response.data;
      } catch (error: any) {
        lastError = error;

        // Check if we should retry
        if (!this.shouldRetry(error, attempt, retryConfig)) {
          break;
        }

        logger.warn(`Request failed (attempt ${attempt + 1}/${retryConfig.maxRetries + 1}): ${error.message}`);
      }
    }

    // Record failure for circuit breaker
    this.recordFailure(serviceName, circuitBreakerConfig);

    // Throw last error
    if (lastError) {
      throw lastError;
    }

    throw new Error('Request failed after all retries');
  }

  /**
   * GET request
   */
  async get<T = any>(
    url: string,
    config?: AxiosRequestConfig,
    options?: {
      serviceName?: string;
      timeout?: number;
      circuitBreaker?: Partial<CircuitBreakerConfig>;
      retry?: Partial<RetryConfig>;
    }
  ): Promise<T> {
    return this.request<T>({ ...config, method: 'GET', url }, options);
  }

  /**
   * POST request
   */
  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
    options?: {
      serviceName?: string;
      timeout?: number;
      circuitBreaker?: Partial<CircuitBreakerConfig>;
      retry?: Partial<RetryConfig>;
    }
  ): Promise<T> {
    return this.request<T>({ ...config, method: 'POST', url, data }, options);
  }

  /**
   * PUT request
   */
  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
    options?: {
      serviceName?: string;
      timeout?: number;
      circuitBreaker?: Partial<CircuitBreakerConfig>;
      retry?: Partial<RetryConfig>;
    }
  ): Promise<T> {
    return this.request<T>({ ...config, method: 'PUT', url, data }, options);
  }

  /**
   * DELETE request
   */
  async delete<T = any>(
    url: string,
    config?: AxiosRequestConfig,
    options?: {
      serviceName?: string;
      timeout?: number;
      circuitBreaker?: Partial<CircuitBreakerConfig>;
      retry?: Partial<RetryConfig>;
    }
  ): Promise<T> {
    return this.request<T>({ ...config, method: 'DELETE', url }, options);
  }

  /**
   * Get circuit breaker status for monitoring
   */
  getCircuitBreakerStatus(serviceName: string) {
    return this.circuitBreakers.get(serviceName) || null;
  }

  /**
   * Get all circuit breaker statuses
   */
  getAllCircuitBreakerStatuses() {
    return Object.fromEntries(this.circuitBreakers);
  }
}

// Export singleton instance
export const httpService = new HttpService();

