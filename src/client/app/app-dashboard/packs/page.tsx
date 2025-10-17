"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Zap,
  Loader2,
  Sparkles,
  TrendingUp,
  Lock,
  Unlock,
  Package,
  Gem,
  Crown,
} from "lucide-react";
import Link from "next/link";
import React from "react";
import { useState, useEffect, useRef } from "react";
import { toast } from "react-hot-toast";
import { useWallet } from "@solana/wallet-adapter-react";
import { motion, AnimatePresence } from "framer-motion";
import { casesService, marketplaceService, SolanaProgramService, boxesService } from "@/lib/services";
import { PublicKey, Keypair } from '@solana/web3.js';
import { LootBoxType } from "@/lib/types/api";

interface CSGOSkin {
  id: string;
  name: string;
  rarity: string;
  value: number;
  image: string;
}

const getPackIcon = (rarity?: string) => {
  if (!rarity) return Package;
  switch (rarity.toLowerCase()) {
    case "legendary":
      return Crown;
    case "premium":
      return Gem;
    default:
      return Package;
  }
};

const getPackColor = (rarity?: string) => {
  if (!rarity) return "from-gray-600 to-gray-800";
  switch (rarity.toLowerCase()) {
    case "legendary":
      return "from-yellow-500 to-orange-600";
    case "premium":
      return "from-blue-600 to-purple-600";
    case "special":
      return "from-purple-500 to-pink-600";
    default:
      return "from-gray-600 to-gray-800";
  }
};

const getPackGlow = (rarity?: string) => {
  if (!rarity) return "shadow-gray-500/50";
  switch (rarity.toLowerCase()) {
    case "legendary":
      return "shadow-yellow-500/50";
    case "premium":
      return "shadow-blue-500/50";
    case "special":
      return "shadow-purple-500/50";
    default:
      return "shadow-gray-500/50";
  }
};

// Mock skins using local assets
const MOCK_SKINS: CSGOSkin[] = [
  {
    id: "1",
    name: "AK-47 | Neon Rider",
    rarity: "legendary",
    value: 850.0,
    image: "/assets/skins/img2.png",
  },
  {
    id: "2",
    name: "AWP | Dragon Lore",
    rarity: "legendary",
    value: 1200.0,
    image: "/assets/skins/img2.png",
  },
  {
    id: "3",
    name: "M4A4 | Howl",
    rarity: "epic",
    value: 450.0,
    image: "/assets/skins/img3.png",
  },
  {
    id: "4",
    name: "Glock-18 | Fade",
    rarity: "rare",
    value: 125.5,
    image: "/assets/skins/img2.png",
  },
  {
    id: "5",
    name: "USP-S | Kill Confirmed",
    rarity: "rare",
    value: 89.99,
    image: "/assets/skins/img2.png",
  },
  {
    id: "6",
    name: "Desert Eagle | Blaze",
    rarity: "uncommon",
    value: 45.0,
    image: "/assets/skins/img3.png",
  },
  {
    id: "7",
    name: "P90 | Asiimov",
    rarity: "uncommon",
    value: 32.5,
    image: "/assets/skins/img2.png",
  },
  {
    id: "8",
    name: "MAC-10 | Neon Rider",
    rarity: "common",
    value: 12.0,
    image: "/assets/skins/img2.png",
  },
  {
    id: "9",
    name: "Karambit | Fade",
    rarity: "legendary",
    value: 1850.0,
    image: "/assets/skins/img3.png",
  },
  {
    id: "10",
    name: "M4A1-S | Hyper Beast",
    rarity: "epic",
    value: 380.0,
    image: "/assets/skins/img2.png",
  },
  {
    id: "11",
    name: "Butterfly Knife | Doppler",
    rarity: "legendary",
    value: 1450.0,
    image: "/assets/skins/img2.png",
  },
  {
    id: "12",
    name: "AK-47 | Fire Serpent",
    rarity: "epic",
    value: 520.0,
    image: "/assets/skins/img3.png",
  },
];

// Default odds when API doesn't provide per-rarity probabilities
const DEFAULT_ODDS: { label: string; rarity: string; pct: number }[] = [
  { label: "Legendary", rarity: "legendary", pct: 0.5 },
  { label: "Epic", rarity: "epic", pct: 2.0 },
  { label: "Rare", rarity: "rare", pct: 8.5 },
  { label: "Uncommon", rarity: "uncommon", pct: 24.0 },
  { label: "Common", rarity: "common", pct: 65.0 },
];

