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
import { casesService, marketplaceService, boxesService, authService } from "@/lib/services";
import { discordService } from "@/lib/services/discord.service";
import { pendingSkinsService } from "@/lib/services/pending-skins.service";
import { apiClient } from "@/lib/services/api";
import { PublicKey } from '@solana/web3.js';
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
  const isRevealingRef = useRef(false);
  const isOpeningRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [openingPhase, setOpeningPhase] = useState<
    "waiting" | null
  >(null);
  const [wonSkin, setWonSkin] = useState<CSGOSkin | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [lastPackResult, setLastPackResult] = useState<{ signature: string; asset: string } | null>(null);
  const [userTradeUrl, setUserTradeUrl] = useState<string | null>(null);

  // Calculate real odds from box skins in database
  const calculateRealOdds = async (boxId: string) => {
    try {
      // Fetch box skins distribution from backend
      const response = await fetch(`/api/v1/box-skins/box/${boxId}/distribution`);
      const data = await response.json();
      
      if (!data.success) {
        console.warn('Failed to fetch box skin distribution:', data.error);
        return DEFAULT_ODDS;
      }

      const distribution = data.data;
      console.log('Box skin distribution:', distribution);

      // Convert distribution to odds format
      const totalSkins = Object.values(distribution).reduce((sum: number, count: any) => sum + count, 0);
      
      if (totalSkins === 0) {
        console.warn('No skins found in box distribution');
        return DEFAULT_ODDS;
      }

      const odds = [
        {
          label: "Legendary",
          rarity: "legendary",
          pct: ((distribution.legendary || 0) / totalSkins) * 100,
        },
        {
          label: "Epic", 
          rarity: "epic",
          pct: ((distribution.epic || 0) / totalSkins) * 100,
        },
        {
          label: "Rare",
          rarity: "rare", 
          pct: ((distribution.rare || 0) / totalSkins) * 100,
        },
        {
          label: "Uncommon",
          rarity: "uncommon",
          pct: ((distribution.uncommon || 0) / totalSkins) * 100,
        },
        {
          label: "Common",
          rarity: "common",
          pct: ((distribution.common || 0) / totalSkins) * 100,
        },
      ];

      console.log('Calculated real odds from box skins:', odds);
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

  // Set wallet address in API client when wallet connects/disconnects
  useEffect(() => {
    if (connected && publicKey) {
      apiClient.setWalletAddress(publicKey.toString());
    } else {
      apiClient.setWalletAddress(null);
    }
  }, [connected, publicKey]);

  // Load boxes from database
  useEffect(() => {
    loadBoxes(); // Load boxes from database
  }, []);

  // Calculate real odds when pack is selected
  useEffect(() => {
    if (selectedPack && selectedPack.id) {
      calculateRealOdds(selectedPack.id).then(setOddsToUse);
    }
  }, [selectedPack]);

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
      // Show all active boxes (both published and unpublished)
      const activeBoxes = Array.isArray(data) ? data : [];
      setBoxes(activeBoxes);
      console.log("loadBoxes - boxes state set");
      // Set the first box as selected pack if none is selected
      if (activeBoxes.length > 0 && !selectedPack) {
        setSelectedPack(activeBoxes[0] as any);
        console.log("loadBoxes - selectedPack set to:", activeBoxes[0]);
      }
    } catch (error) {
      console.error("Failed to load boxes:", error);
      toast.error("Failed to load boxes");
    } finally {
      setLoading(false);
      setLoadingBoxes(false);
    }
  };



  // When user changes selected pack, calculate odds
  useEffect(() => {
    if (selectedPack) {
      // Odds will be calculated automatically by the other useEffect
    }
  }, [selectedPack]);

  // Fetch user's trade URL on component mount
  useEffect(() => {
    const fetchUserTradeUrl = async () => {
      try {
        const userProfile = await authService.getProfile();
        setUserTradeUrl(userProfile.tradeUrl || null);
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
        setUserTradeUrl(null);
      }
    };

    if (connected) {
      void fetchUserTradeUrl();
    }
  }, [connected]);




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

    try {
      if (isOpeningRef.current) return;
      isOpeningRef.current = true;

      // Use the Candy Machine pack opening service
      const { packOpeningService } = await import("@/lib/services/packOpening.service");
      
      toast.loading("Minting NFT from Candy Machine...", { id: "mint" });
      
      // Open pack using Candy Machine
      const result = await packOpeningService.openPack(
        selectedPack.id,
        walletCtx,
        null // connection will be handled by the service
      );

      console.log("Pack opened successfully:", result);
      setLastPackResult({ signature: result.signature, asset: result.nftMint });

      toast.success(`Pack opened successfully!`, {
        duration: 5000,
        id: "mint"
      });

      // Show transaction link
      const explorerUrl = `https://solana.fm/tx/${result.signature}?cluster=devnet-solana`;
      toast(`🔍 View transaction: ${explorerUrl}`, {
        duration: 10000,
        icon: '🔗'
      });

      // 2. Use the skin data from the pack opening result
      const winnerSkin: CSGOSkin = {
        id: result.skin.id,
        name: result.skin.name,
        rarity: result.skin.rarity,
        value: result.skin.basePriceUsd,
        image: result.skin.imageUrl || '/assets/skins/img1.png'
      };

      setWonSkin(winnerSkin);
      
                // Store the won skin in database as pending (smart logic)
                // Store as pending if: user doesn't have Steam trade URL OR user doesn't click buyback
                // This allows user to claim later from inventory if they set up Steam URL later
                try {
                  if (walletCtx.publicKey) {
                    await pendingSkinsService.createPendingSkin({
                      userId: walletCtx.publicKey.toString(),
                      skinName: result.skin.name,
                      skinRarity: result.skin.rarity,
                      skinWeapon: result.skin.weapon,
                      skinValue: result.skin.basePriceUsd,
                      skinImage: result.skin.imageUrl || '',
                      nftMintAddress: result.nftMint,
                      transactionHash: result.signature,
                      caseOpeningId: `pack-${Date.now()}`,
                    });
                    console.log('💾 Stored pending skin in database:', winnerSkin.name);
                  }
                } catch (error) {
                  console.error('Failed to store pending skin in database:', error);
                }

                // Create case opening record for activity tracking
                try {
                  if (walletCtx.publicKey) {
                    await packOpeningService.createCaseOpeningRecord({
                      userId: walletCtx.publicKey.toString(),
                      boxId: selectedPack.id,
                      nftMint: result.nftMint,
                      skinName: result.skin.name,
                      skinRarity: result.skin.rarity,
                      skinWeapon: result.skin.weapon,
                      skinValue: result.skin.basePriceUsd,
                      skinImage: result.skin.imageUrl || '',
                      transactionHash: result.signature,
                    });
                    console.log('📊 Created case opening record for activity tracking');
                  }
                } catch (error) {
                  console.error('Failed to create case opening record:', error);
                }

      // Show result modal directly (no duplicate reveal animation)
      setShowResult(true);
      setOpeningPhase(null);
      toast.success(`You won ${winnerSkin.name}!`, {
        icon: "🎉",
        duration: 4000,
      });

    } catch (error) {
      console.error("Error opening pack:", error);
      toast.error(error instanceof Error ? error.message : "Failed to open pack", { id: "mint" });
      setOpeningPhase(null);
    } finally {
      isOpeningRef.current = false;
    }
  };

  const handleBuyback = async () => {
    if (!lastPackResult) {
      toast.error("No NFT to buyback!");
      return;
    }

    if (!connected || !publicKey) {
      toast.error("Please connect your wallet!");
      return;
    }

    try {
      toast.loading("Calculating buyback amount...", { id: "buyback" });

      // Calculate buyback amount
      const calcResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/v1/buyback/calculate/${lastPackResult.asset}`
      );
      const calcData = await calcResponse.json();

      if (!calcData.success) {
        toast.error("Failed to calculate buyback", { id: "buyback" });
        return;
      }

      toast.success(`Buyback: ${calcData.data.buybackAmount} SOL`, { id: "buyback" });
      console.log("Buyback calculation:", calcData.data);

      toast.loading("Requesting buyback transaction...", { id: "buyback-tx" });
      
      const walletAddress = publicKey.toBase58();
      console.log("Sending buyback request with wallet:", walletAddress);
      
      const txResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/v1/buyback/request`,
        {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            nftMint: lastPackResult.asset,
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
      
      if (!signTransaction) {
        toast.error("Wallet does not support signing transactions.", { id: "buyback-tx" });
        return;
      }

      const { Transaction } = await import("@solana/web3.js");
      const recoveredTransaction = Transaction.from(Buffer.from(transaction, 'base64'));
      
      toast.loading("Please sign the transaction in your wallet...", { id: "buyback-sign" });
      const signedTx = await signTransaction(recoveredTransaction);
      const rawTransaction = signedTx.serialize();

      toast.loading("Confirming buyback...", { id: "buyback-confirm" });
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      try {
        const confirmResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/v1/buyback/confirm`,
          {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              nftMint: lastPackResult.asset,
              walletAddress: publicKey.toBase58(),
              signedTransaction: Buffer.from(rawTransaction).toString('base64'),
            }),
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);

        if (!confirmResponse.ok) {
          const errorText = await confirmResponse.text();
          throw new Error(`HTTP ${confirmResponse.status}: ${errorText}`);
        }

        const confirmData = await confirmResponse.json();

        if (confirmData.success) {
          toast.success("NFT successfully bought back!", { id: "buyback-confirm" });
          console.log("Buyback confirmed:", confirmData.data);
          
          // Remove pending skin from database since NFT was bought back
          try {
            if (walletCtx.publicKey && lastPackResult) {
              // Delete pending skin since NFT was burned
              await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/v1/pending-skins/by-nft/${lastPackResult.asset}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  walletAddress: walletCtx.publicKey.toString(),
                }),
              });
              console.log('🗑️ Removed pending skin from database after buyback');
            }
          } catch (error) {
            console.error('Failed to remove pending skin after buyback:', error);
          }
          
          setLastPackResult(null);
          setShowResult(false);
          setWonSkin(null);
        } else {
          toast.error(confirmData.error?.message || "Failed to confirm buyback", { id: "buyback-confirm" });
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          // Transaction was successful on-chain but backend confirmation timed out
          // Show success message and proceed anyway
          toast.success("NFT successfully bought back! (Transaction confirmed on-chain)", { id: "buyback-confirm" });
          console.log("Buyback transaction successful on-chain, proceeding despite timeout");
          
          // Remove pending skin from database since NFT was bought back
          try {
            if (walletCtx.publicKey && lastPackResult) {
              await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/v1/pending-skins/by-nft/${lastPackResult.asset}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  walletAddress: walletCtx.publicKey.toString(),
                }),
              });
              console.log('🗑️ Removed pending skin from database after buyback');
            }
          } catch (error) {
            console.error('Failed to remove pending skin after buyback:', error);
          }
          
          setLastPackResult(null);
          setShowResult(false);
          setWonSkin(null);
        } else {
          toast.error(`Buyback confirmation failed: ${fetchError.message}`, { id: "buyback-confirm" });
        }
        console.error("Buyback confirmation error:", fetchError);
      }

    } catch (error: any) {
      console.error("Buyback failed:", error);
      toast.error(error.message || "Failed to buyback NFT");
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

                  {/* Steam Trade URL Warning */}
                  {userTradeUrl === null && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                      className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4 mb-4 mx-4"
                    >
                      <div className="flex items-center gap-2 text-yellow-200">
                        <Lock className="w-5 h-5" />
                        <span className="font-semibold">Steam Trade URL Required</span>
                      </div>
                      <p className="text-yellow-100 text-sm mt-1">
                        You need to set up your Steam Trade URL in your profile to claim this skin. Your skin will be saved and waiting for you!
                      </p>
                      <Link 
                        href="/app-dashboard/profile" 
                        className="text-yellow-200 underline text-sm hover:text-yellow-100 mt-2 inline-block"
                      >
                        Go to Profile Settings →
                      </Link>
                    </motion.div>
                  )}

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="flex gap-4 justify-center pt-4"
                  >
                    <Button
                      disabled={userTradeUrl === null}
                      onClick={async () => {
                        try {
                          // Check if user has Steam Trade URL set up
                          const userProfile = await authService.getProfile();
                          if (!userProfile.tradeUrl || userProfile.tradeUrl.trim() === '') {
                            toast.error("Please set up your Steam Trade URL in your profile before claiming skins!");
                            return;
                          }

                          // Create Discord ticket for skin claim
                          if (wonSkin) {
                            console.log('🎫 Creating Discord ticket for claimed skin:', wonSkin);
                            await discordService.createSkinClaimTicket({
                              userId: walletCtx.publicKey?.toString() || 'unknown',
                              walletAddress: walletCtx.publicKey?.toString() || 'unknown',
                              steamTradeUrl: userProfile.tradeUrl,
                              skinName: wonSkin.name,
                              skinRarity: wonSkin.rarity,
                              skinWeapon: wonSkin.name.split(' | ')[0] || 'Unknown',
                              nftMintAddress: lastPackResult?.asset || 'unknown',
                              openedAt: new Date(),
                              caseOpeningId: `pack-${Date.now()}`,
                            });
                            console.log('✅ Discord ticket created successfully for:', wonSkin.name);
                          }
                          
                          toast.success("Skin claimed to inventory!");
                          
                          // Remove pending skin from database since it was claimed
                          try {
                            if (walletCtx.publicKey && lastPackResult) {
                              await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/v1/pending-skins/by-nft/${lastPackResult.asset}`, {
                                method: "DELETE",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  walletAddress: walletCtx.publicKey.toString(),
                                }),
                              });
                              console.log('🗑️ Removed pending skin from database after claim');
                            }
                          } catch (error) {
                            console.error('Failed to remove pending skin after claim:', error);
                          }
                          
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
                      onClick={handleBuyback}
                      size="lg"
                      variant="outline"
                      className="bg-transparent border-2 border-white text-white hover:bg-white/20 font-bold px-8"
                    >
                      <TrendingUp className="w-5 h-5 mr-2" />
                      Buyback NFT
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
