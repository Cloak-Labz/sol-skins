"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import {
  WalletMultiButton,
  WalletDisconnectButton,
} from "@solana/wallet-adapter-react-ui";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";

export function WalletConnect() {
  const { connected, publicKey } = useWallet();

  if (connected && publicKey) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          className="bg-card border-border text-foreground hover:bg-muted"
        >
          <Wallet className="w-4 h-4 mr-2" />
          {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
        </Button>
        <WalletDisconnectButton className="!bg-destructive hover:!bg-destructive/90 !text-destructive-foreground" />
      </div>
    );
  }

  return (
    <WalletMultiButton className="!bg-primary hover:!bg-primary/90 !text-primary-foreground" />
  );
}
