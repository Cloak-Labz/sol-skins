/**
 * Mock Configuration
 * Set ENABLE_MOCK to true to use mock data instead of real API calls
 */

export const MOCK_CONFIG = {
  // Toggle mock mode on/off
  ENABLE_MOCK: true, // Change to false to use real API

  // Delays to simulate network latency (in ms)
  DELAYS: {
    SHORT: 100,
    MEDIUM: 400,
    LONG: 600,
  },
};

// Helper to simulate async delay
export const mockDelay = (type: keyof typeof MOCK_CONFIG.DELAYS = "MEDIUM") => {
  return new Promise((resolve) =>
    setTimeout(resolve, MOCK_CONFIG.DELAYS[type])
  );
};
