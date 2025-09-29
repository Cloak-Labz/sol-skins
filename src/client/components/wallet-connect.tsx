"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import {
  WalletMultiButton,
  WalletDisconnectButton,
} from "@solana/wallet-adapter-react-ui";
import { Button } from "@/components/ui/button";
import { Wallet, Loader2 } from "lucide-react";
import { useUser } from "@/lib/contexts/UserContext";
import { useEffect, useRef } from "react";
import { toast } from "react-hot-toast";

export function WalletConnect() {
  const { connected, publicKey } = useWallet();
  const { user, isLoading, connectWallet, disconnectWallet } = useUser();
  const connectingRef = useRef(false);
  const lastAttemptRef = useRef(0);

  // Auto-connect to backend when wallet connects
  useEffect(() => {
    if (connected && publicKey && !user && !isLoading && !connectingRef.current) {
      const now = Date.now();
      const timeSinceLastAttempt = now - lastAttemptRef.current;
      
      // Debounce: only attempt connection if at least 2 seconds have passed
      if (timeSinceLastAttempt < 2000) {
        console.log('Debouncing wallet connection attempt...');
        return;
      }
      
      const walletAddress = publicKey.toString();
      console.log('Wallet connected, connecting to backend:', walletAddress);
      
      connectingRef.current = true;
      lastAttemptRef.current = now;
      
      // Add a small delay to prevent rapid reconnections
      const timer = setTimeout(() => {
        connectWallet(walletAddress)
          .then(() => {
            console.log('Wallet connected successfully to backend');
            connectingRef.current = false;
          })
          .catch((error) => {
            console.error('Failed to connect wallet to backend:', error);
            connectingRef.current = false;
          });
      }, 1000); // Increased delay
      
      return () => {
        clearTimeout(timer);
        connectingRef.current = false;
      };
    }
  }, [connected, publicKey, user, isLoading, connectWallet]);

  // Handle wallet disconnection
  const handleDisconnect = async () => {
    try {
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
          {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
        </Button>
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
