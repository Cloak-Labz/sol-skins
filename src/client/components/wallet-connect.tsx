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
    if (connected && publicKey && !user && !isLoading && !connectingRef.current) {
      const walletAddress = publicKey.toString();
      console.log('Wallet connected, connecting to backend:', walletAddress);
      
      connectingRef.current = true;
      
      // Connect immediately without delay
      connectWallet(walletAddress)
        .then(() => {
          console.log('Wallet connected successfully to backend');
          toast.success('Wallet connected!');
        })
        .catch((error) => {
          console.error('Failed to connect wallet to backend:', error);
          toast.error('Failed to connect wallet');
        })
        .finally(() => {
          connectingRef.current = false;
        });
    }
  }, [connected, publicKey, user]);

  // Handle wallet disconnection
  const handleDisconnect = async () => {
    try {
      // First disconnect the wallet adapter to stop auto-connect effect
      await walletDisconnect();
      // Then disconnect from backend session
      await disconnectWallet();
      toast.success('Wallet disconnected');
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
      toast.error('Failed to disconnect wallet');
    }
  };

  if (connected && publicKey) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          className="bg-card border-border text-foreground hover:bg-muted"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Wallet className="w-4 h-4 mr-2" />
          )}
          {user?.username || `${publicKey.toString().slice(0, 4)}...${publicKey.toString().slice(-4)}`}
        </Button>
        <Link href="/app-dashboard/profile">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </Link>
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
    <WalletMultiButton className="!bg-primary hover:!bg-primary/90 !text-primary-foreground wallet-button"/>
  );
}
