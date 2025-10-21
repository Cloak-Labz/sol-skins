"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Shield,
  Package,
  Loader2,
  CheckCircle,
  AlertCircle,
  Plus,
  Upload,
  X,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { toast } from "react-hot-toast";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, Keypair } from "@solana/web3.js";
import { simpleCandyMachineService } from "@/lib/services/simpleCandyMachineService";
import {
  getProgramFromWallet,
  initializeProgram,
  fetchGlobalState,
  fetchBatch,
  getUSDCMint,
  type BatchAccount,
} from "@/lib/solana";
import { boxesService, SolanaProgramService } from "@/lib/services";
// import { WalrusClient, WalrusUploadResult } from "@/lib/walrus-client";
import { uploadJsonToIrys, uploadJsonBatchToIrys } from "@/lib/irys-upload";
import {
  UmiCandyMachineClient,
  UmiDeployedCandyMachine,
  UmiCandyMachineConfig,
} from "@/lib/umi-candy-machine-client";

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
  status: "draft" | "deploying" | "deployed" | "active" | "completed";
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

interface CandyMachine {
  id: string;
  name: string;
  symbol: string;
  description: string;
  image: string;
  itemsAvailable: number;
  sellerFeeBasisPoints: number;
  candyMachineAddress: string;
  collectionMint: string;
  collectionUpdateAuthority: string;
  createdAt: Date;
  status: "active" | "inactive" | "completed";
}

