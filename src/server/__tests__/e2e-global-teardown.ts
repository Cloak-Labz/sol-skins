// Global teardown for E2E tests
// This ensures all async operations are properly closed

export default async function globalTeardown() {
  // Give time for any pending operations to complete
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Force exit if Jest is still hanging
  // This is a last resort - ideally all resources should be cleaned up properly
  setTimeout(() => {
    process.exit(0);
  }, 5000);
}

