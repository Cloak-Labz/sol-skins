"use client";

import React, { FC, ReactNode, useMemo, useCallback } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork, WalletError } from "@solana/wallet-adapter-base";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";
import "@solana/wallet-adapter-react-ui/styles.css";
import { toast } from "react-hot-toast";

interface SolanaProviderProps {
  children: ReactNode;
}

export const SolanaProvider: FC<SolanaProviderProps> = ({ children }) => {
  // Switch to devnet for testing
  const network = WalletAdapterNetwork.Devnet;

  // Custom RPC endpoint via env or default devnet
  const endpoint = useMemo(
    () => process.env.NEXT_PUBLIC_SOLANA_RPC || clusterApiUrl(network),
    [network]
  );

  // Don't manually add Phantom/Solflare - they're auto-detected as Standard Wallets
  // This prevents the duplicate wallet warning
  const wallets = useMemo(() => [], []);

  // Error handler for wallet errors
  const onError = useCallback((error: WalletError) => {
    console.error("Wallet error:", error);
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);

    // Handle specific error types
    if (error.name === "WalletNotReadyError") {
      toast.error("Wallet not installed. Please install Phantom or Solflare.");
    } else if (error.name === "WalletConnectionError") {
      // More specific handling for connection errors
      if (error.message?.includes("User rejected")) {
        toast.error("Connection rejected.");
      } else if (error.message?.includes("Unexpected error")) {
        // This is a generic error - likely the wallet is locked or network issue
        toast.error("Please unlock your wallet and try again.");
      } else {
        toast.error("Failed to connect. Please refresh and try again.");
      }
    } else if (error.name === "WalletDisconnectedError") {
      // Don't show error on intentional disconnect
      console.log("Wallet disconnected");
    } else if (error.name === "WalletSignTransactionError") {
      toast.error("Transaction signing failed.");
    } else if (error.message?.includes("User rejected")) {
      toast.error("Connection rejected by user.");
    } else {
      // Only show toast for actual errors, not disconnects
      if (!error.message?.includes("disconnect")) {
        toast.error(error.message || "An error occurred with your wallet.");
      }
    }
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={false} onError={onError}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