export default function AdminPage() {
  const { connected, publicKey } = useWallet();
  const wallet = useWallet();
  const { connection } = useConnection();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [batches, setBatches] = useState<BatchWithId[]>([]);
  const [currentBatchOnChain, setCurrentBatchOnChain] = useState<number | null>(null);

  // Pack management
  const [packs, setPacks] = useState<Pack[]>([]);
  const [selectedPack, setSelectedPack] = useState<Pack | null>(null);
  const [creatingPack, setCreatingPack] = useState(false);
  const [deployingPack, setDeployingPack] = useState(false);
  // Create Box form
  const [creatingBox, setCreatingBox] = useState(false);
  const [boxName, setBoxName] = useState("");
  const [boxDescription, setBoxDescription] = useState("");
  const [boxMetadataUris, setBoxMetadataUris] = useState("");
  const [selectedBoxInventoryIds, setSelectedBoxInventoryIds] = useState<Set<string>>(new Set());
  
  // Publish Batch form
  const [publishing, setPublishing] = useState(false);
  const [batchIdInput, setBatchIdInput] = useState("");
  const isPublishingRef = useRef(false);
  const [candyMachineInput, setCandyMachineInput] = useState("");
  const [snapshotTimeInput, setSnapshotTimeInput] = useState("");
  const [priceSolInput, setPriceSolInput] = useState("1"); // Default to 1 SOL
  const [treasuryAddress, setTreasuryAddress] = useState("");
  const [selectedBoxId, setSelectedBoxId] = useState("");

  // Pack creation form
  const [packName, setPackName] = useState("");
  const [packDescription, setPackDescription] = useState("");

  // Candy Machine management
  const [candyMachines, setCandyMachines] = useState<CandyMachine[]>([]);
  const [loadingCandyMachines, setLoadingCandyMachines] = useState(false);
  const [loadingCandyMachine, setLoadingCandyMachine] = useState(false);

  // Candy Machine form state
  const [showCandyMachineForm, setShowCandyMachineForm] = useState(false);
  const [candyMachineConfig, setCandyMachineConfig] = useState({
    name: "",
    symbol: "",
    description: "",
    image: "",
    itemsAvailable: 1000,
    sellerFeeBasisPoints: 500,
    creatorAddress: "",
    creatorShare: 100,
  });

  // Inventory for pack composition
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
  const [loadingInventory, setLoadingInventory] = useState(false);

  // Clients
  // Walrus client deprecated - using Irys upload helpers instead
  const [umiCandyMachineClient, setUmiCandyMachineClient] =
    useState<UmiCandyMachineClient | null>(null);

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

  // Load Candy Machines on component mount
  useEffect(() => {
    if (isAdmin) {
      fetchCandyMachines();
    }
  }, [isAdmin]);

  // Initialize clients and load program state
  useEffect(() => {
    if (connected && isAdmin && wallet.publicKey) {
      // Initialize Umi Candy Machine client
      setUmiCandyMachineClient(new UmiCandyMachineClient(connection, wallet));

      loadProgramState();
      loadPacks();

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
        try {
          // Save currentBatch if present for auto-batch id
          const cb = Number(globalState.currentBatch || 0);
          if (Number.isFinite(cb)) setCurrentBatchOnChain(cb);
        } catch {}

        // Load all batches (scan up to max 50 to find all existing batches)
        const loadedBatches: BatchWithId[] = [];
        const maxBatchToCheck = Math.max(
          Number(globalState.currentBatch || 0) + 10,
          50
        );

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

  const createCandyMachine = async () => {
    try {
      setLoadingCandyMachine(true);
      toast.loading("Creating Candy Machine...", { id: "candy-machine" });

      // Ensure we're in browser environment
      if (typeof window === "undefined") {
        throw new Error(
          "Candy Machine creation can only be performed in browser environment"
        );
      }

      // Use the statically imported service
      const candyMachineService = simpleCandyMachineService;

      // Set up the wallet for the service
      candyMachineService.setWallet(wallet);

      // Create Candy Machine with form config
      const config = {
        name: candyMachineConfig.name,
        symbol: candyMachineConfig.symbol,
        description: candyMachineConfig.description,
        image: candyMachineConfig.image,
        itemsAvailable: candyMachineConfig.itemsAvailable,
        sellerFeeBasisPoints: candyMachineConfig.sellerFeeBasisPoints,
        creators: [
          {
            address:
              candyMachineConfig.creatorAddress ||
              wallet.publicKey?.toBase58() ||
              "",
            percentageShare: candyMachineConfig.creatorShare,
            verified: true,
          },
        ],
      };

      const result = await candyMachineService.createFullCandyMachine(config);

      // Create new Candy Machine object to save
      const newCandyMachine: CandyMachine = {
        id: result.candyMachine,
        name: config.name,
        symbol: config.symbol,
        description: config.description,
        image: config.image,
        itemsAvailable: config.itemsAvailable,
        sellerFeeBasisPoints: config.sellerFeeBasisPoints,
        candyMachineAddress: result.candyMachine,
        collectionMint: result.collectionMint,
        collectionUpdateAuthority: result.collectionUpdateAuthority,
        createdAt: new Date(),
        status: "active",
      };

      // Save to localStorage
      try {
        const existingCandyMachines = JSON.parse(
          localStorage.getItem("candyMachines") || "[]"
        );
        existingCandyMachines.push(newCandyMachine);
        localStorage.setItem(
          "candyMachines",
          JSON.stringify(existingCandyMachines)
        );
        console.log("💾 Candy Machine saved to localStorage");
      } catch (error) {
        console.error("❌ Failed to save to localStorage:", error);
      }

      // Update state
      setCandyMachines((prev) => [...prev, newCandyMachine]);
      setShowCandyMachineForm(false);

      // Enhanced success notification with Solscan links
      toast.success(
        <div className="space-y-2">
          <div className="font-semibold">
            Candy Machine created successfully! (Devnet)
          </div>
          <div className="text-sm space-y-1">
            <div>
              <strong>Candy Machine:</strong>{" "}
              <a
                href={`https://solscan.io/account/${result.candyMachine}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline"
              >
                View on Solscan
              </a>
            </div>
            <div>
              <strong>Collection:</strong>{" "}
              <a
                href={`https://solscan.io/account/${result.collectionMint}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 hover:text-purple-300 underline"
              >
                View on Solscan
              </a>
            </div>
            <div className="text-xs text-zinc-400">
              Addresses copied to clipboard automatically
            </div>
          </div>
        </div>,
        {
          id: "candy-machine",
          duration: 8000, // Show longer for user to see links
        }
      );

      // Auto-copy main addresses to clipboard
      try {
        await navigator.clipboard.writeText(
          `Candy Machine: ${result.candyMachine}\nCollection: ${result.collectionMint}\nAuthority: ${result.collectionUpdateAuthority}`
        );
        console.log("📋 Addresses copied to clipboard");
      } catch (error) {
        console.warn("⚠️ Failed to copy to clipboard:", error);
      }

      console.log("Candy Machine result:", result);
    } catch (error: any) {
      console.error("Failed to create candy machine:", error);
      toast.error(`Failed to create candy machine: ${error.message}`, {
        id: "candy-machine",
      });
    } finally {
      setLoadingCandyMachine(false);
    }
  };

  const fetchCandyMachines = async () => {
    try {
      setLoadingCandyMachines(true);
      console.log("🔍 Fetching Candy Machines from Sugar cache...");

      // Fetch from Sugar cache file as per Metaplex documentation
      // https://developers.metaplex.com/candy-machine/sugar/cache
      const response = await fetch("/api/candy-machines/cache");

      if (!response.ok) {
        throw new Error(`Failed to fetch cache: ${response.statusText}`);
      }

      const responseData = await response.json();
      console.log("📄 Cache data received:", responseData);

      // Extract the actual cache data from the nested structure
      const cacheData = responseData.cacheData || responseData;
      console.log("📄 Extracted cache data:", cacheData);

      // Parse Sugar cache file structure
      const candyMachines: CandyMachine[] = [];

      console.log("🔍 Debug cache structure:", {
        hasProgram: !!cacheData.program,
        programKeys: cacheData.program ? Object.keys(cacheData.program) : [],
        candyMachine: cacheData.program?.candyMachine,
        fullProgram: cacheData.program
      });

      if (cacheData.program && cacheData.program.candyMachine) {
        // Extract collection information from cache
        const collectionItem = cacheData.items?.["-1"]; // Collection is always at index -1
        const items = Object.values(cacheData.items || {}).filter(
          (item: any) => item.name && item.name !== collectionItem?.name
        );

        const candyMachine: CandyMachine = {
          id: cacheData.program.candyMachine,
          name: collectionItem?.name || "Unknown Collection",
          symbol: "SKIN", // Default symbol
          description: `Collection with ${items.length} items`,
          image: collectionItem?.image_link || "",
          itemsAvailable: items.length,
          sellerFeeBasisPoints: 500, // Default royalty
          candyMachineAddress: cacheData.program.candyMachine,
          collectionMint: cacheData.program.collectionMint,
          collectionUpdateAuthority: cacheData.program.candyMachineCreator,
          createdAt: new Date(), // Cache doesn't store creation date
          status: "active",
        };

        candyMachines.push(candyMachine);
      }

      // If no cache data, try to fetch from local storage or show empty state
      if (candyMachines.length === 0) {
        console.log("📭 No Candy Machines found in cache");

        // Check if we have any locally stored Candy Machines
        const localCandyMachines = localStorage.getItem("candyMachines");
        if (localCandyMachines) {
          const parsed = JSON.parse(localCandyMachines);
          // Convert createdAt strings back to Date objects
          const candyMachinesWithDates = parsed.map((cm: any) => ({
            ...cm,
            createdAt: new Date(cm.createdAt),
          }));
          setCandyMachines(candyMachinesWithDates);
          console.log(
            `✅ Found ${candyMachinesWithDates.length} locally stored Candy Machines`
          );
        } else {
          setCandyMachines([]);
        }
      } else {
        setCandyMachines(candyMachines);
        console.log(
          `✅ Found ${candyMachines.length} Candy Machines from cache`
        );
      }
    } catch (error) {
      console.error("❌ Failed to fetch Candy Machines:", error);

      // Fallback to local storage
      try {
        const localCandyMachines = localStorage.getItem("candyMachines");
        if (localCandyMachines) {
          const parsed = JSON.parse(localCandyMachines);
          // Convert createdAt strings back to Date objects
          const candyMachinesWithDates = parsed.map((cm: any) => ({
            ...cm,
            createdAt: new Date(cm.createdAt),
          }));
          setCandyMachines(candyMachinesWithDates);
          console.log(
            `✅ Using ${candyMachinesWithDates.length} locally stored Candy Machines`
          );
        } else {
          setCandyMachines([]);
        }
      } catch (localError) {
        console.error("❌ Failed to load from local storage:", localError);
        setCandyMachines([]);
        toast.error("Failed to load Candy Machines");
      }
    } finally {
      setLoadingCandyMachines(false);
    }
  };

  const loadInventory = async () => {
    try {
      setLoadingInventory(true);
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
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
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${base}/api/v1/admin/packs`);
      const json = await res.json();
      if (json?.success) {
        // Transform Box data to Pack format
        const packs = (json.data || []).map((box: any) => {
          const metadataUris: string[] = Array.isArray(box.metadataUris) ? box.metadataUris : [];
          const skinsFromMetadata = metadataUris.map((uri, idx) => ({
            id: `${box.id}-${idx}`,
            name: `Item #${idx + 1}`,
            weapon: "",
            rarity: "",
            imageUrl: "",
            metadataUri: uri,
          }));
          return {
            id: box.id,
            name: box.name,
            description: box.description,
            status: box.status || 'active',
            skins: skinsFromMetadata,
            deployedAt: box.createdAt ? new Date(box.createdAt) : undefined,
            candyMachine: box.candyMachine !== '11111111111111111111111111111111' ? box.candyMachine : undefined,
            candyGuard: undefined,
            // Keep original box data for reference
            _boxData: box
          } as Pack & { _boxData: any };
        });
        setPacks(packs);
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
        status: "draft",
        skins: [],
      };

      // Save to backend
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${base}/api/v1/admin/packs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPack),
      });

      if (res.ok) {
        setPacks((prev) => [...prev, newPack]);
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

      // Step 1: Upload metadata to Arweave (Irys)
      console.log("📤 Uploading metadata to Arweave (Irys)...");
      const metadataArray = (pack.skins || []).map((skin, index) => ({
        name: skin.name,
        description: `${skin.weapon || ''}`.trim() || skin.name,
        image: skin.imageUrl,
        attributes: [
          { trait_type: 'weapon', value: skin.weapon || 'Unknown' },
          { trait_type: 'rarity', value: skin.rarity || 'common' },
          { trait_type: 'packId', value: pack.id },
          { trait_type: 'index', value: index + 1 },
          { trait_type: 'totalItems', value: (pack.skins || []).length },
        ],
      }));

      const metadataUris = await uploadJsonBatchToIrys(wallet as any, metadataArray);
      console.log(`✅ Uploaded ${metadataUris.length} metadata files to Arweave`);

      // Step 2: Create collection metadata URI (placeholder)
      const collectionUri =
        metadataUris[0] || "https://example.com/collection.json";

      // Step 3: Deploy Candy Machine using official Umi
      console.log("🚀 Deploying Candy Machine using Umi...");
      const candyMachineConfig = umiCandyMachineClient.createDefaultConfig(
        pack.id,
        `${pack.name} Collection`,
        collectionUri,
        (pack.skins || []).length,
        wallet.publicKey
      );

      const deployedCM = await umiCandyMachineClient.createCandyMachineForPack(
        candyMachineConfig
      );

      // Step 4: Add items to Candy Machine
      console.log("📝 Adding items to Candy Machine...");
      const items = (pack.skins || []).map((skin, index) => ({
        name: `${pack.id} #${index + 1}`,
        uri: metadataUris[index],
      }));

      await umiCandyMachineClient.addItemsToCandyMachine(
        deployedCM.candyMachine,
        items
      );

      // Step 5: Update pack status
      const updatedPack: Pack = {
        ...pack,
        candyMachine: deployedCM.candyMachine,
        candyGuard: deployedCM.candyGuard,
        deployedAt: new Date(),
        status: "deployed",
        skins: (pack.skins || []).map((skin, index) => ({
          ...skin,
          metadataUri: metadataUris[index],
        })),
      };

      // Save to backend
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      await fetch(`${base}/api/v1/admin/packs/${pack.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPack),
      });

      setPacks((prev) => prev.map((p) => (p.id === pack.id ? updatedPack : p)));
      setSelectedPack(updatedPack);

      toast.success(`Pack "${pack.name}" deployed successfully!`, {
        id: "deploy-pack",
      });
      console.log(`🎉 Pack deployment complete!`);
      console.log(`📦 Candy Machine: ${deployedCM.candyMachine.toBase58()}`);
      console.log(`🛡️ Candy Guard: ${deployedCM.candyGuard.toBase58()}`);
      console.log(`🎨 Collection: ${deployedCM.collectionMint.toBase58()}`);
    } catch (error) {
      console.error("Failed to deploy pack:", error);
      toast.error(
        `Failed to deploy pack: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        { id: "deploy-pack" }
      );
    } finally {
      setDeployingPack(false);
    }
  };

  const addSkinToPack = (skin: any) => {
    if (!selectedPack) return;

    const packSkin: PackSkin = {
      id: skin.id,
      name: skin.name,
      weapon: skin.name.split(" ")[0] || "Unknown",
      rarity: skin.rarity || "Common",
      imageUrl: skin.imageUrl || "",
      metadataUri: skin.metadataUri,
    };

    const updatedPack = {
      ...selectedPack,
      skins: [...selectedPack.skins, packSkin],
    };

    setSelectedPack(updatedPack);
    setPacks((prev) =>
      prev.map((p) => (p.id === selectedPack.id ? updatedPack : p))
    );
  };

  const removeSkinFromPack = (skinId: string) => {
    if (!selectedPack) return;

    const updatedPack = {
      ...selectedPack,
      skins: selectedPack.skins.filter((s) => s.id !== skinId),
    };

    setSelectedPack(updatedPack);
    setPacks((prev) =>
      prev.map((p) => (p.id === selectedPack.id ? updatedPack : p))
    );
  };

  // Simple 32-byte digest as placeholder merkle root
  const computeMerkleRoot32 = (uris: string[]): number[] => {
    const out = new Uint8Array(32);
    let acc = 2166136261 | 0;
    for (const u of uris) {
      for (let i = 0; i < u.length; i++) {
        acc ^= u.charCodeAt(i);
        acc = Math.imul(acc, 16777619);
      }
    }
    for (let i = 0; i < 32; i++) {
      out[i] = (acc >>> (i & 7)) & 0xff;
      acc = (acc ^ (acc << 13)) | 0;
    }
    return Array.from(out);
  };

  const handleCreateBox = async () => {
    if (!boxName.trim()) {
      toast.error("Box name is required");
      return;
    }
    
    // Get metadata URIs from selected inventory or manual input
    let metadataUris: string[] = [];
    if (selectedBoxInventoryIds.size > 0) {
      const selected = inventory.filter((i) => selectedBoxInventoryIds.has(i.id) && i.metadataUri);
      metadataUris = Array.from(new Set(selected.map((i) => i.metadataUri!)));
    }
    if (metadataUris.length === 0) {
      metadataUris = boxMetadataUris
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    }
    if (metadataUris.length === 0) {
      toast.error("Add at least one metadata URI");
      return;
    }

    try {
      setCreatingBox(true);
      toast.loading("Creating box...", { id: "create-box" });
      
      const box = await boxesService.createBox({
        name: boxName,
        description: boxDescription,
        metadataUris,
        status: 'active',
        totalItems: metadataUris.length,
        itemsAvailable: metadataUris.length,
        itemsOpened: 0,
      });

      toast.success("Box created successfully", { id: "create-box" });
      await loadPacks();
      
      // Clear form
      setBoxName("");
      setBoxDescription("");
      setBoxMetadataUris("");
      setSelectedBoxInventoryIds(new Set());
    } catch (e: any) {
      console.error("Failed to create box:", e);
      toast.error(e?.message || "Failed to create box", { id: "create-box" });
    } finally {
      setCreatingBox(false);
    }
  };

  const handlePublishBatch = async () => {
    if (!wallet.publicKey) {
      toast.error("Connect wallet");
      return;
    }
    
    if (isPublishingRef.current) {
      toast.error("Transaction already in progress");
      return;
    }
    // Get next batch ID from on-chain program
    let batchId: number;
    if (batchIdInput.trim().length > 0) {
      batchId = parseInt(batchIdInput.trim());
      if (!Number.isFinite(batchId)) {
        toast.error("Invalid batchId");
        return;
      }
    } else {
      // Auto-generate: get the highest batchId from existing boxes
      try {
        const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
        const res = await fetch(`${base}/api/v1/admin/packs`);
        const json = await res.json();
        if (json?.success && json.data) {
          const boxes = json.data;
          const maxBatchId = Math.max(0, ...boxes.map((box: any) => box.batchId || 0));
          batchId = maxBatchId + 1;
          console.log(`Next batch ID: ${batchId} (max existing: ${maxBatchId})`);
        } else {
          throw new Error("Failed to load existing boxes");
        }
      } catch (error) {
        console.error("Failed to get current batch count from database:", error);
        // Fallback to timestamp
        batchId = Math.floor(Date.now() / 1000);
        console.log(`Using fallback batch ID: ${batchId}`);
      }
    }
    if (!selectedBoxId) {
      toast.error("Select a box to publish as batch");
      return;
    }
    
    // Get the selected box's metadata URIs
    const selectedBox = packs.find(p => p.id === selectedBoxId);
    const boxData: any = selectedBox && (selectedBox as any)._boxData ? (selectedBox as any)._boxData : null;
    if (!selectedBox || !boxData?.metadataUris) {
      toast.error("Selected box not found or has no metadata URIs");
      return;
    }
    
    const metadataUris = boxData.metadataUris;

    try {
      isPublishingRef.current = true;
      setPublishing(true);
      toast.loading("Publishing batch on-chain...", { id: "publish-batch" });
      const rpc = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";
      const pid = process.env.NEXT_PUBLIC_PROGRAM_ID as string;
      const programService = new SolanaProgramService(rpc, pid);
      const cm = candyMachineInput && candyMachineInput.length > 0
        ? new PublicKey(candyMachineInput)
        : new PublicKey("11111111111111111111111111111111");
      const merkleRoot = computeMerkleRoot32(metadataUris);
      // Snapshot time defaults to now if not provided
      if (!snapshotTimeInput) {
        setSnapshotTimeInput(`${Math.floor(Date.now() / 1000)}`);
      }

      const priceSol = parseFloat(priceSolInput) * 1_000_000_000; // Convert SOL to lamports
      
      await programService.createBatch(wallet as any, {
        batchId,
        candyMachine: cm,
        metadataUris,
        merkleRoot,
        priceSol: Math.floor(priceSol),
      });

      // Update the box with the batchId first
      const selectedBox = packs.find(p => p.id === selectedBoxId);
      if (selectedBox) {
        await boxesService.updateBox(selectedBox.id, { batchId });
        console.log(`Updated box ${selectedBox.id} with batchId ${batchId}`);
        
        // Small delay to ensure database transaction is committed
        await new Promise(resolve => setTimeout(resolve, 100));
      } else {
        throw new Error("Selected box not found");
      }

      await boxesService.syncBox(batchId);
      await loadPacks();
      await loadProgramState();
      toast.success("Batch published & synced", { id: "publish-batch" });
    } catch (e: any) {
      console.error("Failed to publish batch:", e);
      const errorMsg = e?.message || "Failed to publish batch";
      if (errorMsg.includes("already been processed")) {
        toast.error("Transaction already processed - batch may have been created", { id: "publish-batch" });
      } else {
        toast.error(errorMsg, { id: "publish-batch" });
      }
    } finally {
      isPublishingRef.current = false;
      setPublishing(false);
    }
  };

  const savePackMetadata = async () => {
    if (!selectedPack) return;
    try {
      const metadataUris = (selectedPack.skins || [])
        .map((s) => s.metadataUri)
        .filter((u): u is string => Boolean(u));
      if (metadataUris.length === 0) {
        toast.error("Add at least one skin with a metadata URI");
        return;
      }

      // Persist to boxes table using the box id (packs list is derived from boxes)
      await boxesService.updateBox(selectedPack.id, { metadataUris });

      // Reflect in local state: update _boxData.metadataUris if present
      setPacks((prev) =>
        prev.map((p) =>
          p.id === selectedPack.id
            ? ({
                ...p,
                _boxData: {
                  ...(p as any)._boxData,
                  metadataUris,
                },
              } as any)
            : p
        )
      );
      toast.success("Metadata saved to box");
    } catch (e: any) {
      console.error("Failed to save metadata to box:", e);
      toast.error(e?.message || "Failed to save metadata");
    }
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

            {/* Pack Management removed: admin is on-chain-first now */}

            {/* Candy Machine Creation Form Modal */}
            {showCandyMachineForm && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-zinc-950 border-zinc-800">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-bold text-white">
                        Create Candy Machine
                      </h2>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCandyMachineForm(false)}
                        className="text-zinc-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {/* Collection Details */}
                      <div className="space-y-3">
                        <h3 className="text-lg font-semibold text-white">
                          Collection Details
                        </h3>

                        <div>
                          <Label className="text-white">
                            Collection Name *
                          </Label>
                          <Input
                            value={candyMachineConfig.name}
                            onChange={(e) =>
                              setCandyMachineConfig((prev) => ({
                                ...prev,
                                name: e.target.value,
                              }))
                            }
                            placeholder="e.g., SolSkins Collection"
                            className="bg-zinc-900 border-zinc-700 text-white"
                          />
                        </div>

                        <div>
                          <Label className="text-white">Symbol *</Label>
                          <Input
                            value={candyMachineConfig.symbol}
                            onChange={(e) =>
                              setCandyMachineConfig((prev) => ({
                                ...prev,
                                symbol: e.target.value.toUpperCase(),
                              }))
                            }
                            placeholder="e.g., SOLSKINS"
                            maxLength={10}
                            className="bg-zinc-900 border-zinc-700 text-white"
                          />
                        </div>

                        <div>
                          <Label className="text-white">Description *</Label>
                          <textarea
                            value={candyMachineConfig.description}
                            onChange={(e) =>
                              setCandyMachineConfig((prev) => ({
                                ...prev,
                                description: e.target.value,
                              }))
                            }
                            placeholder="Describe your collection..."
                            rows={3}
                            className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-md px-3 py-2"
                          />
                        </div>

                        <div>
                          <Label className="text-white">
                            Collection Image URL *
                          </Label>
                          <Input
                            value={candyMachineConfig.image}
                            onChange={(e) =>
                              setCandyMachineConfig((prev) => ({
                                ...prev,
                                image: e.target.value,
                              }))
                            }
                            placeholder="https://arweave.net/your-collection-image"
                            className="bg-zinc-900 border-zinc-700 text-white"
                          />
                        </div>
                      </div>

                      {/* Candy Machine Settings */}
                      <div className="space-y-3">
                        <h3 className="text-lg font-semibold text-white">
                          Candy Machine Settings
                        </h3>

                        <div>
                          <Label className="text-white">
                            Items Available *
                          </Label>
                          <Input
                            type="number"
                            value={candyMachineConfig.itemsAvailable}
                            onChange={(e) =>
                              setCandyMachineConfig((prev) => ({
                                ...prev,
                                itemsAvailable: parseInt(e.target.value) || 0,
                              }))
                            }
                            placeholder="1000"
                            min="1"
                            className="bg-zinc-900 border-zinc-700 text-white"
                          />
                        </div>

                        <div>
                          <Label className="text-white">
                            Royalty (Basis Points) *
                          </Label>
                          <Input
                            type="number"
                            value={candyMachineConfig.sellerFeeBasisPoints}
                            onChange={(e) =>
                              setCandyMachineConfig((prev) => ({
                                ...prev,
                                sellerFeeBasisPoints:
                                  parseInt(e.target.value) || 0,
                              }))
                            }
                            placeholder="500 (5%)"
                            min="0"
                            max="10000"
                            className="bg-zinc-900 border-zinc-700 text-white"
                          />
                          <p className="text-xs text-zinc-500 mt-1">
                            {candyMachineConfig.sellerFeeBasisPoints / 100}%
                            royalty
                          </p>
                        </div>
                      </div>

                      {/* Creator Settings */}
                      <div className="space-y-3">
                        <h3 className="text-lg font-semibold text-white">
                          Creator Settings
                        </h3>

                        <div>
                          <Label className="text-white">Creator Address</Label>
                          <Input
                            value={candyMachineConfig.creatorAddress}
                            onChange={(e) =>
                              setCandyMachineConfig((prev) => ({
                                ...prev,
                                creatorAddress: e.target.value,
                              }))
                            }
                            placeholder={
                              wallet.publicKey?.toBase58() ||
                              "Enter creator address"
                            }
                            className="bg-zinc-900 border-zinc-700 text-white"
                          />
                          <p className="text-xs text-zinc-500 mt-1">
                            Leave empty to use your wallet address
                          </p>
                        </div>

                        <div>
                          <Label className="text-white">
                            Creator Share (%)
                          </Label>
                          <Input
                            type="number"
                            value={candyMachineConfig.creatorShare}
                            onChange={(e) =>
                              setCandyMachineConfig((prev) => ({
                                ...prev,
                                creatorShare: parseInt(e.target.value) || 0,
                              }))
                            }
                            placeholder="100"
                            min="0"
                            max="100"
                            className="bg-zinc-900 border-zinc-700 text-white"
                          />
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3 pt-4">
                        <Button
                          onClick={() => setShowCandyMachineForm(false)}
                          variant="outline"
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={createCandyMachine}
                          disabled={
                            loadingCandyMachine ||
                            !candyMachineConfig.name ||
                            !candyMachineConfig.symbol
                          }
                          className="flex-1 bg-[#E99500] hover:bg-[#d18500] text-black font-semibold"
                        >
                          {loadingCandyMachine ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            "Create Candy Machine"
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* Candy Machines List */}
            {initialized && (
              <Card className="p-6 bg-zinc-950 border-zinc-800">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">
                    Candy Machines{" "}
                    {candyMachines.length > 0 && `(${candyMachines.length})`}
                  </h2>
                  <Button
                    onClick={fetchCandyMachines}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    disabled={loadingCandyMachines}
                  >
                    {loadingCandyMachines ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Refresh"
                    )}
                  </Button>
                </div>

                {loadingCandyMachines ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-[#E99500] mx-auto mb-2" />
                    <p className="text-zinc-400 text-sm">
                      Loading Candy Machines...
                    </p>
                  </div>
                ) : candyMachines.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                    <p className="text-zinc-400 text-sm font-medium">
                      No Candy Machines created yet
                    </p>
                    <p className="text-zinc-600 text-xs mt-1">
                      Create your first Candy Machine using the form above
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {candyMachines.map((cm) => (
                      <div
                        key={cm.id}
                        className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-white">
                                {cm.name}
                              </h3>
                              <span className="px-2 py-1 bg-green-900 text-green-300 text-xs rounded-full">
                                {cm.status}
                              </span>
                            </div>
                            <p className="text-zinc-400 text-sm mb-3">
                              {cm.description}
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                              <div>
                                <span className="text-zinc-500">Symbol:</span>
                                <p className="text-white font-mono">
                                  {cm.symbol}
                                </p>
                              </div>
                              <div>
                                <span className="text-zinc-500">Items:</span>
                                <p className="text-white">
                                  {cm.itemsAvailable.toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <span className="text-zinc-500">Royalty:</span>
                                <p className="text-white">
                                  {(cm.sellerFeeBasisPoints / 100).toFixed(2)}%
                                </p>
                              </div>
                              <div>
                                <span className="text-zinc-500">Created:</span>
                                <p className="text-white">
                                  {cm.createdAt instanceof Date
                                    ? cm.createdAt.toLocaleDateString()
                                    : new Date(
                                        cm.createdAt
                                      ).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="mt-3 space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-zinc-500 text-xs">
                                  Candy Machine:
                                </span>
                                <div className="flex items-center gap-2">
                                  <code className="text-blue-300 text-xs bg-zinc-800 px-2 py-1 rounded font-mono">
                                    {cm.candyMachineAddress}
                                  </code>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(
                                        cm.candyMachineAddress
                                      );
                                      toast.success(
                                        "Candy Machine address copied!"
                                      );
                                    }}
                                    className="text-blue-400 hover:text-blue-300 text-xs px-2 py-1 bg-blue-900/20 rounded"
                                    title="Copy address"
                                  >
                                    Copy
                                  </button>
                                  <a
                                    href={`https://solscan.io/account/${cm.candyMachineAddress}?cluster=devnet`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:text-blue-300 text-xs px-2 py-1 bg-blue-900/20 rounded"
                                    title="View on Solscan (Devnet)"
                                  >
                                    Solscan
                                  </a>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-zinc-500 text-xs">
                                  Collection:
                                </span>
                                <div className="flex items-center gap-2">
                                  <code className="text-purple-300 text-xs bg-zinc-800 px-2 py-1 rounded font-mono">
                                    {cm.collectionMint}
                                  </code>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(
                                        cm.collectionMint
                                      );
                                      toast.success(
                                        "Collection address copied!"
                                      );
                                    }}
                                    className="text-purple-400 hover:text-purple-300 text-xs px-2 py-1 bg-purple-900/20 rounded"
                                    title="Copy address"
                                  >
                                    Copy
                                  </button>
                                  <a
                                    href={`https://solscan.io/account/${cm.collectionMint}?cluster=devnet`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-purple-400 hover:text-purple-300 text-xs px-2 py-1 bg-purple-900/20 rounded"
                                    title="View on Solscan (Devnet)"
                                  >
                                    Solscan
                                  </a>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-zinc-500 text-xs">
                                  Authority:
                                </span>
                                <div className="flex items-center gap-2">
                                  <code className="text-green-300 text-xs bg-zinc-800 px-2 py-1 rounded font-mono">
                                    {cm.collectionUpdateAuthority}
                                  </code>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(
                                        cm.collectionUpdateAuthority
                                      );
                                      toast.success(
                                        "Authority address copied!"
                                      );
                                    }}
                                    className="text-green-400 hover:text-green-300 text-xs px-2 py-1 bg-green-900/20 rounded"
                                    title="Copy address"
                                  >
                                    Copy
                                  </button>
                                  <a
                                    href={`https://solscan.io/account/${cm.collectionUpdateAuthority}?cluster=devnet`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-green-400 hover:text-green-300 text-xs px-2 py-1 bg-green-900/20 rounded"
                                    title="View on Solscan (Devnet)"
                                  >
                                    Solscan
                                  </a>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* Create Box */}
            <Card className="p-6 bg-zinc-950 border-zinc-800">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Create Box</h2>
              </div>
              <div className="grid gap-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-white">Box Name *</Label>
                    <Input 
                      value={boxName} 
                      onChange={(e) => setBoxName(e.target.value)} 
                      placeholder="e.g., D3 Collection Box"
                      className="bg-zinc-900 border-zinc-700 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-white">Description</Label>
                    <Input 
                      value={boxDescription} 
                      onChange={(e) => setBoxDescription(e.target.value)} 
                      placeholder="Optional description"
                      className="bg-zinc-900 border-zinc-700 text-white"
                    />
                  </div>
                </div>
                
                <div>
                  <Label className="text-white">Metadata URIs</Label>
                  <div className="space-y-2">
                    <div className="text-sm text-zinc-400">
                      Select from inventory or enter manually:
                    </div>
                    {inventory.length > 0 && (
                      <div className="max-h-32 overflow-y-auto border border-zinc-700 rounded p-2 bg-zinc-900">
                        {inventory.map((item) => (
                          <label key={item.id} className="flex items-center space-x-2 text-sm text-white">
                            <input
                              type="checkbox"
                              checked={selectedBoxInventoryIds.has(item.id)}
                              onChange={(e) => {
                                const newSet = new Set(selectedBoxInventoryIds);
                                if (e.target.checked) {
                                  newSet.add(item.id);
                                } else {
                                  newSet.delete(item.id);
                                }
                                setSelectedBoxInventoryIds(newSet);
                              }}
                              className="bg-zinc-800"
                            />
                            <span>{item.name} - {item.metadataUri}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    <Textarea
                      value={boxMetadataUris}
                      onChange={(e) => setBoxMetadataUris(e.target.value)}
                      placeholder="Enter metadata URIs (one per line)"
                      rows={3}
                      className="bg-zinc-900 border-zinc-700 text-white"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button 
                    onClick={handleCreateBox} 
                    disabled={creatingBox}
                    className="bg-[#E99500] hover:bg-[#d18500] text-black"
                  >
                    {creatingBox ? "Creating..." : "Create Box"}
                  </Button>
                </div>
                <p className="text-xs text-zinc-500">Creates a box in the database with metadata URIs. Required before publishing batch.</p>
              </div>
            </Card>

            {/* Publish Batch (On-chain) */}
            {initialized && (
              <Card className="p-6 bg-zinc-950 border-zinc-800">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">Publish Batch (On-chain)</h2>
                </div>
                <div className="grid gap-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-white">Batch ID *</Label>
                      <div className="flex gap-2">
                        <Input value={batchIdInput} onChange={(e)=>setBatchIdInput(e.target.value)} placeholder="auto: next available" className="bg-zinc-900 border-zinc-700 text-white"/>
                        <Button
                          type="button"
                          variant="outline"
                          className="text-xs"
                          onClick={async () => {
                            try {
                              const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
                              const res = await fetch(`${base}/api/v1/admin/packs`);
                              const json = await res.json();
                              if (json?.success && json.data) {
                                const boxes = json.data;
                                const maxBatchId = Math.max(0, ...boxes.map((box: any) => box.batchId || 0));
                                setBatchIdInput(String(maxBatchId + 1));
                              } else {
                                setBatchIdInput(String(Math.floor(Date.now() / 1000)));
                              }
                            } catch (error) {
                              setBatchIdInput(String(Math.floor(Date.now() / 1000)));
                            }
                          }}
                        >
                          Auto-generate
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-white">Candy Machine (optional)</Label>
                      <Input value={candyMachineInput} onChange={(e)=>setCandyMachineInput(e.target.value)} placeholder="11111111111111111111111111111111" className="bg-zinc-900 border-zinc-700 text-white"/>
                    </div>
                  </div>
                  <div>
                    <Label className="text-white">Snapshot Time (sec, optional)</Label>
                    <Input value={snapshotTimeInput} onChange={(e)=>setSnapshotTimeInput(e.target.value)} placeholder={`${Math.floor(Date.now()/1000)}`} className="bg-zinc-900 border-zinc-700 text-white"/>
                  </div>
                  <div>
                    <Label className="text-white">Price (SOL) *</Label>
                    <Input 
                      value={priceSolInput} 
                      onChange={(e)=>setPriceSolInput(e.target.value)} 
                      placeholder="1.0" 
                      type="number"
                      step="0.1"
                      min="0"
                      className="bg-zinc-900 border-zinc-700 text-white"
                    />
                    <p className="text-xs text-zinc-500 mt-1">Price in SOL to open a pack from this batch</p>
                  </div>
                  <div>
                    <Label className="text-white">Treasury Address (optional)</Label>
                    <Input 
                      value={treasuryAddress} 
                      onChange={(e)=>setTreasuryAddress(e.target.value)} 
                      placeholder="Enter treasury wallet address" 
                      className="bg-zinc-900 border-zinc-700 text-white"
                    />
                    <p className="text-xs text-zinc-500 mt-1">Wallet address to receive payments. Leave empty to use environment variable.</p>
                  </div>
                  <div>
                    <Label className="text-white">Select Box *</Label>
                    <select 
                      value={selectedBoxId} 
                      onChange={(e) => setSelectedBoxId(e.target.value)}
                      className="w-full p-2 bg-zinc-900 border border-zinc-700 text-white rounded"
                    >
                      <option value="">Choose a box...</option>
                      {packs.map((pack) => {
                        const data: any = (pack as any)._boxData;
                        const count = data?.metadataUris?.length || 0;
                        return (
                          <option key={pack.id} value={pack.id}>
                            {pack.name} ({count} items)
                          </option>
                        );
                      })}
                    </select>
                    {selectedBoxId && (
                      <div className="mt-2 p-2 bg-zinc-800 rounded text-sm">
                        <p className="text-white font-medium">Selected Box:</p>
                        <p className="text-zinc-400">
                          {(() => {
                            const sel: any = packs.find(p => p.id === selectedBoxId);
                            return sel?._boxData?.metadataUris?.length || 0;
                          })()} metadata URIs
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={handlePublishBatch} disabled={publishing} className="bg-[#E99500] hover:bg-[#d18500] text-black">
                      {publishing ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin"/>Publishing...</>) : ("Publish Batch")}
                    </Button>
                  </div>
                  <p className="text-xs text-zinc-500">Writes on-chain then syncs DB mirror. Player UI reads DB but opens on-chain by batchId.</p>
                </div>
              </Card>
            )}

            {/* Published Batches List */}
            {initialized && (
              <Card className="p-6 bg-zinc-950 border-zinc-800">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">
                    Published Batches{" "}
                    {packs.filter(p => (p as any)._boxData?.batchId).length > 0 && `(${packs.filter(p => (p as any)._boxData?.batchId).length})`}
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

                {packs.filter(p => (p as any)._boxData?.batchId).length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                    <p className="text-zinc-400 text-sm font-medium">
                      No batches published yet
                    </p>
                    <p className="text-zinc-600 text-xs mt-1">
                      Publish your first batch using the form above
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {packs.filter(p => (p as any)._boxData?.batchId).map((pack) => {
                      const boxData = (pack as any)._boxData;
                      return (
                      <div
                        key={pack.id}
                        className="p-4 bg-zinc-900 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <Package className="w-5 h-5 text-[#E99500] mt-0.5" />
                            <div>
                              <p className="text-white font-semibold">
                                Batch #{boxData?.batchId} - {pack.name}
                              </p>
                              <p className="text-xs text-zinc-400 mt-1">
                                {boxData?.totalItems || 0} NFTs in pool
                              </p>
                              <p className="text-xs text-zinc-400">
                                {boxData?.itemsAvailable || 0} available •{" "}
                                {boxData?.itemsOpened || 0} opened
                              </p>
                              <p className="text-xs text-zinc-500 mt-2 font-mono">
                                Candy Machine:{" "}
                                {boxData?.candyMachine?.slice(0, 8)}...
                                {boxData?.candyMachine?.slice(-8)}
                              </p>
                              {boxData?.metadataUris &&
                                boxData.metadataUris.length > 0 && (
                                  <details className="mt-2">
                                    <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-400">
                                      View {boxData.metadataUris.length} Metadata
                                      URIs
                                    </summary>
                                    <div className="mt-2 space-y-1 pl-4 border-l border-zinc-700">
                                      {boxData.metadataUris
                                        .slice(0, 5)
                                        .map((uri: string, idx: number) => (
                                          <p
                                            key={idx}
                                            className="text-xs text-zinc-600 font-mono truncate"
                                          >
                                            {idx + 1}. {uri}
                                          </p>
                                        ))}
                                      {boxData.metadataUris.length > 5 && (
                                        <p className="text-xs text-zinc-600">
                                          ... and{" "}
                                          {boxData.metadataUris.length - 5} more
                                        </p>
                                      )}
                                    </div>
                                  </details>
                                )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-zinc-500">
                              {new Date(
                                Number(boxData?.snapshotTime) * 1000
                              ).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                      );
                    })}
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
