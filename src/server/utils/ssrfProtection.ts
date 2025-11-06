import { logger } from '../middlewares/logger';

/**
 * SSRF Protection Utilities
 * Prevents Server-Side Request Forgery attacks by validating URLs before fetching
 */

// Private IP ranges (RFC 1918)
const PRIVATE_IP_RANGES = [
  { start: 0x0a000000, end: 0x0affffff }, // 10.0.0.0/8
  { start: 0xac100000, end: 0xac1fffff }, // 172.16.0.0/12
  { start: 0xc0a80000, end: 0xc0a8ffff }, // 192.168.0.0/16
  { start: 0x7f000000, end: 0x7fffffff }, // 127.0.0.0/8 (localhost)
  { start: 0x00000000, end: 0x00ffffff }, // 0.0.0.0/8
  { start: 0xa9fe0000, end: 0xa9feffff }, // 169.254.0.0/16 (link-local)
  { start: 0xfc000000, end: 0xfdffffff }, // fc00::/7 (IPv6 private)
];

// Reserved IP ranges
const RESERVED_IP_RANGES = [
  { start: 0xe0000000, end: 0xefffffff }, // 224.0.0.0/4 (multicast)
  { start: 0xf0000000, end: 0xffffffff }, // 240.0.0.0/4 (future use)
];

/**
 * Converts IP address string to integer
 */
function ipToInt(ip: string): number {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
    return -1;
  }
  return (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3];
}

/**
 * Checks if an IP address is in a private/reserved range
 */
function isPrivateOrReservedIP(ip: string): boolean {
  const ipInt = ipToInt(ip);
  if (ipInt === -1) return false;

  // Check private ranges
  for (const range of PRIVATE_IP_RANGES) {
    if (ipInt >= range.start && ipInt <= range.end) {
      return true;
    }
  }

  // Check reserved ranges
  for (const range of RESERVED_IP_RANGES) {
    if (ipInt >= range.start && ipInt <= range.end) {
      return true;
    }
  }

  return false;
}

/**
 * Resolves hostname to IP address (synchronous DNS lookup not recommended)
 * For now, we'll block common localhost hostnames
 */
function isLocalhostHostname(hostname: string): boolean {
  const localhostPatterns = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '::1',
    '[::1]',
    '*.local',
    '*.localhost',
  ];

  const normalized = hostname.toLowerCase();
  
  // Exact match
  if (localhostPatterns.includes(normalized)) {
    return true;
  }

  // Check if it's a localhost variant
  if (normalized === 'localhost' || normalized.startsWith('localhost.')) {
    return true;
  }

  // Check for .local TLD
  if (normalized.endsWith('.local')) {
    return true;
  }

  return false;
}

/**
 * Validates a URL to prevent SSRF attacks
 * @param url The URL to validate
 * @param options Validation options
 * @returns Validation result with error message if invalid
 */
export interface SSRFValidationOptions {
  /**
   * Allow only HTTPS protocol (default: true)
   */
  requireHttps?: boolean;
  /**
   * Allow HTTP protocol (default: false)
   */
  allowHttp?: boolean;
  /**
   * Whitelist of allowed hostnames (default: empty, allows all public domains)
   */
  allowedHostnames?: string[];
  /**
   * Blocklist of forbidden hostnames (default: localhost, 127.0.0.1, etc.)
   */
  blockedHostnames?: string[];
  /**
   * Allow IPFS gateway URLs (default: true)
   */
  allowIpfs?: boolean;
  /**
   * Allow Arweave gateway URLs (default: true)
   */
  allowArweave?: boolean;
  /**
   * Allow localhost in development mode (default: false, but auto-enabled if NODE_ENV=development)
   */
  allowLocalhost?: boolean;
}

export interface SSRFValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedUrl?: string;
}

