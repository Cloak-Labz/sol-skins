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
  Plus,
  Upload,
  Settings,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, Keypair } from "@solana/web3.js";
import {
  getProgramFromWallet,
  initializeProgram,
  publishBatch,
  fetchGlobalState,
  fetchBatch,
  getUSDCMint,
  type BatchAccount,
} from "@/lib/solana";
import { WalrusClient, WalrusUploadResult } from "@/lib/walrus-client";
import { UmiCandyMachineClient, UmiDeployedCandyMachine, UmiCandyMachineConfig } from "@/lib/umi-candy-machine-client";

interface BatchWithId extends BatchAccount {
  id: number;
}

interface Pack {
  id: string;
  name: string;
  description: string;
  candyMachine?: PublicKey;
  candyGuard?: PublicKey;
  deployedAt?: Date;
  status: 'draft' | 'deploying' | 'deployed' | 'active' | 'completed';
  skins: PackSkin[];
}

interface PackSkin {
  id: string;
  name: string;
  weapon: string;
  rarity: string;
  imageUrl: string;
  metadataUri?: string;
}

export default function AdminPage() {
  const { connected, publicKey } = useWallet();
  const wallet = useWallet();
  const { connection } = useConnection();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [batches, setBatches] = useState<BatchWithId[]>([]);

  // Pack management
  const [packs, setPacks] = useState<Pack[]>([]);
  const [selectedPack, setSelectedPack] = useState<Pack | null>(null);
  const [creatingPack, setCreatingPack] = useState(false);
  const [deployingPack, setDeployingPack] = useState(false);

  // Pack creation form
  const [packName, setPackName] = useState("");
  const [packDescription, setPackDescription] = useState("");
  const [packSkins, setPackSkins] = useState<PackSkin[]>([]);

  // Legacy batch form (for backward compatibility)
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

  // Clients
  const [walrusClient] = useState(() => new WalrusClient(true)); // Testnet for now
  const [umiCandyMachineClient, setUmiCandyMachineClient] = useState<UmiCandyMachineClient | null>(null);

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

  // Initialize clients and load program state
  useEffect(() => {
    if (connected && isAdmin && wallet.publicKey) {
      // Initialize Umi Candy Machine client
      setUmiCandyMachineClient(new UmiCandyMachineClient(connection, wallet));
      
      loadProgramState();
      loadPacks();

      // Auto-load candy machine from cache if available
      const stored = localStorage.getItem("candy_machine_pubkey");
      if (stored) {
        setCandyMachine(stored);
      }

      // Load minted NFTs from backend DB
      void loadInventory();
    }
  }, [connected, isAdmin, connection, wallet]);

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

        // Load all batches (scan up to max 50 to find all existing batches)
        const loadedBatches: BatchWithId[] = [];
        const maxBatchToCheck = Math.max(Number(globalState.currentBatch || 0) + 10, 50);

        for (let i = 0; i <= maxBatchToCheck; i++) {
          try {
            const batch = await fetchBatch(program, i);
            if (batch) {
              loadedBatches.push({ ...batch, id: i });
            }
          } catch (error) {
            // Batch doesn't exist, continue scanning
          }
        }

        // Sort by batch ID
        loadedBatches.sort((a, b) => a.id - b.id);
        setBatches(loadedBatches);

        if (loadedBatches.length > 0) {
          console.log(`✅ Loaded ${loadedBatches.length} batches`);
        }
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

      // Generate new keypair (like in the test)
      const { Keypair } = await import("@solana/web3.js");
      const candyMachineKeypair = Keypair.generate();
      const pubkey = candyMachineKeypair.publicKey.toBase58();


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

  // Pack Management Functions
  const loadPacks = async () => {
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
      const res = await fetch(`${base}/api/v1/admin/packs`);
      const json = await res.json();
      if (json?.success) {
        setPacks(json.data || []);
      }
    } catch (error) {
      console.error("Failed to load packs:", error);
      // Don't show error toast for packs - they might not exist yet
    }
  };

  const createPack = async () => {
    if (!packName.trim() || !packDescription.trim()) {
      toast.error("Please fill in pack name and description");
      return;
    }

    try {
      setCreatingPack(true);
      toast.loading("Creating pack...", { id: "create-pack" });

      const packId = `pack_${Date.now()}`;
      const newPack: Pack = {
        id: packId,
        name: packName,
        description: packDescription,
        status: 'draft',
        skins: [],
      };

      // Save to backend
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
      const res = await fetch(`${base}/api/v1/admin/packs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPack),
      });

      if (res.ok) {
        setPacks(prev => [...prev, newPack]);
        setSelectedPack(newPack);
        setPackName("");
        setPackDescription("");
        toast.success("Pack created successfully!", { id: "create-pack" });
      } else {
        throw new Error("Failed to create pack");
      }
    } catch (error) {
      console.error("Failed to create pack:", error);
      toast.error("Failed to create pack", { id: "create-pack" });
    } finally {
      setCreatingPack(false);
    }
  };

  const deployPack = async (pack: Pack) => {
    if (!umiCandyMachineClient || !wallet.publicKey) {
      toast.error("Umi Candy Machine client not initialized");
      return;
    }

    try {
      setDeployingPack(true);
      toast.loading(`Deploying pack "${pack.name}"...`, { id: "deploy-pack" });

      // Step 1: Upload metadata to Walrus
      console.log("📤 Uploading metadata to Walrus...");
      const metadataArray = pack.skins.map((skin, index) => 
        walrusClient.createSkinMetadata({
          name: skin.name,
          weapon: skin.weapon,
          rarity: skin.rarity,
          imageUrl: skin.imageUrl,
          packId: pack.id,
          index: index + 1,
          totalItems: pack.skins.length,
        })
      );

      const metadataUris = await walrusClient.uploadJsonBatch(metadataArray);
      console.log(`✅ Uploaded ${metadataUris.length} metadata files to Walrus`);

      // Step 2: Create collection metadata URI (placeholder)
      const collectionUri = metadataUris[0] || "https://example.com/collection.json";

      // Step 3: Deploy Candy Machine using official Umi
      console.log("🚀 Deploying Candy Machine using Umi...");
      const candyMachineConfig = umiCandyMachineClient.createDefaultConfig(
        pack.id,
        `${pack.name} Collection`,
        collectionUri,
        pack.skins.length,
        wallet.publicKey
      );

      const deployedCM = await umiCandyMachineClient.createCandyMachineForPack(candyMachineConfig);

      // Step 4: Add items to Candy Machine
      console.log("📝 Adding items to Candy Machine...");
      const items = pack.skins.map((skin, index) => ({
        name: `${pack.id} #${index + 1}`,
        uri: metadataUris[index],
      }));

      await umiCandyMachineClient.addItemsToCandyMachine(deployedCM.candyMachine, items);

      // Step 5: Update pack status
      const updatedPack: Pack = {
        ...pack,
        candyMachine: deployedCM.candyMachine,
        candyGuard: deployedCM.candyGuard,
        deployedAt: new Date(),
        status: 'deployed',
        skins: pack.skins.map((skin, index) => ({
          ...skin,
          metadataUri: metadataUris[index],
        })),
      };

      // Save to backend
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
      await fetch(`${base}/api/v1/admin/packs/${pack.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPack),
      });

      setPacks(prev => prev.map(p => p.id === pack.id ? updatedPack : p));
      setSelectedPack(updatedPack);

      toast.success(`Pack "${pack.name}" deployed successfully!`, { id: "deploy-pack" });
      console.log(`🎉 Pack deployment complete!`);
      console.log(`📦 Candy Machine: ${deployedCM.candyMachine.toBase58()}`);
      console.log(`🛡️ Candy Guard: ${deployedCM.candyGuard.toBase58()}`);
      console.log(`🎨 Collection: ${deployedCM.collectionMint.toBase58()}`);

    } catch (error) {
      console.error("Failed to deploy pack:", error);
      toast.error(`Failed to deploy pack: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: "deploy-pack" });
    } finally {
      setDeployingPack(false);
    }
  };

  const addSkinToPack = (skin: any) => {
    if (!selectedPack) return;

    const packSkin: PackSkin = {
      id: skin.id,
      name: skin.name,
      weapon: skin.name.split(' ')[0] || 'Unknown',
      rarity: skin.rarity || 'Common',
      imageUrl: skin.imageUrl || '',
      metadataUri: skin.metadataUri,
    };

    const updatedPack = {
      ...selectedPack,
      skins: [...selectedPack.skins, packSkin],
    };

    setSelectedPack(updatedPack);
    setPacks(prev => prev.map(p => p.id === selectedPack.id ? updatedPack : p));
  };

  const removeSkinFromPack = (skinId: string) => {
    if (!selectedPack) return;

    const updatedPack = {
      ...selectedPack,
      skins: selectedPack.skins.filter(s => s.id !== skinId),
    };

    setSelectedPack(updatedPack);
    setPacks(prev => prev.map(p => p.id === selectedPack.id ? updatedPack : p));
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

            {/* Pack Management */}
            {initialized && (
              <Card className="p-6 bg-zinc-950 border-zinc-800">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Package className="w-5 h-5 text-[#E99500]" />
                    Pack Management
                  </h2>
                  <Button
                    onClick={() => setSelectedPack(null)}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    New Pack
                  </Button>
                </div>

                {!selectedPack ? (
                  <div className="space-y-4">
                    {/* Create New Pack */}
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="packName" className="text-white">
                          Pack Name
                        </Label>
                        <Input
                          id="packName"
                          placeholder="e.g., CS:GO Weapon Case"
                          value={packName}
                          onChange={(e) => setPackName(e.target.value)}
                          className="bg-zinc-900 border-zinc-700 text-white"
                        />
                      </div>
                      <div>
                        <Label htmlFor="packDescription" className="text-white">
                          Description
                        </Label>
                        <Textarea
                          id="packDescription"
                          placeholder="Describe this pack..."
                          value={packDescription}
                          onChange={(e) => setPackDescription(e.target.value)}
                          className="bg-zinc-900 border-zinc-700 text-white"
                          rows={3}
                        />
                      </div>
                      <Button
                        onClick={createPack}
                        disabled={creatingPack || !packName.trim() || !packDescription.trim()}
                        className="w-full bg-[#E99500] hover:bg-[#d18500] text-black font-semibold"
                      >
                        {creatingPack ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-2" />
                            Create Pack
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Existing Packs */}
                    {packs.length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-lg font-semibold text-white mb-3">Existing Packs</h3>
                        <div className="space-y-2">
                          {packs.map((pack) => (
                            <div
                              key={pack.id}
                              className="p-3 bg-zinc-900 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer"
                              onClick={() => setSelectedPack(pack)}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-white font-medium">{pack.name}</p>
                                  <p className="text-xs text-zinc-400">{pack.skins.length} skins • {pack.status}</p>
                                </div>
                                <div className="text-right">
                                  <div className="text-xs text-zinc-500">
                                    {pack.deployedAt ? new Date(pack.deployedAt).toLocaleDateString() : 'Draft'}
                                  </div>
                                  {pack.candyMachine && (
                                    <div className="text-xs text-zinc-600 font-mono">
                                      {pack.candyMachine.toBase58().slice(0, 8)}...
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Pack Details */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{selectedPack.name}</h3>
                        <p className="text-sm text-zinc-400">{selectedPack.description}</p>
                        <p className="text-xs text-zinc-500 mt-1">
                          Status: <span className="capitalize">{selectedPack.status}</span>
                          {selectedPack.candyMachine && (
                            <span className="ml-2">
                              • CM: {selectedPack.candyMachine.toBase58().slice(0, 8)}...
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => setSelectedPack(null)}
                          variant="outline"
                          size="sm"
                        >
                          Back
                        </Button>
                        {selectedPack.status === 'draft' && selectedPack.skins.length > 0 && (
                          <Button
                            onClick={() => deployPack(selectedPack)}
                            disabled={deployingPack}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            {deployingPack ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Deploying...
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4 mr-2" />
                                Deploy Pack
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Pack Skins */}
                    <div>
                      <h4 className="text-md font-semibold text-white mb-3">
                        Pack Skins ({selectedPack.skins.length})
                      </h4>
                      {selectedPack.skins.length === 0 ? (
                        <div className="text-center py-8 bg-zinc-900 rounded-lg border border-zinc-800">
                          <Package className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                          <p className="text-zinc-400 text-sm">No skins added yet</p>
                          <p className="text-zinc-500 text-xs mt-1">Add skins from inventory below</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {selectedPack.skins.map((skin) => (
                            <div
                              key={skin.id}
                              className="p-3 bg-zinc-900 rounded-lg border border-zinc-800"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded bg-zinc-800 overflow-hidden flex-shrink-0">
                                  {skin.imageUrl ? (
                                    <img
                                      src={skin.imageUrl}
                                      alt={skin.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : null}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-white text-sm font-medium truncate">
                                    {skin.name}
                                  </p>
                                  <p className="text-zinc-500 text-xs">
                                    {skin.weapon} • {skin.rarity}
                                  </p>
                                </div>
                                <Button
                                  onClick={() => removeSkinFromPack(skin.id)}
                                  variant="outline"
                                  size="sm"
                                  className="text-red-400 hover:text-red-300 hover:border-red-400"
                                >
                                  Remove
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Add Skins from Inventory */}
                    <div>
                      <h4 className="text-md font-semibold text-white mb-3">Add Skins from Inventory</h4>
                      <div className="grid gap-2 max-h-60 overflow-auto pr-2">
                        {loadingInventory ? (
                          <p className="text-zinc-400 text-sm">Loading inventory...</p>
                        ) : inventory.length === 0 ? (
                          <p className="text-zinc-400 text-sm">No NFTs found in inventory</p>
                        ) : (
                          inventory
                            .filter(item => !selectedPack.skins.some(skin => skin.id === item.id))
                            .map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center gap-3 p-2 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
                              >
                                <div className="w-8 h-8 rounded bg-zinc-800 overflow-hidden flex-shrink-0">
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
                                  <p className="text-zinc-500 text-xs">
                                    {item.rarity || 'Unknown'}
                                  </p>
                                </div>
                                <Button
                                  onClick={() => addSkinToPack(item)}
                                  size="sm"
                                  className="bg-[#E99500] hover:bg-[#d18500] text-black"
                                >
                                  Add
                                </Button>
                              </div>
                            ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* Legacy Batch Management (for backward compatibility) */}
            {initialized && (
              <Card className="p-6 bg-zinc-950 border-zinc-800">
                <h2 className="text-xl font-bold text-white mb-4">
                  Legacy Batch Management
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
            {initialized && (
              <Card className="p-6 bg-zinc-950 border-zinc-800">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">
                    Published Batches {batches.length > 0 && `(${batches.length})`}
                  </h2>
                  <Button
                    onClick={loadProgramState}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    Refresh
                  </Button>
                </div>

                {batches.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                    <p className="text-zinc-400 text-sm font-medium">No batches published yet</p>
                    <p className="text-zinc-600 text-xs mt-1">Publish your first batch using the form above</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {batches.map((batch) => (
                      <div
                        key={batch.id}
                        className="p-4 bg-zinc-900 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <Package className="w-5 h-5 text-[#E99500] mt-0.5" />
                            <div>
                              <p className="text-white font-semibold">
                                Batch #{batch.id}
                              </p>
                              <p className="text-xs text-zinc-400 mt-1">
                                {Number(batch.totalItems)} NFTs in pool
                              </p>
                              <p className="text-xs text-zinc-400">
                                {Number(batch.boxesMinted)} boxes minted • {Number(batch.boxesOpened)} opened
                              </p>
                              <p className="text-xs text-zinc-500 mt-2 font-mono">
                                Candy Machine: {batch.candyMachine.toBase58().slice(0, 8)}...
                                {batch.candyMachine.toBase58().slice(-8)}
                              </p>
                              {batch.metadataUris && batch.metadataUris.length > 0 && (
                                <details className="mt-2">
                                  <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-400">
                                    View {batch.metadataUris.length} Metadata URIs
                                  </summary>
                                  <div className="mt-2 space-y-1 pl-4 border-l border-zinc-700">
                                    {batch.metadataUris.slice(0, 5).map((uri, idx) => (
                                      <p key={idx} className="text-xs text-zinc-600 font-mono truncate">
                                        {idx + 1}. {uri}
                                      </p>
                                    ))}
                                    {batch.metadataUris.length > 5 && (
                                      <p className="text-xs text-zinc-600">
                                        ... and {batch.metadataUris.length - 5} more
                                      </p>
                                    )}
                                  </div>
                                </details>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-zinc-500">
                              {new Date(Number(batch.snapshotTime) * 1000).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
