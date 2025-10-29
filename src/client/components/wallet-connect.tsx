"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import {
  WalletMultiButton,
  WalletDisconnectButton,
} from "@solana/wallet-adapter-react-ui";
import { Button } from "@/components/ui/button";
import { Wallet, Loader2, Settings } from "lucide-react";
import Link from "next/link";
import { useUser } from "@/lib/contexts/UserContext";
import { useEffect, useRef } from "react";
import { toast } from "react-hot-toast";

export function WalletConnect() {
  const { connected, publicKey, disconnect: walletDisconnect } = useWallet();
  const { user, isLoading, connectWallet, disconnectWallet } = useUser();
  const connectingRef = useRef(false);
  const lastAttemptRef = useRef(0);

  // Auto-connect to backend when wallet connects
  useEffect(() => {
    if (
      connected &&
      publicKey &&
      !user &&
      !isLoading &&
      !connectingRef.current
    ) {
      const walletAddress = publicKey.toString();
      const now = Date.now();

      // Prevent rapid reconnection attempts (debounce)
      if (now - lastAttemptRef.current < 2000) {
        return;
      }

      lastAttemptRef.current = now;
      connectingRef.current = true;

      // Connect to backend with timeout
      const timeout = setTimeout(() => {
        connectingRef.current = false;
      }, 10000); // 10s timeout

      connectWallet(walletAddress)
        .then(() => {
          clearTimeout(timeout);
          toast.success("Wallet connected!");
        })
        .catch((error) => {
          clearTimeout(timeout);
          // Don't show error if it's just a network issue on devnet
          if (
            error.message?.includes("Network") ||
            error.message?.includes("timeout")
          ) {
            toast.error("Network issue - some features may be limited");
          } else {
            toast.error("Failed to connect to backend");
          }
        })
        .finally(() => {
          connectingRef.current = false;
        });
    }
  }, [connected, publicKey, user, isLoading]);

  // Handle wallet disconnection
  const handleDisconnect = async () => {
    try {
      // First disconnect the wallet adapter to stop auto-connect effect
      await walletDisconnect();
      // Then disconnect from backend session
      await disconnectWallet();
      toast.success("Wallet disconnected");
    } catch (error) {
      toast.error("Failed to disconnect wallet");
    }
  };

  if (connected && publicKey) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/app-dashboard/profile">
          <Button
            variant="outline"
            className="bg-card border-border text-foreground hover:bg-muted hover:text-foreground"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Wallet className="w-4 h-4 mr-2" />
            )}
            {user?.username ||
              `${publicKey.toString().slice(0, 4)}...${publicKey
                .toString()
                .slice(-4)}`}
          </Button>
        </Link>
        {/* Settings button removed */}
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDisconnect}
          disabled={isLoading}
        >
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <WalletMultiButton className="!bg-primary hover:!bg-primary/90 !text-primary-foreground wallet-button" />
  );
}
