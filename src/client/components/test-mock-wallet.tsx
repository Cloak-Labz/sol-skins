"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { WalletStatus } from "./wallet-status";
import { handleWalletError, handleTransactionError } from "@/lib/wallet/error-handler";
import { toast } from "react-hot-toast";
import { mockSolanaWalletService } from "@/lib/mocks/wallet";
import { MOCK_CONFIG } from "@/lib/config/mock";

export function TestMockWallet() {
  const { connected, publicKey } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  // Test sending SOL
  const handleSendSol = async () => {
    if (!connected) {
      toast.error("Please connect your wallet first");
      return;
    }

    setIsLoading(true);
    try {
      const result = await mockSolanaWalletService.sendSol(
        "5iF1vyxpqeYqWL4fKhSnFyFw5VzBTjRqDEpkiFta3uEm",
        0.1
      );
      setLastResult(result);
      toast.success(`Transaction sent: ${result.signature.slice(0, 8)}...`);
    } catch (error) {
      handleTransactionError(error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  // Test opening a loot box
  const handleOpenBox = async () => {
    if (!connected) {
      toast.error("Please connect your wallet first");
      return;
    }

    setIsLoading(true);
    try {
      const result = await mockSolanaWalletService.createAndOpenBox(1, 0.5);
      setLastResult(result);
      toast.success(`Box opened successfully!`);
    } catch (error) {
      handleTransactionError(error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  // Test getting NFTs
  const handleGetNFTs = async () => {
    if (!connected) {
      toast.error("Please connect your wallet first");
      return;
    }

    setIsLoading(true);
    try {
      const nfts = await mockSolanaWalletService.getUserNFTs();
      setLastResult(nfts);
      toast.success(`Found ${nfts.length} NFTs`);
    } catch (error) {
      handleWalletError(error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  // Test signing a message
  const handleSignMessage = async () => {
    if (!connected) {
      toast.error("Please connect your wallet first");
      return;
    }

    setIsLoading(true);
    try {
      const message = "Sign this message to authenticate with our service";
      const result = await mockSolanaWalletService.signMessage(message);
      setLastResult(result);
      toast.success("Message signed successfully");
    } catch (error) {
      handleWalletError(error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  // Force an error for testing
  const handleForceError = async () => {
    setIsLoading(true);
    try {
      // Try to send more SOL than available
      await mockSolanaWalletService.sendSol(
        "5iF1vyxpqeYqWL4fKhSnFyFw5VzBTjRqDEpkiFta3uEm",
        100 // Much more than the mock balance
      );
    } catch (error) {
      handleTransactionError(error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Mock Wallet Testing</span>
          <WalletStatus />
        </CardTitle>
        <CardDescription>
          Test Solana wallet interactions using mock services
          {!MOCK_CONFIG?.ENABLE_MOCK && (
            <div className="mt-2 text-yellow-500">
              Warning: Mock mode is disabled. Enable MOCK_CONFIG.ENABLE_MOCK in config to use these features.
            </div>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <WalletMultiButton />
            <Button 
              onClick={handleSendSol} 
              disabled={!connected || isLoading}
              variant="outline"
            >
              Send 0.1 SOL
            </Button>
            <Button 
              onClick={handleOpenBox} 
              disabled={!connected || isLoading}
              variant="outline"
            >
              Open Loot Box
            </Button>
            <Button 
              onClick={handleGetNFTs} 
              disabled={!connected || isLoading}
              variant="outline"
            >
              Get NFTs
            </Button>
            <Button 
              onClick={handleSignMessage} 
              disabled={!connected || isLoading}
              variant="outline"
            >
              Sign Message
            </Button>
            <Button 
              onClick={handleForceError} 
              disabled={!connected || isLoading}
              variant="destructive"
            >
              Test Error
            </Button>
          </div>

          {isLoading && (
            <div className="text-center py-4">
              <div className="animate-pulse">Processing...</div>
            </div>
          )}

          {lastResult && (
            <div className="mt-4">
              <h3 className="text-sm font-medium mb-2">Last Result:</h3>
              <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded text-xs overflow-auto max-h-40">
                {JSON.stringify(lastResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}