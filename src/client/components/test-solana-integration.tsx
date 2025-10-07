'use client';

import { useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useSkinVault } from '@/lib/solana/hooks/useSkinVault';
import { Button } from './ui/button';
import { Card } from './ui/card';

/**
 * Test component for Solana integration
 *
 * This component demonstrates the basic usage of the SkinVault program:
 * 1. Fetch global state
 * 2. Create a box
 * 3. Open a box
 * 4. View user's boxes
 */
export function TestSolanaIntegration() {
  const {
    isConnected,
    isLoading,
    error,
    fetchGlobal,
    getBatch,
    getUserBoxes,
    initialize,
    createNewBox,
    openUserBox,
    waitForBoxVrf,
  } = useSkinVault();

  const [globalState, setGlobalState] = useState<any>(null);
  const [userBoxes, setUserBoxes] = useState<any[]>([]);
  const [lastCreatedBox, setLastCreatedBox] = useState<string | null>(null);
  const [oracleInput, setOracleInput] = useState<string>('');

  const handleFetchGlobal = async () => {
    const state = await fetchGlobal();
    setGlobalState(state);
    console.log('Global state:', state);
  };

  const handleInitialize = async () => {
    try {
      // Use wallet's public key as oracle for testing (you can change this)
      const oraclePubkey = oracleInput
        ? new PublicKey(oracleInput)
        : new PublicKey('11111111111111111111111111111111'); // System program as placeholder

      const result = await initialize(oraclePubkey);
      if (result) {
        console.log('Program initialized:', result);
        alert('Program initialized successfully!');
        handleFetchGlobal(); // Refresh global state
      }
    } catch (err) {
      console.error('Error initializing:', err);
    }
  };

  const handleGetUserBoxes = async () => {
    const boxes = await getUserBoxes();
    setUserBoxes(boxes);
    console.log('User boxes:', boxes);
  };

  const handleCreateBox = async () => {
    // Use batch ID 1 for testing (make sure this batch exists on-chain!)
    const result = await createNewBox(1);
    if (result) {
      setLastCreatedBox(result.boxAsset.toBase58());
      console.log('Box created:', result);
      // Refresh user boxes
      handleGetUserBoxes();
    }
  };

  const handleOpenBox = async (boxAssetStr: string) => {
    try {
      const boxAsset = new PublicKey(boxAssetStr);
      // Pool size should match the number of metadata URIs in the batch
      const result = await openUserBox(boxAsset, 10);
      if (result) {
        console.log('Box opened:', result);
        // Wait for VRF
        const fulfilled = await waitForBoxVrf(boxAsset);
        if (fulfilled) {
          console.log('VRF fulfilled! You can now reveal your NFT');
          handleGetUserBoxes(); // Refresh
        }
      }
    } catch (err) {
      console.error('Error opening box:', err);
    }
  };

  if (!isConnected) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">
          Please connect your wallet to test Solana integration
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Solana Integration Test</h2>
          <div className="text-sm">
            <span className="text-muted-foreground">Cluster: </span>
            <code className="bg-muted px-2 py-1 rounded font-mono">
              {process.env.NEXT_PUBLIC_SOLANA_CLUSTER || 'devnet'}
            </code>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded mb-4">
            Error: {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Initialize Program */}
          {!globalState && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
              <h3 className="text-lg font-semibold mb-2 text-yellow-900 dark:text-yellow-100">
                ⚠️ Program Not Initialized
              </h3>
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                The program needs to be initialized before you can create boxes.
              </p>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Oracle Public Key (optional)"
                  value={oracleInput}
                  onChange={(e) => setOracleInput(e.target.value)}
                  className="w-full px-3 py-2 border rounded text-sm"
                />
                <Button onClick={handleInitialize} disabled={isLoading}>
                  Initialize Program
                </Button>
              </div>
            </div>
          )}

          {/* Global State */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Global State</h3>
            <Button onClick={handleFetchGlobal} disabled={isLoading}>
              Fetch Global State
            </Button>
            {globalState && (
              <pre className="mt-2 p-4 bg-muted rounded text-sm overflow-auto">
                {JSON.stringify(globalState, null, 2)}
              </pre>
            )}
          </div>

          {/* Create Box */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Create Box</h3>
            <Button onClick={handleCreateBox} disabled={isLoading}>
              Create Box (Batch #1)
            </Button>
            {lastCreatedBox && (
              <p className="mt-2 text-sm">
                Last created box: <code className="bg-muted px-2 py-1 rounded">{lastCreatedBox}</code>
              </p>
            )}
          </div>

          {/* User Boxes */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Your Boxes</h3>
            <Button onClick={handleGetUserBoxes} disabled={isLoading}>
              Fetch My Boxes
            </Button>
            {userBoxes.length > 0 && (
              <div className="mt-4 space-y-2">
                {userBoxes.map((box, idx) => (
                  <Card key={idx} className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="text-sm">
                        <p><strong>Asset:</strong> {box.asset.toBase58()}</p>
                        <p><strong>Batch:</strong> {box.batchId.toString()}</p>
                        <p><strong>Opened:</strong> {box.opened ? 'Yes' : 'No'}</p>
                        <p><strong>Redeemed:</strong> {box.redeemed ? 'Yes' : 'No'}</p>
                      </div>
                      {!box.opened && (
                        <Button
                          size="sm"
                          onClick={() => handleOpenBox(box.asset.toBase58())}
                          disabled={isLoading}
                        >
                          Open Box
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
            {userBoxes.length === 0 && (
              <p className="mt-2 text-sm text-muted-foreground">No boxes found</p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
