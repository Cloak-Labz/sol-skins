"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import {
  WalletMultiButton,
  WalletDisconnectButton,
} from "@solana/wallet-adapter-react-ui";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Wallet, Loader2, Settings, User as UserIcon, LogOut, Copy, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useUser } from "@/lib/contexts/UserContext";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";

export function WalletConnect() {
  const { connected, publicKey, disconnect: walletDisconnect } = useWallet();
  const { user, isLoading, connectWallet, disconnectWallet } = useUser();
  const connectingRef = useRef(false);
  const lastAttemptRef = useRef(0);
  const [copied, setCopied] = useState(false);

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
          // Only show success toast if this is a fresh connection (not auto-reconnect)
          if (!sessionStorage.getItem("wallet_auto_connected")) {
            toast.success("Wallet connected!");
            sessionStorage.setItem("wallet_auto_connected", "true");
          }
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
  }, [connected, publicKey, user, isLoading, connectWallet]);

  // Handle wallet disconnection
  const handleDisconnect = async () => {
    try {
      // Clear auto-connect flag
      sessionStorage.removeItem("wallet_auto_connected");
      // First disconnect the wallet adapter to stop auto-connect effect
      await walletDisconnect();
      // Then disconnect from backend session
      await disconnectWallet();
      toast.success("Wallet disconnected");
    } catch (error) {
      toast.error("Failed to disconnect wallet");
    }
  };

  // Handle copy address
  const handleCopyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toString());
      setCopied(true);
      toast.success("Address copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (connected && publicKey) {
    const displayName = user?.username ||
      `${publicKey.toString().slice(0, 4)}...${publicKey.toString().slice(-4)}`;
    const shortDisplayName = user?.username 
      ? (user.username.slice(0, 8) + (user.username.length > 8 ? '...' : ''))
      : `${publicKey.toString().slice(0, 3)}..${publicKey.toString().slice(-3)}`;

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="bg-card border-border text-foreground hover:bg-muted hover:text-foreground text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2 animate-spin" />
            ) : (
              <Wallet className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
            )}
            <span className="hidden sm:inline">{displayName}</span>
            <span className="sm:hidden">{shortDisplayName}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {user?.username || 'My Wallet'}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {publicKey.toString().slice(0, 8)}...{publicKey.toString().slice(-8)}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleCopyAddress}>
            {copied ? (
              <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
            ) : (
              <Copy className="mr-2 h-4 w-4" />
            )}
            <span>{copied ? 'Copied!' : 'Copy Address'}</span>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/profile" className="cursor-pointer">
              <UserIcon className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={handleDisconnect}
            disabled={isLoading}
            variant="destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Disconnect</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <WalletMultiButton className="!bg-primary hover:!bg-primary/90 !text-primary-foreground wallet-button" />
  );
}
