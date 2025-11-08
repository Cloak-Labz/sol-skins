module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__/e2e'],
  testMatch: ['**/*.e2e.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  setupFilesAfterEnv: ['<rootDir>/__tests__/e2e-setup.ts'],
  testTimeout: 60000, // E2E tests may take longer
  verbose: true,
  maxWorkers: 1, // Run E2E tests sequentially to avoid database conflicts
  forceExit: true, // Force exit after tests complete (helps with async operations)
};

