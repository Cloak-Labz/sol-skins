"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Monitor, CheckCircle, XCircle } from "lucide-react";

/**
 * Debug component to show wallet connection info
 * Useful for testing the Mobile Wallet Adapter setup
 * 
 * To use: Import and add to any page where you want to see connection details
 * <WalletDebugInfo />
 */
export function WalletDebugInfo() {
  const { connected, connecting, wallet, publicKey, wallets } = useWallet();

  // Detect if user is on mobile
  const isMobile = typeof window !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  return (
    <Card className="border-yellow-500/40 bg-yellow-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          {isMobile ? <Smartphone className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
          Wallet Debug Info
          {isMobile && <Badge variant="outline" className="text-xs">Mobile</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Status:</span>
          <div className="flex items-center gap-2">
            {connected ? (
              <>
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-green-500">Connected</span>
              </>
            ) : connecting ? (
              <span className="text-yellow-500">Connecting...</span>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-red-500" />
                <span className="text-red-500">Disconnected</span>
              </>
            )}
          </div>
        </div>

        {wallet && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Wallet:</span>
            <span className="font-mono text-xs">{wallet.adapter.name}</span>
          </div>
        )}

        {publicKey && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Address:</span>
            <span className="font-mono text-xs truncate max-w-[200px]">
              {publicKey.toString()}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Available Wallets:</span>
          <span className="font-bold">{wallets.length}</span>
        </div>

        {wallets.length > 0 && (
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">Detected Wallets:</p>
            <div className="flex flex-wrap gap-1">
              {wallets.map((w) => (
                <Badge key={w.adapter.name} variant="secondary" className="text-xs">
                  {w.adapter.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground">
            💡 Mobile Wallet Adapter is {" "}
            <span className="text-green-500 font-semibold">active</span>
          </p>
          {isMobile && (
            <p className="text-xs text-muted-foreground mt-1">
              Click &quot;Connect Wallet&quot; to see mobile wallet options
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

