import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { useMemo, useState, useCallback } from 'react';
import { PublicKey } from '@solana/web3.js';
import { Program } from '@coral-xyz/anchor';
import {
  getProgramFromWallet,
  getProgram,
  getProvider,
} from '../config/anchor-client';
import {
  fetchGlobalState,
  fetchBatch,
  fetchBoxState,
  fetchUserBoxes,
  GlobalAccount,
  BatchAccount,
  BoxStateAccount,
} from '../accounts/fetch';
import { createBox, CreateBoxResult } from '../instructions/create-box';
import { openBox, waitForVrf, OpenBoxResult } from '../instructions/open-box';
import { initializeProgram, InitializeResult, getUSDCMint } from '../instructions/initialize';

/**
 * Main hook for SkinVault program interactions
 */
export function useSkinVault() {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get program instance
  const program = useMemo(() => {
    if (!wallet) return null;
    try {
      return getProgramFromWallet(wallet, connection);
    } catch (err) {
      console.error('Error creating program:', err);
      return null;
    }
  }, [wallet, connection]);

  // Fetch global state
  const fetchGlobal = useCallback(async (): Promise<GlobalAccount | null> => {
    if (!program) return null;
    setIsLoading(true);
    setError(null);
    try {
      return await fetchGlobalState(program);
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [program]);

  // Fetch batch
  const getBatch = useCallback(
    async (batchId: number): Promise<BatchAccount | null> => {
      if (!program) return null;
      setIsLoading(true);
      setError(null);
      try {
        return await fetchBatch(program, batchId);
      } catch (err: any) {
        setError(err.message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [program]
  );

  // Fetch user's boxes
  const getUserBoxes = useCallback(async (): Promise<BoxStateAccount[]> => {
    if (!program || !wallet) return [];
    setIsLoading(true);
    setError(null);
    try {
      return await fetchUserBoxes(program, wallet.publicKey);
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [program, wallet]);

  // Create box
  const createNewBox = useCallback(
    async (batchId: number): Promise<CreateBoxResult | null> => {
      if (!program || !wallet) {
        setError('Wallet not connected');
        return null;
      }

      setIsLoading(true);
      setError(null);
      try {
        const result = await createBox({
          program,
          batchId,
          owner: wallet.publicKey,
        });
        return result;
      } catch (err: any) {
        setError(err.message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [program, wallet]
  );

  // Open box
  const openUserBox = useCallback(
    async (boxAsset: PublicKey, poolSize: number): Promise<OpenBoxResult | null> => {
      if (!program || !wallet) {
        setError('Wallet not connected');
        return null;
      }

      setIsLoading(true);
      setError(null);
      try {
        const result = await openBox({
          program,
          boxAsset,
          owner: wallet.publicKey,
          poolSize,
        });
        return result;
      } catch (err: any) {
        setError(err.message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [program, wallet]
  );

  // Wait for VRF after opening
  const waitForBoxVrf = useCallback(
    async (boxAsset: PublicKey): Promise<boolean> => {
      if (!program) return false;
      setIsLoading(true);
      setError(null);
      try {
        const fulfilled = await waitForVrf(program, boxAsset);
        if (!fulfilled) {
          setError('VRF timeout - please check back later');
        }
        return fulfilled;
      } catch (err: any) {
        setError(err.message);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [program]
  );

  // Initialize program (admin only)
  const initialize = useCallback(
    async (oraclePubkey: PublicKey, usdcMint?: PublicKey): Promise<InitializeResult | null> => {
      if (!program || !wallet) {
        setError('Wallet not connected');
        return null;
      }

      setIsLoading(true);
      setError(null);
      try {
        // Use provided USDC mint or get default for cluster
        const cluster = (process.env.NEXT_PUBLIC_SOLANA_CLUSTER as 'devnet' | 'testnet' | 'mainnet-beta') || 'devnet';
        const mint = usdcMint || getUSDCMint(cluster);

        const result = await initializeProgram({
          program,
          authority: wallet.publicKey,
          oraclePubkey,
          usdcMint: mint,
        });
        return result;
      } catch (err: any) {
        setError(err.message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [program, wallet]
  );

  return {
    program,
    isConnected: !!wallet,
    isLoading,
    error,
    // Read operations
    fetchGlobal,
    getBatch,
    getUserBoxes,
    // Write operations
    initialize,
    createNewBox,
    openUserBox,
    waitForBoxVrf,
  };
}
