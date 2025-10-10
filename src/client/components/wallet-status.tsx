"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
import { Badge } from "./ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { AlertCircle, CheckCircle, WifiOff } from "lucide-react";
import { useUser } from "@/lib/contexts/UserContext";
import { MOCK_CONFIG } from "@/lib/config/mock";

export function WalletStatus() {
  const { connected, publicKey, connecting, disconnecting } = useWallet();
  const { user, isLoading } = useUser();
  const [networkStatus, setNetworkStatus] = useState<"online" | "offline">("online");
  const [balance, setBalance] = useState<number | null>(null);

  // Track network status
  useEffect(() => {
    const handleOnline = () => setNetworkStatus("online");
    const handleOffline = () => setNetworkStatus("offline");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Fetch balance when connected
  useEffect(() => {
    if (connected && publicKey) {
      // If using mock mode, import the mock wallet service
      if (MOCK_CONFIG?.ENABLE_MOCK) {
        import("@/lib/mocks/wallet").then(({ mockSolanaWalletService }) => {
          mockSolanaWalletService.getBalance().then(setBalance);
        });
      } else {
        // Real balance fetching would go here
        // This is just a placeholder
        setBalance(0);
      }
    } else {
      setBalance(null);
    }
  }, [connected, publicKey]);

  if (!connected) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="text-yellow-500 border-yellow-500 flex items-center gap-1">
              <WifiOff className="h-3 w-3" />
              <span>Wallet Disconnected</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Connect your wallet to access all features</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (connecting) {
    return (
      <Badge variant="outline" className="text-blue-500 border-blue-500 flex items-center gap-1">
        <span className="animate-pulse">Connecting...</span>
      </Badge>
    );
  }

  if (disconnecting) {
    return (
      <Badge variant="outline" className="text-orange-500 border-orange-500 flex items-center gap-1">
        <span className="animate-pulse">Disconnecting...</span>
      </Badge>
    );
  }

  if (networkStatus === "offline") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="text-red-500 border-red-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              <span>Network Offline</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Check your internet connection</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="text-green-500 border-green-500 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            <span>Connected</span>
            {balance !== null && (
              <span className="ml-1 text-xs">
                ({balance / 1000000000} SOL)
              </span>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{publicKey?.toString()}</p>
          {user && <p className="text-xs mt-1">User ID: {user.id}</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}