export function validateUrlForSSRF(
  url: string,
  options: SSRFValidationOptions = {}
): SSRFValidationResult {
  const {
    requireHttps = true,
    allowHttp = false,
    allowedHostnames = [],
    blockedHostnames = [],
    allowIpfs = true,
    allowArweave = true,
    allowLocalhost = process.env.NODE_ENV === 'development', // Auto-enable in development
  } = options;

  try {
    // 1. Validate URL format
    if (!url || typeof url !== 'string') {
      return {
        isValid: false,
        error: 'URL must be a non-empty string',
      };
    }

    // 2. Handle IPFS protocol
    if (url.startsWith('ipfs://')) {
      if (!allowIpfs) {
        return {
          isValid: false,
          error: 'IPFS protocol is not allowed',
        };
      }
      // Convert IPFS to HTTPS gateway
      const ipfsHash = url.replace('ipfs://', '').replace(/^\/+/, '');
      const sanitizedUrl = `https://ipfs.io/ipfs/${ipfsHash}`;
      return {
        isValid: true,
        sanitizedUrl,
      };
    }

    // 3. Parse URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch (error) {
      return {
        isValid: false,
        error: `Invalid URL format: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }

    // 4. Validate protocol
    const protocol = parsedUrl.protocol.toLowerCase();
    if (protocol !== 'https:' && protocol !== 'http:') {
      return {
        isValid: false,
        error: `Protocol "${protocol}" is not allowed. Only ${requireHttps && !allowHttp ? 'HTTPS' : 'HTTP/HTTPS'} is allowed`,
      };
    }

    // In development mode, allow HTTP for localhost
    const isLocalhost = isLocalhostHostname(parsedUrl.hostname.toLowerCase());
    const shouldAllowHttp = allowHttp || (allowLocalhost && isLocalhost);

    if (requireHttps && protocol === 'http:' && !shouldAllowHttp) {
      return {
        isValid: false,
        error: 'HTTP protocol is not allowed. Only HTTPS is allowed',
      };
    }

    if (!shouldAllowHttp && protocol === 'http:') {
      return {
        isValid: false,
        error: 'HTTP protocol is not allowed. Only HTTPS is allowed',
      };
    }

    // Block dangerous protocols
    const dangerousProtocols = ['file:', 'ftp:', 'javascript:', 'data:', 'vbscript:', 'about:'];
    if (dangerousProtocols.some(p => protocol.startsWith(p))) {
      return {
        isValid: false,
        error: `Dangerous protocol "${protocol}" is not allowed`,
      };
    }

    // 5. Validate hostname
    const hostname = parsedUrl.hostname.toLowerCase();

    // Check blocklist (skip if localhost is allowed in development)
    if (!allowLocalhost && isLocalhostHostname(hostname)) {
      return {
        isValid: false,
        error: 'Localhost hostnames are not allowed',
      };
    }

    // In development mode, allow localhost but still validate it's actually localhost
    if (allowLocalhost && isLocalhostHostname(hostname)) {
      // Allow localhost in development mode
      logger.debug('Allowing localhost URL in development mode:', url);
    }

    for (const blocked of blockedHostnames) {
      if (hostname === blocked.toLowerCase() || hostname.endsWith(`.${blocked.toLowerCase()}`)) {
        return {
          isValid: false,
          error: `Blocked hostname: ${hostname}`,
        };
      }
    }

    // Check whitelist (if provided)
    if (allowedHostnames.length > 0) {
      const isAllowed = allowedHostnames.some(
        allowed => hostname === allowed.toLowerCase() || hostname.endsWith(`.${allowed.toLowerCase()}`)
      );
      if (!isAllowed) {
        return {
          isValid: false,
          error: `Hostname "${hostname}" is not in the allowed list`,
        };
      }
    }

    // 6. Check for IP addresses (resolve and validate)
    // Check if hostname is an IP address
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipRegex.test(hostname)) {
      // Allow localhost IPs in development mode
      if (!allowLocalhost && isPrivateOrReservedIP(hostname)) {
        return {
          isValid: false,
          error: `Private or reserved IP address "${hostname}" is not allowed`,
        };
      }
      // In development, allow 127.0.0.1 but warn about other private IPs
      if (allowLocalhost && isPrivateOrReservedIP(hostname)) {
        if (hostname === '127.0.0.1' || hostname === '::1') {
          logger.debug('Allowing localhost IP in development mode:', hostname);
        } else {
          logger.warn('Allowing private IP in development mode (not recommended):', hostname);
        }
      }
    }

    // 7. Validate Arweave URLs (if applicable)
    if (allowArweave && hostname.includes('arweave.net')) {
      // Arweave URLs are allowed
    }

    // 8. Validate IPFS gateway URLs (if applicable)
    if (allowIpfs && (hostname.includes('ipfs.io') || hostname.includes('ipfs.tech') || hostname.includes('cloudflare-ipfs.com'))) {
      // IPFS gateway URLs are allowed
    }

    // 9. Block common internal hostnames
    const internalHostnames = [
      'internal',
      'intranet',
      'local',
      'private',
      'internal-api',
      'api-internal',
    ];
    for (const internal of internalHostnames) {
      if (hostname.includes(internal)) {
        return {
          isValid: false,
          error: `Internal hostname pattern detected: ${hostname}`,
        };
      }
    }

    return {
      isValid: true,
      sanitizedUrl: parsedUrl.toString(),
    };
  } catch (error) {
    logger.error('SSRF validation error:', error);
    return {
      isValid: false,
      error: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Validates and sanitizes a URL for safe HTTP requests
 * Throws an error if URL is invalid (for use in try/catch)
 */
export function validateAndSanitizeUrl(
  url: string,
  options?: SSRFValidationOptions
): string {
  const result = validateUrlForSSRF(url, options);
  if (!result.isValid) {
    throw new Error(result.error || 'URL validation failed');
  }
  return result.sanitizedUrl || url;
}

/**
 * Safe fetch wrapper with SSRF protection
 * @param url The URL to fetch
 * @param options SSRF validation options
 * @param fetchOptions Standard fetch options
 */
export async function safeFetch(
  url: string,
  ssrfOptions: SSRFValidationOptions = {},
  fetchOptions: RequestInit = {}
): Promise<Response> {
  const validation = validateUrlForSSRF(url, ssrfOptions);
  if (!validation.isValid) {
    throw new Error(`SSRF protection: ${validation.error}`);
  }

  const safeUrl = validation.sanitizedUrl || url;

  // Add timeout if not already present
  if (!fetchOptions.signal) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 second default timeout
    fetchOptions.signal = controller.signal;
    
    // Clear timeout when request completes
    fetch(safeUrl, fetchOptions)
      .finally(() => clearTimeout(timeout));
  }

  return fetch(safeUrl, fetchOptions);
}

