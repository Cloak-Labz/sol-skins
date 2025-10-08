"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Shield,
  Package,
  Loader2,
  CheckCircle,
  AlertCircle,
  Unlock,
  TrendingUp,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import {
  getProgramFromWallet,
  initializeProgram,
  publishBatch,
  fetchGlobalState,
  fetchBatch,
  getUSDCMint,
  type BatchAccount,
} from "@/lib/solana";

interface BatchWithId extends BatchAccount {
  id: number;
}

export default function AdminPage() {
  const { connected, publicKey } = useWallet();
  const wallet = useWallet();
  const { connection } = useConnection();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [batches, setBatches] = useState<BatchWithId[]>([]);

  // Initialize form

  // Publish batch form
  const [batchId, setBatchId] = useState("");
  const [candyMachine, setCandyMachine] = useState("");
  const [metadataUris, setMetadataUris] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [loadingCandyMachine, setLoadingCandyMachine] = useState(false);

  // Inventory selection for batch composition
  const [inventory, setInventory] = useState<
    Array<{
      id: string;
      name: string;
      description?: string;
      imageUrl?: string;
      metadataUri?: string;
      rarity?: string;
    }>
  >([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loadingInventory, setLoadingInventory] = useState(false);

  // Check if connected wallet is admin
  useEffect(() => {
    const adminWallet = process.env.NEXT_PUBLIC_ADMIN_WALLET;
    if (publicKey && adminWallet) {
      const isAdminWallet = publicKey.toBase58() === adminWallet;
      setIsAdmin(isAdminWallet);
      if (!isAdminWallet) {
        toast.error("Access denied: Admin wallet required");
      }
    } else {
      setIsAdmin(false);
    }
  }, [publicKey]);

  // Load program state
  useEffect(() => {
    if (connected && isAdmin && wallet.publicKey) {
      loadProgramState();

      // Auto-load candy machine from cache if available
      const stored = localStorage.getItem("candy_machine_pubkey");
      if (stored) {
        setCandyMachine(stored);
      }

      // Load minted NFTs from backend DB
      void loadInventory();
    }
  }, [connected, isAdmin]);

  const loadProgramState = async () => {
    if (!wallet.publicKey) return;

    try {
      setLoading(true);
      const program = getProgramFromWallet(wallet as any, connection);

      // Check if program is initialized
      const globalState = await fetchGlobalState(program);
      if (globalState) {
        setInitialized(true);

        // Auto-suggest next batch id
        const nextBatch = (Number(globalState.currentBatch || 0) + 1) >>> 0;
        setBatchId(String(nextBatch));

        // Load all batches
        const loadedBatches: BatchWithId[] = [];
        for (let i = 0; i <= Number(globalState.currentBatch || 0); i++) {
          const batch = await fetchBatch(program, i);
          if (batch) {
            loadedBatches.push({ ...batch, id: i });
          }
        }
        setBatches(loadedBatches);
      } else {
        setInitialized(false);
      }
    } catch (error) {
      console.error("Failed to load program state:", error);
      setInitialized(false);
    } finally {
      setLoading(false);
    }
  };

  const handleInitialize = async () => {
    if (!wallet.publicKey) {
      toast.error("Please connect your wallet");
      return;
    }

    try {
      toast.loading("Initializing program...", { id: "init" });
      const program = getProgramFromWallet(wallet as any, connection);

      // Get USDC mint based on cluster
      const cluster =
        (process.env.NEXT_PUBLIC_SOLANA_CLUSTER as any) || "devnet";
      const usdcMint = getUSDCMint(cluster);

      const result = await initializeProgram({
        program,
        authority: wallet.publicKey,
        usdcMint,
      });

      toast.success("Program initialized!", { id: "init" });
      console.log("Initialize result:", result);
      setInitialized(true);
      await loadProgramState();
    } catch (error: any) {
      console.error("Failed to initialize:", error);
      toast.error(error.message || "Failed to initialize program", {
        id: "init",
      });
    }
  };

  const loadCandyMachine = async () => {
    try {
      setLoadingCandyMachine(true);

      // Check localStorage first
      const stored = localStorage.getItem("candy_machine_pubkey");
      if (stored) {
        setCandyMachine(stored);
        toast.success("Candy machine loaded from cache");
        return;
      }

      // Generate new keypair (like in the test)
      const { Keypair } = await import("@solana/web3.js");
      const candyMachineKeypair = Keypair.generate();
      const pubkey = candyMachineKeypair.publicKey.toBase58();

      // Save to localStorage for persistence
      localStorage.setItem("candy_machine_pubkey", pubkey);

      setCandyMachine(pubkey);
      toast.success("New candy machine generated!");
    } catch (error: any) {
      console.error("Failed to generate candy machine:", error);
      toast.error("Failed to generate candy machine");
    } finally {
      setLoadingCandyMachine(false);
    }
  };

  const handlePublishBatch = async () => {
    // Strict batch id validation
    const batchIdNum = Number.parseInt(batchId, 10);
    // Check if batch ID is within safe integer range
    if (!Number.isFinite(batchIdNum) || batchIdNum < 0) {
      toast.error("Invalid Batch ID: must be a non-negative integer");
      return;
    }
    if (batchIdNum > Number.MAX_SAFE_INTEGER) {
      toast.error("Invalid Batch ID: exceeds u64 range");
      return;
    }

    if (!wallet.publicKey || !candyMachine) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      setPublishing(true);
      toast.loading("Publishing batch...", { id: "publish" });
      const program = getProgramFromWallet(wallet as any, connection);

      // Build metadata URIs from selected inventory
      const selected = inventory.filter((i) => selectedIds.has(i.id));
      const uris = selected
        .map((i) => (i.metadataUri || "").trim())
        .filter((u) => u.length > 0);

      if (uris.length === 0) {
        toast.error("Select at least one NFT with metadata URI", {
          id: "publish",
        });
        return;
      }

      // Compute a deterministic non-zero merkle root from URIs (simple SHA-256 of joined URIs)
      const encoder = new TextEncoder();
      const data = encoder.encode(uris.join("\n"));
      // @ts-ignore - web crypto available in browser
      const digest = await crypto.subtle.digest("SHA-256", data);
      const merkleRoot = new Uint8Array(digest);
      // Sanity: ensure not all zeros
      const nonZero = merkleRoot.some((b) => b !== 0);
      if (!nonZero) {
        throw new Error("Computed merkle root is zero - invalid input");
      }

      const result = await publishBatch({
        program,
        authority: wallet.publicKey,
        batchId: batchIdNum,
        candyMachine: new PublicKey(candyMachine),
        metadataUris: uris,
        merkleRoot,
      });

      toast.success(`Batch #${batchIdNum} published!`, { id: "publish" });
      console.log("Publish result:", result);

      // Reset form (next batch)
      setBatchId(String(batchIdNum + 1));
      setMetadataUris("");

      // Reload batches
      await loadProgramState();
    } catch (error: any) {
      console.error("Failed to publish batch:", error);
      toast.error(error.message || "Failed to publish batch", {
        id: "publish",
      });
    } finally {
      setPublishing(false);
    }
  };

  const loadInventory = async () => {
    try {
      setLoadingInventory(true);
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
      const res = await fetch(`${base}/api/v1/admin/inventory`);
      const json = await res.json();
      if (json?.success) {
        setInventory(
          (json.data || []).map((i: any) => ({
            id: i.id,
            name: i.name,
            description: i.description,
            imageUrl: i.imageUrl,
            metadataUri: i.metadataUri,
            rarity: i.rarity,
          }))
        );
      } else {
        toast.error("Failed to load inventory");
      }
    } catch (e) {
      console.error("Failed to load inventory:", e);
      toast.error("Failed to load inventory");
    } finally {
      setLoadingInventory(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Not connected
  if (!connected) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 bg-zinc-950 border-zinc-800 text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">
            Admin Access Required
          </h2>
          <p className="text-zinc-400 mb-6">
            Connect your wallet to access the admin panel
          </p>
        </Card>
      </div>
    );
  }

  // Not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 bg-zinc-950 border-zinc-800 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-zinc-400 mb-2">
            This panel is restricted to admin wallets only.
          </p>
          <p className="text-xs text-zinc-500 font-mono break-all">
            Your wallet: {publicKey?.toBase58()}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Shield className="w-8 h-8 text-[#E99500]" />
          <div>
            <h1 className="text-3xl font-bold text-white">
              SkinVault Admin Panel
            </h1>
            <p className="text-sm text-zinc-400">
              Manage batches and program configuration
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 animate-spin text-[#E99500] mx-auto mb-4" />
            <p className="text-gray-400">Loading program state...</p>
          </div>
        ) : (
          <>
            {/* Initialize Program */}
            {!initialized && (
              <Card className="p-6 bg-zinc-950 border-zinc-800">
                <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-500" />
                  Initialize Program
                </h2>
                <p className="text-sm text-zinc-400 mb-6">
                  This is a one-time action to set up the SkinVault program
                  on-chain.
                </p>
                <div className="space-y-4">
                  <Button
                    onClick={handleInitialize}
                    className="w-full bg-[#E99500] hover:bg-[#d18500] text-black font-semibold"
                  >
                    Initialize Program
                  </Button>
                </div>
              </Card>
            )}

            {/* Program Status */}
            {initialized && (
              <Card className="p-6 bg-zinc-950 border-zinc-800">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <h2 className="text-xl font-bold text-white">
                    Program Initialized
                  </h2>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Total Batches:</span>
                    <span className="text-white">{batches.length}</span>
                  </div>
                </div>
              </Card>
            )}

            {/* Publish Batch */}
            {initialized && (
              <Card className="p-6 bg-zinc-950 border-zinc-800">
                <h2 className="text-xl font-bold text-white mb-4">
                  Publish New Batch
                </h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="batchId" className="text-white">
                      Batch ID
                    </Label>
                    <Input
                      id="batchId"
                      type="number"
                      placeholder="0"
                      value={batchId}
                      onChange={(e) => setBatchId(e.target.value)}
                      className="bg-zinc-900 border-zinc-700 text-white"
                    />
                  </div>

                  <div>
                    <Label htmlFor="candyMachine" className="text-white">
                      Candy Machine (Collection)
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="candyMachine"
                        placeholder="Auto-generated candy machine"
                        value={candyMachine}
                        onChange={(e) => setCandyMachine(e.target.value)}
                        className="bg-zinc-900 border-zinc-700 text-white"
                        readOnly
                      />
                      <Button
                        type="button"
                        onClick={loadCandyMachine}
                        disabled={loadingCandyMachine}
                        className="bg-zinc-700 hover:bg-zinc-600 text-white whitespace-nowrap"
                      >
                        {loadingCandyMachine ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          "Auto-Generate"
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">
                      Click "Auto-Generate" to get a persistent candy machine
                      pubkey
                    </p>
                  </div>

                  <div>
                    <Label className="text-white">Select NFTs for Batch</Label>
                    <div className="mt-2 grid gap-3 max-h-80 overflow-auto pr-2">
                      {loadingInventory ? (
                        <p className="text-zinc-400 text-sm">
                          Loading inventory...
                        </p>
                      ) : inventory.length === 0 ? (
                        <p className="text-zinc-400 text-sm">
                          No NFTs found in inventory
                        </p>
                      ) : (
                        inventory.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900 border border-zinc-800"
                          >
                            <div className="w-12 h-12 rounded bg-zinc-800 overflow-hidden flex-shrink-0">
                              {item.imageUrl ? (
                                <img
                                  src={item.imageUrl}
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : null}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm font-medium truncate">
                                {item.name}
                              </p>
                              <p className="text-zinc-500 text-xs truncate">
                                {item.metadataUri || "No metadata URI"}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-zinc-400">
                                {item.rarity || "-"}
                              </span>
                              <Checkbox
                                checked={selectedIds.has(item.id)}
                                onCheckedChange={() => toggleSelect(item.id)}
                                className="border-zinc-600 data-[state=checked]:bg-[#E99500] data-[state=checked]:border-[#E99500]"
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">
                      Choose minted NFTs to include. We'll derive metadata URIs
                      from selection.
                    </p>
                  </div>

                  <Button
                    onClick={handlePublishBatch}
                    disabled={publishing}
                    className="w-full bg-[#E99500] hover:bg-[#d18500] text-black font-semibold"
                  >
                    {publishing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Publishing...
                      </>
                    ) : (
                      "Publish Batch"
                    )}
                  </Button>
                </div>
              </Card>
            )}

            {/* Published Batches List */}
            {batches.length > 0 && (
              <Card className="p-6 bg-zinc-950 border-zinc-800">
                <h2 className="text-xl font-bold text-white mb-4">
                  Published Batches
                </h2>
                <div className="space-y-3">
                  {batches.map((batch) => (
                    <div
                      key={batch.id}
                      className="p-4 bg-zinc-900 rounded-lg border border-zinc-800"
                    >
                      <div className="flex items-start gap-3">
                        <Package className="w-5 h-5 text-[#E99500]" />
                        <div>
                          <p className="text-white font-semibold">
                            Batch #{batch.id}
                          </p>
                          <p className="text-xs text-zinc-400">
                            {batch.totalItems} items • {batch.boxesMinted}{" "}
                            minted • {batch.boxesOpened} opened
                          </p>
                          <p className="text-xs text-zinc-500 mt-1">
                            Candy Machine:{" "}
                            {batch.candyMachine.toBase58().slice(0, 8)}...
                            {batch.candyMachine.toBase58().slice(-8)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