export default function PacksPage() {
  const walletCtx = useWallet();
  const { connected, publicKey, signTransaction } = walletCtx;
  const [lootBoxes, setLootBoxes] = useState<LootBoxType[]>([]);
  const [selectedPack, setSelectedPack] = useState<LootBoxType | null>(null);
  const [boxes, setBoxes] = useState<any[]>([]);
  const [loadingBoxes, setLoadingBoxes] = useState(false);
  const [selectedBoxMetaUris, setSelectedBoxMetaUris] = useState<string[]>([]);
  const isRevealingRef = useRef(false);
  const isOpeningRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [openingPhase, setOpeningPhase] = useState<
    "waiting" | "spinning" | "revealing" | null
  >(null);
  const [wonSkin, setWonSkin] = useState<CSGOSkin | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [spinItems, setSpinItems] = useState<CSGOSkin[]>([]);
  const rouletteRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<any>(null);

  // Calculate real odds from batch metadata URIs
  const calculateRealOdds = async (metadataUris: string[]) => {
    if (!Array.isArray(metadataUris) || metadataUris.length === 0) {
      return DEFAULT_ODDS;
    }

    try {
      // Fetch metadata for all items in the batch
      const metadataPromises = metadataUris.slice(0, 20).map(async (uri) => {
        try {
          const response = await fetch(uri);
          if (!response.ok) return null;
          const metadata = await response.json();
          return metadata;
        } catch {
          return null;
        }
      });

      const metadataResults = await Promise.allSettled(metadataPromises);
      const validMetadata = metadataResults
        .filter((result) => result.status === 'fulfilled' && result.value)
        .map((result) => (result as any).value);

      if (validMetadata.length === 0) {
        return DEFAULT_ODDS;
      }

      // Count items by rarity
      const rarityCounts: Record<string, number> = {
        common: 0,
        uncommon: 0,
        rare: 0,
        epic: 0,
        legendary: 0,
      };

      validMetadata.forEach((metadata) => {
        const rarityAttr = Array.isArray(metadata?.attributes)
          ? metadata.attributes.find((a: any) => /rarity/i.test(a?.trait_type))?.value
          : null;
        
        const rarity = (rarityAttr || 'common').toString().toLowerCase();
        if (rarity in rarityCounts) {
          rarityCounts[rarity]++;
        } else {
          rarityCounts.common++;
        }
      });

      const totalItems = validMetadata.length;
      
      // Calculate percentages
      const odds = [
        {
          label: "Legendary",
          rarity: "legendary",
          pct: (rarityCounts.legendary / totalItems) * 100,
        },
        {
          label: "Epic", 
          rarity: "epic",
          pct: (rarityCounts.epic / totalItems) * 100,
        },
        {
          label: "Rare",
          rarity: "rare", 
          pct: (rarityCounts.rare / totalItems) * 100,
        },
        {
          label: "Uncommon",
          rarity: "uncommon",
          pct: (rarityCounts.uncommon / totalItems) * 100,
        },
        {
          label: "Common",
          rarity: "common",
          pct: (rarityCounts.common / totalItems) * 100,
        },
      ];

      console.log('Calculated real odds from batch metadata:', odds);
      return odds;
    } catch (error) {
      console.error('Error calculating real odds:', error);
      return DEFAULT_ODDS;
    }
  };

  // Odds to display (prefer real calculated odds → API chances → default)
  const [oddsToUse, setOddsToUse] = useState(DEFAULT_ODDS);

  // Weighted selection function based on odds
  const selectRarityByOdds = (odds: typeof DEFAULT_ODDS) => {
    const random = Math.random() * 100;
    let cumulative = 0;
    
    for (const odd of odds) {
      cumulative += odd.pct;
      if (random <= cumulative) {
        return odd.rarity;
      }
    }
    
    // Fallback to common if no match
    return 'common';
  };

  // Load boxes from database
  useEffect(() => {
    loadBoxes(); // Load boxes from database
  }, []);

  // Calculate real odds when pack is selected
  useEffect(() => {
    if (selectedPack && selectedBoxMetaUris.length > 0) {
      calculateRealOdds(selectedBoxMetaUris).then(setOddsToUse);
    }
  }, [selectedPack, selectedBoxMetaUris]);

  const loadLootBoxes = async () => {
    try {
      setLoading(true);
      const response = await marketplaceService.getLootBoxes({
        filterBy: "all",
      });
      const boxes = response.data || [];
      setLootBoxes(boxes);
      if (boxes.length > 0 && !selectedPack) {
        setSelectedPack(boxes[0]);
      }
    } catch (error) {
      console.error("Failed to load loot boxes:", error);
      toast.error("Failed to load packs");
    } finally {
      setLoading(false);
    }
  };

  const loadBoxes = async () => {
    try {
      setLoading(true);
      setLoadingBoxes(true);
      const data = await boxesService.getActiveBoxes();
      console.log("loadBoxes - received data:", data);
      console.log("loadBoxes - data length:", data?.length);
      // Only show published boxes (on-chain batches): require non-null batchId
      const published = Array.isArray(data) ? data.filter((b: any) => !!b?.batchId) : [];
      setBoxes(published);
      console.log("loadBoxes - boxes state set");
      // Set the first box as selected pack if none is selected
      if (published.length > 0 && !selectedPack) {
        setSelectedPack(published[0] as any);
        console.log("loadBoxes - selectedPack set to:", published[0]);
        // Prefetch metadata URIs for first selection
        void fetchSelectedBoxMetaUris(published[0]);
      }
    } catch (error) {
      console.error("Failed to load boxes:", error);
      toast.error("Failed to load boxes");
    } finally {
      setLoading(false);
      setLoadingBoxes(false);
    }
  };

  const fetchSelectedBoxMetaUris = async (pack: any) => {
    try {
      const batchId = pack?.batchId;
      if (!batchId) {
        setSelectedBoxMetaUris([]);
        return;
      }
      const box = await boxesService.getBoxByBatchId(batchId);
      const uris = Array.isArray(box?.metadataUris) ? box.metadataUris : [];
      setSelectedBoxMetaUris(uris);
      console.log('Fetched metadataUris for batch', batchId, uris.length);
    } catch (e) {
      console.warn('Failed to fetch box by batchId for metadataUris', e);
      setSelectedBoxMetaUris([]);
    }
  };

  // Generate initial roulette items
  useEffect(() => {
    generateSpinItems();
  }, [selectedPack, selectedBoxMetaUris]);

  // When user changes selected pack, fetch its metadataUris from backend
  useEffect(() => {
    if (selectedPack) {
      void fetchSelectedBoxMetaUris(selectedPack as any);
    }
  }, [selectedPack]);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const generateSpinItems = async () => {
    const items: CSGOSkin[] = [];

    // Use real metadata from selected pack (fetched from backend) if available
    const metadataUris = selectedBoxMetaUris;
    if (Array.isArray(metadataUris) && metadataUris.length > 0) {
      try {
        // Fetch a subset of metadata to avoid over-fetching; limit concurrency
        const sample = metadataUris.slice(0, Math.min(10, metadataUris.length));
        const fetchWithTimeout = (rawUrl: string, ms = 7000) => {
          // Normalize metadata URLs
          const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
          const baseV1 = `${apiBase}/api/v1`;

          let url = rawUrl?.trim();
          if (!url) return Promise.reject(new Error('empty url'));

          // If UUID-like, assume DB metadata id
          const uuidLike = /^[0-9a-fA-F-]{32,36}$/;
          if (uuidLike.test(url)) {
            url = `${baseV1}/metadata/${url}`;
          }

          // If relative metadata path
          if (url.startsWith('/metadata/')) {
            url = `${baseV1}${url}`;
          }
          if (url.startsWith('/api/v1/metadata/')) {
            url = `${apiBase}${url}`;
          }

          // Allow Arweave and any HTTP(S); do not hard-skip deprecated hosts, just let fetch fail
          return Promise.race([
            fetch(url).then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
          ]);
        };

        const results = await Promise.allSettled(sample.map((u) => fetchWithTimeout(u)));
        // Debug: log raw metadata responses for field mapping
        try {
          console.log('Roulette metadata fetch results (first 3):', results.slice(0, 3).map((r: any, i) => ({
            idx: i,
            status: r?.status,
            keys: r?.status === 'fulfilled' ? Object.keys(r.value || {}) : undefined,
            sample: r?.status === 'fulfilled' ? r.value : r?.reason?.message || String(r?.reason || '')
          })));
        } catch {}
        const normalize = (md: any) => {
          if (!md) return null;
          
          // Unwrap API envelope { success, data }
          if (md.success && md.data) md = md.data;
          if (md.data && !md.name && !md.image) md = md.data; // nested data
          
          // Extract name (trim whitespace)
          const name = md.name ? md.name.trim() : undefined;
          
          // Extract rarity from attributes
          const rarityAttr = Array.isArray(md?.attributes)
            ? md.attributes.find((a: any) => /rarity/i.test(a?.trait_type))?.value
            : undefined;
          const rarity = typeof rarityAttr === 'string' ? rarityAttr.toLowerCase() : undefined;
          
          // Extract image
          const image = md.image || (md as any).image_url || (md as any).imageUri || md?.properties?.files?.[0]?.uri || undefined;
          
          // Extract value from Float attribute (CS:GO float value)
          const floatAttr = Array.isArray(md?.attributes)
            ? md.attributes.find((a: any) => /float/i.test(a?.trait_type))?.value
            : undefined;
          const floatValue = floatAttr ? parseFloat(floatAttr) : undefined;
          
          // Use float value as the price (multiply by 1000 for display)
          const value = floatValue ? floatValue * 1000 : undefined;
          
          return { name, image, rarity, value };
        };

        const assets: { name?: string; image?: string; rarity?: string; value?: number }[] = results
          .map((r) => (r.status === 'fulfilled' ? normalize((r as any).value) : null))
          .filter(Boolean) as any;
        try {
          console.log('Normalized roulette assets (first 5):', assets.slice(0, 5));
        } catch {}

        // Build 50 spin items using weighted selection based on real odds
        for (let i = 0; i < 50; i++) {
          const pick = assets[Math.floor(Math.random() * Math.max(assets.length, 1))] || {} as any;
          const rarityFromMeta = pick.rarity && ['common','uncommon','rare','epic','legendary'].includes(pick.rarity)
            ? pick.rarity
            : undefined;
          const chosenRarity = rarityFromMeta || selectRarityByOdds(oddsToUse);

          items.push({
            id: `real-${i}`,
            name: pick.name || `Mystery Skin #${i + 1}`,
            rarity: chosenRarity,
            value: pick.value || Math.round(Math.random() * 10000) / 100,
            image: pick.image || "/assets/skins/img1.png",
          });
        }
      } catch (_e) {
        // Fallback to mock skins on any error, but still use weighted selection
        for (let i = 0; i < 50; i++) {
          const selectedRarity = selectRarityByOdds(oddsToUse);
          const mockSkin = MOCK_SKINS[Math.floor(Math.random() * MOCK_SKINS.length)];
          items.push({
            ...mockSkin,
            rarity: selectedRarity, // Override with weighted rarity
          });
        }
      }
    } else {
      // Fallback to mock skins with weighted selection
      for (let i = 0; i < 50; i++) {
        const selectedRarity = selectRarityByOdds(oddsToUse);
        const mockSkin = MOCK_SKINS[Math.floor(Math.random() * MOCK_SKINS.length)];
        items.push({
          ...mockSkin,
          rarity: selectedRarity, // Override with weighted rarity
        });
      }
    }

    setSpinItems(items);
  };

  // Fetch a single metadata JSON and map to CSGOSkin
  const resolveSkinFromMetadata = async (uri: string): Promise<CSGOSkin> => {
    try {
      console.log('DEBUG: Fetching metadata from URI:', uri);
      const r = await fetch(uri);
      const j = await r.json();
      console.log('DEBUG: Raw metadata response:', j);
      
      // Unwrap API envelope { success, data }
      const md = j.success && j.data ? j.data : j;
      
      // Extract name (trim whitespace)
      const name = md.name ? md.name.trim() : 'Mystery Skin';
      
      // Extract rarity from attributes
      const rarityAttr = Array.isArray(md?.attributes)
        ? md.attributes.find((a: any) => /rarity/i.test(a?.trait_type))?.value
        : undefined;
      const rarity = typeof rarityAttr === 'string' ? rarityAttr.toLowerCase() : 'common';
      
      // Extract image
      const image = md.image || '/assets/skins/img1.png';
      
      // Extract value from Float attribute (CS:GO float value)
      const floatAttr = Array.isArray(md?.attributes)
        ? md.attributes.find((a: any) => /float/i.test(a?.trait_type))?.value
        : undefined;
      const floatValue = floatAttr ? parseFloat(floatAttr) : undefined;
      
      // Use float value as the price (multiply by 1000 for display)
      const value = floatValue ? floatValue * 1000 : 0;
      
      const result = { id: uri, name, rarity, value, image };
      console.log('DEBUG: Resolved skin:', result);
      return result;
    } catch (error) {
      console.error('DEBUG: Failed to resolve metadata:', error);
      return { id: uri, name: 'Mystery Skin', rarity: 'common', value: 0, image: '/assets/skins/img1.png' };
    }
  };

  // Continuous spinning animation
  const startContinuousSpin = () => {
    if (!rouletteRef.current) return;

    const animate = () => {
      if (rouletteRef.current && openingPhase === "spinning") {
        const currentTransform = rouletteRef.current.style.transform;
        const currentX =
          parseFloat(currentTransform.replace(/[^-\d.]/g, "")) || 0;
        const newX = currentX - 5;

        if (newX < -8000) {
          rouletteRef.current.style.transform = "translateX(0px)";
        } else {
          rouletteRef.current.style.transform = `translateX(${newX}px)`;
        }
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  // Stop and reveal result
  const stopAndShowResult = (winnerSkin: CSGOSkin) => {
    setOpeningPhase("revealing");

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    // Keep current items and inject winner at a deterministic index
    const items: CSGOSkin[] = [...spinItems];
    const winningIndex = Math.min(42, Math.max(0, items.length - 1));
    if (items.length === 0) {
      items.push(winnerSkin);
    } else {
      items[winningIndex] = winnerSkin;
    }
    setSpinItems(items);

    // Animate to final position
    setTimeout(() => {
      if (rouletteRef.current) {
        const itemWidth = 160;
        const finalPosition = -(
          winningIndex * itemWidth -
          window.innerWidth / 2 +
          itemWidth / 2
        );

        rouletteRef.current.style.transition =
          "transform 4s cubic-bezier(0.17, 0.67, 0.05, 0.98)";
        rouletteRef.current.style.transform = `translateX(${finalPosition}px)`;
      }

      // Show result modal after animation
      setTimeout(() => {
        setWonSkin(winnerSkin);
        setShowResult(true);
        setOpeningPhase(null);
        toast.success(`You won ${winnerSkin.name}!`, {
          icon: "🎉",
          duration: 4000,
        });
      }, 4200);
    }, 100);
  };

  const handleOpenPack = async () => {
    if (!connected) {
      toast.error("Connect your wallet first!");
      return;
    }

    if (openingPhase || !selectedPack) return;

    // FASE 1: Waiting (apenas texto)
    setOpeningPhase("waiting");
    setShowResult(false);
    setWonSkin(null);

    // Reset roulette
    generateSpinItems();
    if (rouletteRef.current) {
      rouletteRef.current.style.transition = "none";
      rouletteRef.current.style.transform = "translateX(0px)";
    }

    try {
      if (isOpeningRef.current) return;
      isOpeningRef.current = true;
      const rpc = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
      const pid = process.env.NEXT_PUBLIC_PROGRAM_ID as string;
      // Fresh instance for open to avoid tx reuse
      let programService = new SolanaProgramService(rpc, pid);

      const wallet = walletCtx;
      
      // Skip initialize here; assume global is already set up via admin

      // 2. Use existing box data from database
      const batchId = (selectedPack as any).batchId;
      if (!batchId) {
        toast.error("This pack is not a published batch. Only published batches can be opened.");
        setOpeningPhase(null);
        return;
      }

      // Generate a new box asset for this opening
      const boxAsset = Keypair.generate().publicKey;

      // 3. Execute complete pack opening in single transaction
      // This combines createBox + openBox + revealAndClaim

      // Require real metadata for roulette/reveal
      const ensureUris = async () => {
        if (Array.isArray(selectedBoxMetaUris) && selectedBoxMetaUris.length > 0) return true;
        try {
          await fetchSelectedBoxMetaUris(selectedPack as any);
        } catch {}
        return Array.isArray(selectedBoxMetaUris) && selectedBoxMetaUris.length > 0;
      };
      const haveUris = await ensureUris();
      if (!haveUris) {
        toast.error("No metadata linked to this pack yet. Add metadata before opening.");
        setOpeningPhase(null);
        return;
      }

      console.log("Using box for open:", { batchId, boxAsset: boxAsset.toBase58(), metadataCount: selectedBoxMetaUris.length });

      // 4. Execute complete pack opening (createBox + openBox + revealAndClaim in single transaction)
      const result = await programService.openPackComplete(wallet, { batchId, poolSize: 1, boxAsset });
      console.log("Pack opened and NFT claimed:", result);
      toast.success("Pack opened successfully!");

      // 2. Start roulette animation
      setOpeningPhase("spinning");
      startContinuousSpin();

      // 3. After animation, show the revealed NFT
      setTimeout(async () => {
        if (isRevealingRef.current) return;
        isRevealingRef.current = true;
        try {
          const { signature, asset } = result;
          console.log("Using revealed NFT:", { signature, asset });

          // Resolve real revealed metadata: try to map asset → one of our metadata URIs
          // Heuristic: if only one URI in the batch, use it; otherwise try first as placeholder
          let winnerSkin: CSGOSkin | null = null;
          const uris = selectedBoxMetaUris;
          if (Array.isArray(uris) && uris.length > 0) {
            const uri = uris.length === 1 ? uris[0] : uris[0];
            winnerSkin = await resolveSkinFromMetadata(uri);
          }
          if (!winnerSkin) {
            winnerSkin = { id: asset, name: `Revealed #${asset.slice(0, 6)}`, rarity: 'common', value: 0, image: '/assets/skins/img1.png' };
          }

          setWonSkin(winnerSkin);
          setOpeningPhase("revealing");
          stopAndShowResult(winnerSkin);
        } catch (error: any) {
          const msg = String(error?.message || "");
          if (msg.includes("already been processed")) {
            console.warn("Reveal ignored: transaction already processed");
            setOpeningPhase(null);
          } else {
            console.error("Failed to reveal and claim:", error);
            console.error("Full error details:", JSON.stringify(error, null, 2));
            toast.error("Failed to reveal and claim: " + (error as Error).message);
            setOpeningPhase(null);
          }
        } finally {
          isRevealingRef.current = false;
        }
      }, 4000); // After roulette animation

    } catch (error) {
      console.error("Failed to open box:", error);
      toast.error("Failed to open box: " + (error as Error).message);
      setOpeningPhase(null);
    } finally {
      isOpeningRef.current = false;
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "legendary":
        return "from-yellow-500 to-orange-500";
      case "epic":
        return "from-purple-500 to-pink-500";
      case "rare":
        return "from-blue-500 to-cyan-500";
      case "uncommon":
        return "from-green-500 to-emerald-500";
      default:
        return "from-gray-500 to-slate-500";
    }
  };

  const getRarityBorderColor = (rarity: string) => {
    switch (rarity) {
      case "legendary":
        return "border-yellow-400";
      case "epic":
        return "border-purple-400";
      case "rare":
        return "border-blue-400";
      case "uncommon":
        return "border-green-400";
      default:
        return "border-gray-400";
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-4 md:p-6 overflow-hidden relative">
      {/* Fullscreen Opening Animation */}
      <AnimatePresence>
        {openingPhase && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black"
          >
            {/* Simplified Background - reduced animations */}
            <div className="absolute inset-0 overflow-hidden">
              {/* Static gradient overlay */}
              <div className="absolute inset-0 bg-gradient-radial from-[#E99500]/20 to-black" />
            </div>

            {/* Center Content */}
            <div className="relative z-10 flex flex-col items-center justify-center h-full space-y-12">
              {/* FASE 1: Waiting - Apenas texto e ícone */}
              {openingPhase === "waiting" && (
                <>
                  {/* Animated Icon */}
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                      rotateY: [0, 360],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="relative"
                  >
                    <div className="w-32 h-32 bg-gradient-to-br from-[#E99500] to-[#ff6b00] rounded-2xl flex items-center justify-center shadow-lg shadow-[#E99500]/50">
                      {selectedPack &&
                        React.createElement(getPackIcon((selectedPack as any).rarity), {
                          className: "w-16 h-16 text-black",
                        })}
                    </div>
                  </motion.div>

                  {/* Status Text */}
                  <div className="text-center space-y-4">
                    <motion.h2
                      animate={{
                        opacity: [0.5, 1, 0.5],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="text-4xl md:text-6xl font-bold text-white"
                    >
                      Opening Pack...
                    </motion.h2>

                    <motion.p
                      animate={{
                        opacity: [0.3, 0.7, 0.3],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="text-xl text-[#E99500]"
                    >
                      Processing transaction on blockchain
                    </motion.p>

                    {/* Animated dots */}
                    <div className="flex justify-center gap-2">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          animate={{
                            scale: [1, 1.5, 1],
                            opacity: [0.3, 1, 0.3],
                          }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            delay: i * 0.2,
                          }}
                          className="w-3 h-3 bg-[#E99500] rounded-full"
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* FASE 2 e 3: Spinning e Revealing - Roleta em tela cheia */}
              {(openingPhase === "spinning" ||
                openingPhase === "revealing") && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 100 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    y: 0,
                  }}
                  transition={{ duration: 0.5, type: "spring" }}
                  className="w-full max-w-6xl px-4"
                >
                  <div className="relative bg-black/30 backdrop-blur-xl rounded-3xl p-4 md:p-8 border-2 border-[#E99500]/50 shadow-[0_0_60px_rgba(233,149,0,0.3)]">
                    {/* Center Line */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-[#E99500] z-20 transform -translate-x-1/2 shadow-[0_0_40px_rgba(233,149,0,1)]">
                      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                        <motion.div
                          animate={{
                            y: [0, 8, 0],
                          }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                          className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[16px] border-l-transparent border-r-transparent border-t-[#E99500] drop-shadow-[0_0_10px_rgba(233,149,0,1)]"
                        />
                      </div>
                    </div>

                    {/* Roulette */}
                    <div className="overflow-hidden py-6">
                      <div
                        ref={rouletteRef}
                        className="flex gap-3 md:gap-4"
                        style={{
                          transform: "translateX(0px)",
                          transition: "none",
                        }}
                      >
                        {spinItems.map((item, index) => (
                          <div
                            key={index}
                            className="flex-shrink-0 w-32 md:w-40 h-44 md:h-56 relative"
                          >
                            <Card
                              className={`w-full h-full bg-gradient-to-br ${getRarityColor(
                                item.rarity
                              )} p-3 md:p-4 border-2 ${getRarityBorderColor(
                                item.rarity
                              )} flex flex-col items-center justify-center space-y-2 shadow-lg`}
                            >
                              <div className="w-full h-20 md:h-28 flex items-center justify-center bg-black/30 rounded-lg">
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  className="max-w-full max-h-full object-contain"
                                />
                              </div>
                              {/* Rarity badge */}
                              <div className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border border-white/20 bg-black/30 text-white/90">
                                {(item.rarity || '').toString()}
                              </div>
                              <p className="text-white text-xs font-bold text-center px-1 min-h-[2rem] flex items-center justify-center">
                                {item.name || 'Mystery Skin'}
                              </p>
                              <p className="text-white text-sm md:text-base font-bold">
                                $
                                {typeof item.value === "number"
                                  ? item.value.toFixed(2)
                                  : parseFloat(item.value || "0").toFixed(2)}
                              </p>
                            </Card>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content (blurred when opening) */}
      <div
        className={`transition-all duration-500 ${
          openingPhase ? "blur-xl pointer-events-none" : ""
        }`}
      >
        {/* Main Content */}
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Hero */}
          <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-gradient-to-b from-zinc-950 to-zinc-900">
            <img
              src="/assets/2.jpg"
              alt="Dust3 Pack"
              className="w-full h-[220px] md:h-[320px] object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-white">
                  Dust3 Promo Pack
                </h2>
                <p className="text-zinc-300">
                  Open packs inspired by CS classics. Provably fair, instant
                  delivery.
                </p>
              </div>
            </div>
          </div>

          {/* Odds Section */}
          <div className="grid lg:grid-cols-3 gap-6 items-stretch">
            {/* Left: Pack Preview + Compact Packs (LG+) */}
            <div className="rounded-2xl overflow-hidden border border-zinc-800 bg-gradient-to-b from-zinc-950 to-zinc-900 flex flex-col">
              <div className="relative w-full h-[260px] md:h-[320px] lg:h-[360px]">
                <img
                  src="/dust3.jpeg"
                  alt="Dust3 Pack Preview"
                  className="w-full h-full object-cover"
                />
                {/* Supply Status Overlay */}
                {selectedPack?.supply?.maxSupply && (
                  <div className="absolute top-4 right-4">
                    <div
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-sm border ${
                        selectedPack.supply.isSoldOut
                          ? "bg-red-500/20 border-red-500/30"
                          : "bg-green-500/20 border-green-500/30"
                      }`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full ${
                          selectedPack.supply.isSoldOut
                            ? "bg-red-400"
                            : "bg-green-400"
                        }`}
                      />
                      <span className="text-xs font-medium text-white">
                        {selectedPack.supply.isSoldOut
                          ? "Out of Stock"
                          : "In Stock"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <div className="hidden lg:block border-t border-zinc-800 p-3">
                <div className="grid grid-cols-2 gap-3">
                  {/* Compact list of published packs */}
                  {boxes.slice(0, 4).map((pack) => (
                    <button
                      key={pack.id}
                      onClick={() => !openingPhase && setSelectedPack(pack)}
                      className={`group text-left rounded-lg border px-3 py-3 bg-gradient-to-b from-zinc-950 to-zinc-900 transition-colors ${
                        selectedPack?.id === pack.id
                          ? "border-[#E99500]"
                          : "border-zinc-800 hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <img
                            src={(pack as any).imageUrl || "/dust3.jpeg"}
                            alt={pack.name}
                            className="w-10 h-10 rounded object-cover border border-zinc-800"
                          />
                          {/* Supply Status Dot */}
                          {pack.supply?.maxSupply && (
                            <div
                              className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-zinc-950 ${
                                pack.supply.isSoldOut
                                  ? "bg-red-400"
                                  : "bg-green-400"
                              }`}
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-foreground font-semibold truncate">
                            {pack.name}
                          </p>
                          <p className="text-[10px] text-zinc-400">
                            {parseFloat(pack.priceSol).toFixed(2)} SOL
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Details and Odds (span 2) */}
            <div className="lg:col-span-2 rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-950 to-zinc-900 p-6 md:sticky md:top-6 transition-transform duration-200 hover:scale-[1.01] hover:border-zinc-700">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-foreground">
                    {selectedPack?.name || "Promo Pack"}
                  </h3>
                  {(selectedPack as any)?.description && (
                    <p className="text-zinc-400 text-sm mt-1 line-clamp-2">
                      {(selectedPack as any).description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-3xl font-bold text-foreground">
                      {selectedPack
                        ? parseFloat(selectedPack.priceSol).toFixed(2)
                        : "—"}{" "}
                      SOL
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedPack
                        ? `$${parseFloat(
                            String(
                              selectedPack.priceUsdc ?? selectedPack.priceSol
                            )
                          ).toFixed(2)}`
                        : ""}
                    </p>
                  </div>
                  <Button
                    onClick={handleOpenPack}
                    disabled={
                      openingPhase !== null ||
                      !connected ||
                      selectedPack?.supply?.isSoldOut
                    }
                    className={`px-6 py-6 ml-4 font-semibold rounded-lg transition-transform duration-150 ${
                      openingPhase
                        ? "bg-zinc-700 cursor-not-allowed"
                        : selectedPack?.supply?.isSoldOut
                        ? "bg-red-500/20 text-red-400 cursor-not-allowed"
                        : "bg-zinc-100 text-black hover:bg-white hover:scale-[1.02] active:scale-[0.99]"
                    }`}
                  >
                    <span className="mr-2 ml-2">
                      {selectedPack?.supply?.isSoldOut
                        ? "Sold Out"
                        : "Open Pack"}
                    </span>
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M5 12h14M13 5l7 7-7 7"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </Button>
                </div>
              </div>

              {/* Odds List */}
              <div className="space-y-2">
                {oddsToUse.map(
                  (
                    o: {
                      label?: string;
                      rarity?: string;
                      pct?: number;
                      odds?: number;
                    },
                    idx: number
                  ) => {
                    const label = (o.label || o.rarity || "").toString();
                    const rarityKey = (o.rarity || label).toLowerCase();
                    const pctNum =
                      typeof o.pct === "number"
                        ? o.pct
                        : Number((o as any).odds ?? 0);
                    const denom = pctNum > 0 ? Math.round(100 / pctNum) : 0;
                    return (
                      <div
                        key={idx}
                        className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`inline-block size-2 rounded-full bg-gradient-to-r ${getRarityColor(
                              rarityKey
                            )}`}
                          />
                          <span className="text-sm text-foreground font-medium uppercase flex-1">
                            {label}
                          </span>
                          <span className="text-xs text-zinc-400 mr-2">
                            {denom > 0 ? `~1 in ${denom}` : "—"}
                          </span>
                          <span className="px-2 py-0.5 text-xs rounded-full bg-zinc-900 text-zinc-200 border border-zinc-800">
                            {pctNum.toFixed(1)}%
                          </span>
                        </div>
                        <div className="mt-2 h-2 w-full rounded-full bg-zinc-800 overflow-hidden border border-zinc-700">
                          <div
                            className={`h-full bg-gradient-to-r ${getRarityColor(
                              rarityKey
                            )}`}
                            style={{
                              width: `${Math.min(100, Math.max(0, pctNum))}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  }
                )}
                <div className="flex items-center justify-between pt-2">
                  <p className="text-[11px] text-zinc-500">
                    Probabilities are estimates and may vary per pack.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Pack Selection */}
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 animate-spin text-[#E99500] mx-auto mb-4" />
              <p className="text-gray-400">Loading packs...</p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Result Modal */}
      <AnimatePresence>
        {showResult && wonSkin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowResult(false)}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0, rotateY: -180 }}
              animate={{ scale: 1, opacity: 1, rotateY: 0 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: "spring", duration: 0.8, bounce: 0.4 }}
              className="relative max-w-2xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <Card
                className={`bg-gradient-to-br ${getRarityColor(
                  wonSkin.rarity
                )} p-8 border-4 border-white/30 shadow-2xl relative overflow-hidden`}
              >
                {/* Animated background effect */}
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.6, 0.3],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                  }}
                  className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"
                />

                <div className="text-center space-y-6 relative z-10">
                  {/* Skin Image */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{
                      scale: [0, 1.3, 1],
                      rotateY: [0, 360, 360],
                    }}
                    transition={{ duration: 1, times: [0, 0.6, 1] }}
                    className="w-64 h-64 mx-auto flex items-center justify-center bg-black/30 rounded-lg"
                  >
                    <img
                      src={wonSkin.image}
                      alt={wonSkin.name}
                      className="max-w-full max-h-full object-contain drop-shadow-2xl p-4"
                    />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="space-y-2"
                  >
                    <Badge className="bg-black/30 text-white border-white/20 text-lg px-4 py-1 uppercase">
                      {wonSkin.rarity}
                    </Badge>
                    <h2 className="text-3xl font-bold text-white px-4">
                      {wonSkin.name}
                    </h2>
                    <motion.p
                      animate={{
                        scale: [1, 1.1, 1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                      }}
                      className="text-5xl font-bold text-white"
                    >
                      ${wonSkin.value.toFixed(2)}
                    </motion.p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="flex gap-4 justify-center pt-4"
                  >
                    <Button
                      onClick={async () => {
                        try {
                          // Find the case opening ID from the won skin
                          // In production, store this in state when opening
                          toast.success("Skin claimed to inventory!");
                          setShowResult(false);
                        } catch (error) {
                          console.error("Failed to claim skin:", error);
                          toast.error("Failed to claim skin");
                        }
                      }}
                      size="lg"
                      className="bg-white text-black hover:bg-gray-200 font-bold px-8"
                    >
                      <Unlock className="w-5 h-5 mr-2" />
                      Claim Skin
                    </Button>
                    <Button
                      onClick={async () => {
                        try {
                          // In production, make API call to sell
                          toast.success(
                            `Sold for $${(wonSkin.value * 0.85).toFixed(2)}`
                          );
                          setShowResult(false);
                        } catch (error) {
                          console.error("Failed to sell skin:", error);
                          toast.error("Failed to sell skin");
                        }
                      }}
                      size="lg"
                      variant="outline"
                      className="bg-transparent border-2 border-white text-white hover:bg-white/20 font-bold px-8"
                    >
                      <TrendingUp className="w-5 h-5 mr-2" />
                      Sell (85%)
                    </Button>
                  </motion.div>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
