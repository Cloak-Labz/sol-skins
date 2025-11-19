import { useEffect, useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";

const USDC_MINT_ADDRESS = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"; // Devnet USDC

export function useUsdcBalance() {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!connected || !publicKey || !connection) {
      setBalance(null);
      setError(null);
      return;
    }

    let cancelled = false;

    const fetchBalance = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const usdcMint = new PublicKey(USDC_MINT_ADDRESS);
        const userUsdcAta = await getAssociatedTokenAddress(usdcMint, publicKey);

        try {
          const balanceInfo = await connection.getTokenAccountBalance(userUsdcAta);
          
          if (cancelled) return;

          const balanceMicroUsdc = BigInt(balanceInfo.value.amount);
          const balanceUsdc = Number(balanceMicroUsdc) / 1_000_000;

          setBalance(balanceUsdc);
        } catch (err: any) {
          // Token account doesn't exist yet - balance is 0
          if (err?.message?.includes('Invalid param') || err?.message?.includes('not found')) {
            setBalance(0);
            return;
          }
          throw err;
        }
      } catch (err: any) {
        if (cancelled) return;
        console.error("Failed to fetch USDC balance:", err);
        setError(err.message || "Failed to fetch balance");
        setBalance(null);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchBalance();

    // Refresh balance every 10 seconds
    const interval = setInterval(() => {
      if (!cancelled) {
        fetchBalance();
      }
    }, 10000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [connected, publicKey, connection]);

  return { balance, isLoading, error };
}

