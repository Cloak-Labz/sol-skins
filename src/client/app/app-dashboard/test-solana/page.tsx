'use client';

import { TestSolanaIntegration } from '@/components/test-solana-integration';

export default function TestSolanaPage() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Solana Integration Test</h1>
        <p className="text-muted-foreground mt-2">
          Test SkinVault program interactions
        </p>
      </div>
      <TestSolanaIntegration />
    </div>
  );
}
