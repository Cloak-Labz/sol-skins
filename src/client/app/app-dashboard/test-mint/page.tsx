"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { mplCandyMachine } from "@metaplex-foundation/mpl-candy-machine";

const CANDY_MACHINE_ID = "5WDRNFjb3KNfNdXyiikUhU7pZWR2Gq9AYZQ8vFcATt1h";
const COLLECTION_MINT = "BBwtV8CDpp4t8KjKMgNuGiz4Hqpsv1fWbayPPLLSFfFh";

export default function TestMintPage() {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [minting, setMinting] = useState(false);
  const [mintedNFT, setMintedNFT] = useState<{
    nftMint: string;
    signature: string;
  } | null>(null);

  const handleMint = async () => {
    if (!wallet.connected || !wallet.publicKey) {
      toast.error("Please connect your wallet first!");
      return;
    }

    try {
      setMinting(true);
      toast.loading("Minting NFT from Candy Machine...", { id: "mint" });

      // Create UMI instance with proper RPC URL
      const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";
      
      console.log("Using RPC URL:", rpcUrl);
      
      const umi = createUmi(rpcUrl);
      umi.use(walletAdapterIdentity(wallet));
      umi.use(mplCandyMachine());

      // Mint using Umi with Candy Guard (mintV2)
      const { fetchCandyMachine, mintV2 } = await import("@metaplex-foundation/mpl-candy-machine");
      const { generateSigner, publicKey, transactionBuilder, some } = await import("@metaplex-foundation/umi");
      
      // Fetch Candy Machine
      const candyMachine = await fetchCandyMachine(umi, publicKey(CANDY_MACHINE_ID));
      
      console.log("Candy Machine fetched:", {
        address: candyMachine.publicKey,
        itemsRedeemed: candyMachine.itemsRedeemed,
        itemsAvailable: candyMachine.data.itemsAvailable,
        mintAuthority: candyMachine.mintAuthority,
      });
      
      // Generate NFT mint signer
      const nftMint = generateSigner(umi);
      
      const { setComputeUnitLimit } = await import("@metaplex-foundation/mpl-toolbox");
      
      console.log("Sending mint transaction...");
      const mintResult = await transactionBuilder()
        .add(setComputeUnitLimit(umi, { units: 800_000 }))
        .add(
          mintV2(umi, {
            candyMachine: candyMachine.publicKey,
            candyGuard: candyMachine.mintAuthority,
            nftMint,
            collectionMint: candyMachine.collectionMint,
            collectionUpdateAuthority: candyMachine.authority,
            mintArgs: {
              solPayment: some({ destination: publicKey(process.env.NEXT_PUBLIC_TREASURY_ADDRESS!) }),
            },
          })
        )
        .sendAndConfirm(umi, { confirm: { commitment: 'confirmed' } });

      console.log("Mint transaction result:", mintResult);

      const result = {
        nftMint: nftMint.publicKey.toString(),
        signature: Buffer.from(mintResult.signature).toString('base64'),
      };

      console.log("✅ Minted NFT:", result);
      console.log("🔗 Check on explorer:", `https://solana.fm/address/${result.nftMint}?cluster=devnet-solana`);
      setMintedNFT(result);

      toast.success("NFT minted successfully!", { id: "mint" });

      toast.loading("Waiting for metadata to propagate...", { id: "reveal" });
      await new Promise(resolve => setTimeout(resolve, 12000));

      toast.loading("Revealing NFT metadata...", { id: "reveal" });
      
      const revealResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/v1/reveal/${result.nftMint}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            boxId: "test-box-1",
          }),
        }
      );

      const revealData = await revealResponse.json();

      if (revealData.success) {
        toast.success(`Revealed: ${revealData.data.skinName} (${revealData.data.skinRarity})!`, { id: "reveal" });
        console.log("✅ NFT Revealed:", revealData.data);
      } else {
        toast.error(revealData.error?.message || "Failed to reveal NFT. Try again in a few seconds.", { id: "reveal" });
      }

    } catch (error: any) {
      console.error("Minting failed:", error);
      toast.error(error.message || "Failed to mint NFT", { id: "mint" });
    } finally {
      setMinting(false);
    }
  };

  const handleBuyback = async () => {
    if (!mintedNFT) {
      toast.error("Mint an NFT first!");
      return;
    }

    if (!wallet.connected || !wallet.publicKey) {
      toast.error("Please connect your wallet!");
      return;
    }

    try {
      toast.loading("Calculating buyback amount...", { id: "buyback" });

      // Calculate buyback amount
      const calcResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/v1/buyback/calculate/${mintedNFT.nftMint}`
      );
      const calcData = await calcResponse.json();

      if (!calcData.success) {
        toast.error("Failed to calculate buyback", { id: "buyback" });
        return;
      }

      toast.success(`Buyback: ${calcData.data.buybackAmount} SOL`, { id: "buyback" });
      console.log("Buyback calculation:", calcData.data);

      toast.loading("Requesting buyback transaction...", { id: "buyback-tx" });
      
      const walletAddress = wallet.publicKey.toBase58();
      console.log("Sending buyback request with wallet:", walletAddress);
      
      const txResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/v1/buyback/request`,
        {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            nftMint: mintedNFT.nftMint,
            walletAddress: walletAddress,
          }),
        }
      );

      const txData = await txResponse.json();

      if (!txData.success) {
        toast.error("Failed to create buyback transaction", { id: "buyback-tx" });
        return;
      }

      const transaction = txData.data.transaction;
      
      if (!wallet.signTransaction) {
        toast.error("Wallet does not support signing transactions.", { id: "buyback-tx" });
        return;
      }

      const { Transaction } = await import("@solana/web3.js");
      const recoveredTransaction = Transaction.from(Buffer.from(transaction, 'base64'));
      
      toast.loading("Please sign the transaction in your wallet...", { id: "buyback-sign" });
      const signedTx = await wallet.signTransaction(recoveredTransaction);
      const rawTransaction = signedTx.serialize();

      toast.loading("Confirming buyback...", { id: "buyback-confirm" });
      const confirmResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/v1/buyback/confirm`,
        {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            nftMint: mintedNFT.nftMint,
            walletAddress: wallet.publicKey.toBase58(),
            signedTransaction: Buffer.from(rawTransaction).toString('base64'),
          }),
        }
      );

      const confirmData = await confirmResponse.json();

      if (confirmData.success) {
        toast.success("NFT successfully bought back!", { id: "buyback-confirm" });
        console.log("Buyback confirmed:", confirmData.data);
        setMintedNFT(null);
      } else {
        toast.error(confirmData.error?.message || "Failed to confirm buyback", { id: "buyback-confirm" });
      }

    } catch (error: any) {
      console.error("Buyback failed:", error);
      toast.error(error.message || "Failed to buyback NFT");
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Test Candy Machine & Buyback</h1>

      <div className="grid gap-6">
        {/* Candy Machine Info */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Candy Machine Details</h2>
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium">Candy Machine ID:</span>{" "}
              <code className="bg-muted px-2 py-1 rounded text-xs">{CANDY_MACHINE_ID}</code>
            </p>
            <p>
              <span className="font-medium">Collection Mint:</span>{" "}
              <code className="bg-muted px-2 py-1 rounded text-xs">{COLLECTION_MINT}</code>
            </p>
            <p>
              <span className="font-medium">Network:</span> Devnet
            </p>
          </div>
        </Card>

        {/* Mint Button */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Step 1: Mint NFT</h2>
          <Button
            onClick={handleMint}
            disabled={minting || !wallet.connected}
            className="w-full"
            size="lg"
          >
            {minting ? "Minting..." : "Mint NFT from Candy Machine"}
          </Button>
          {!wallet.connected && (
            <p className="text-sm text-muted-foreground mt-2">
              Connect your wallet to mint
            </p>
          )}
        </Card>

        {/* Minted NFT Info */}
        {mintedNFT && (
          <Card className="p-6 border-green-500">
            <h2 className="text-xl font-semibold mb-4 text-green-600">✅ NFT Minted!</h2>
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-medium">NFT Mint:</span>{" "}
                <code className="bg-muted px-2 py-1 rounded text-xs">{mintedNFT.nftMint}</code>
              </p>
              <p>
                <span className="font-medium">Transaction:</span>{" "}
                <a
                  href={`https://solana.fm/tx/${mintedNFT.signature}?cluster=devnet-solana`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline text-xs"
                >
                  View on Solana FM
                </a>
              </p>
            </div>
          </Card>
        )}

        {/* Buyback Button */}
        {mintedNFT && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Step 2: Test Buyback</h2>
            <Button
              onClick={handleBuyback}
              variant="outline"
              className="w-full"
              size="lg"
            >
              Calculate & Request Buyback
            </Button>
          </Card>
        )}

        {/* Instructions */}
        <Card className="p-6 bg-muted">
          <h3 className="font-semibold mb-2">How to Test:</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Connect your Solana wallet (make sure you're on Devnet)</li>
            <li>Click "Mint NFT from Candy Machine" - this will mint a hidden NFT</li>
            <li>Wait ~12 seconds for metadata to propagate on-chain</li>
            <li>The backend will automatically reveal the NFT with actual skin metadata</li>
            <li>Once revealed, you can test the buyback calculation</li>
            <li>Check your inventory to see the minted NFT</li>
          </ol>
        </Card>
      </div>
    </div>
  );
}

