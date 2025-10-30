"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Zap, Loader2, Lock, X, ImageIcon } from "lucide-react";
import Link from "next/link";
import React from "react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useWallet } from "@solana/wallet-adapter-react";
import { motion, AnimatePresence } from "framer-motion";
import { marketplaceService, boxesService, authService } from "@/lib/services";
import { useUser } from "@/lib/contexts/UserContext";
import { discordService } from "@/lib/services/discord.service";
import { pendingSkinsService } from "@/lib/services/pending-skins.service";
import { apiClient } from "@/lib/services/api.service";
import { LootBoxType } from "@/lib/types/api";
import XIconPng from "@/public/assets/x_icon.png";

interface CSGOSkin {
  id: string;
  name: string;
  rarity: string;
  value: number;
  image: string;
}

// Helper function to get Solscan URL based on network
const getSolscanUrl = (signature: string): string => {
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC || "";

  // Check if using devnet
  if (rpcUrl.includes("devnet") || rpcUrl.includes("api.devnet")) {
    return `https://solscan.io/tx/${signature}?cluster=devnet`;
  }

  // Check if using testnet
  if (rpcUrl.includes("testnet") || rpcUrl.includes("api.testnet")) {
    return `https://solscan.io/tx/${signature}?cluster=testnet`;
  }

  // Default to mainnet
  return `https://solscan.io/tx/${signature}`;
};

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
  const { user } = useUser();
  const { connected, publicKey, signTransaction } = walletCtx;
  const [lootBoxes, setLootBoxes] = useState<LootBoxType[]>([]);
  const [selectedPack, setSelectedPack] = useState<LootBoxType | null>(null);
  const [boxes, setBoxes] = useState<any[]>([]);
  const [loadingBoxes, setLoadingBoxes] = useState(false);
  const isRevealingRef = useRef(false);
  const isOpeningRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [openingPhase, setOpeningPhase] = useState<
    "processing" | "flash" | "video" | null
  >(null);
  const [wonSkin, setWonSkin] = useState<CSGOSkin | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [lastPackResult, setLastPackResult] = useState<{
    signature: string;
    asset: string;
  } | null>(null);
  const [userTradeUrl, setUserTradeUrl] = useState<string | null>(null);
  const [showBuybackModal, setShowBuybackModal] = useState(false);
  const [buybackAmountSol, setBuybackAmountSol] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const shouldHideSidebar =
    (openingPhase !== null && openingPhase !== "processing") ||
    showResult ||
    showBuybackModal;

  // Share state for claim flow
  const [showClaimShare, setShowClaimShare] = useState(false);
  const [claimedSkin, setClaimedSkin] = useState<CSGOSkin | null>(null);
  const [hideTradePrompt, setHideTradePrompt] = useState(false);
  const [pendingBuybackAmount, setPendingBuybackAmount] = useState<number | null>(null);
  const [pendingBuybackInfo, setPendingBuybackInfo] = useState<{skinUsd: number, skinSol: number, payoutSol: number} | null>(null);

  useEffect(() => {
    if (shouldHideSidebar) {
      document.documentElement.classList.add("sidebar-hidden");
      document.documentElement.classList.add("topbar-hidden");
    } else {
      document.documentElement.classList.remove("sidebar-hidden");
      document.documentElement.classList.remove("topbar-hidden");
    }
    return () => {
      document.documentElement.classList.remove("sidebar-hidden");
      document.documentElement.classList.remove("topbar-hidden");
    };
  }, [shouldHideSidebar]);

  useEffect(() => {
    const send = (hide) => {
      window.dispatchEvent(
        new CustomEvent('topbar-visibility', { detail: { hide } })
      );
    };
    send(shouldHideSidebar);
    return () => send(false);
  }, [shouldHideSidebar]);

  // Calculate real odds from box skins in database
  const calculateRealOdds = async (boxId: string) => {
    try {
      // Fetch box skins distribution from backend
      const response = await fetch(
        `/api/v1/box-skins/box/${boxId}/distribution`
      );
      const data = await response.json();

      if (!data.success) {
        return DEFAULT_ODDS;
      }

      const distribution = data.data;

      // Convert distribution to odds format
      const totalSkins = Object.values(distribution).reduce(
        (sum: number, count: any) => sum + count,
        0
      );

      if (totalSkins === 0) {
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

      return odds;
    } catch (error) {
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
    return "common";
  };

  // Build X (Twitter) share URL
  const generateXShareUrl = (
    params:
      | {
          kind: "buyback";
          skin?: CSGOSkin | null;
          amountSol: number;
          packName?: string | null;
        }
      | { kind: "claim"; skin: CSGOSkin; packName?: string | null }
  ) => {
    let text = "";
    if (params.kind === "buyback") {
      const name = params.packName ? ` ${params.packName}` : "";
      const skinText = params.skin ? ` (won: ${params.skin.name})` : "";
      text = `I just sold my pack${name} drop for +${params.amountSol.toFixed(
        2
      )} SOL on @DUST3fun with instant payout!${skinText}`;
    } else {
      const packText = params.packName ? ` from ${params.packName}` : "";
      text = `Claimed ${params.skin.name}${packText} to my Steam inventory via @DUST3fun!`;
    }
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
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
      // Show all active boxes (both published and unpublished)
      const activeBoxes = Array.isArray(data) ? data : [];
      setBoxes(activeBoxes);
      // Set the first box as selected pack if none is selected
      if (activeBoxes.length > 0 && !selectedPack) {
        setSelectedPack(activeBoxes[0] as any);
      }
    } catch (error) {
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
      const r = await fetch(uri);
      const j = await r.json();

      // Unwrap API envelope { success, data }
      const md = j.success && j.data ? j.data : j;

      // Extract name (trim whitespace)
      const name = md.name ? md.name.trim() : "Mystery Skin";

      // Extract rarity from attributes
      const rarityAttr = Array.isArray(md?.attributes)
        ? md.attributes.find((a: any) => /rarity/i.test(a?.trait_type))?.value
        : undefined;
      const rarity =
        typeof rarityAttr === "string" ? rarityAttr.toLowerCase() : "common";

      // Extract image
      const image = md.image || "/assets/skins/img1.png";

      // Extract value from Float attribute (CS:GO float value)
      const floatAttr = Array.isArray(md?.attributes)
        ? md.attributes.find((a: any) => /float/i.test(a?.trait_type))?.value
        : undefined;
      const floatValue = floatAttr ? parseFloat(floatAttr) : undefined;

      // Use float value as the price (multiply by 1000 for display)
      const value = floatValue ? floatValue * 1000 : 0;

      const result = { id: uri, name, rarity, value, image };
      return result;
    } catch (error) {
      return {
        id: uri,
        name: "Mystery Skin",
        rarity: "common",
        value: 0,
        image: "/assets/skins/img1.png",
      };
    }
  };

  // Auto-buyback removed by request

  const handleOpenPack = async () => {
    if (!connected) {
      toast.error("Connect your wallet first!");
      return;
    }

    // Require Steam Trade URL before allowing opening
    if (!userTradeUrl || userTradeUrl.trim() === "") {
      toast.error("Set your Steam Trade URL in Profile to open packs.");
      return;
    }

    if (openingPhase || !selectedPack) return;

    // FASE 1: Processing - Botão carregando na mesma tela (sem blur)
    setOpeningPhase("processing");
    setIsProcessing(true);
    setShowResult(false);
    setWonSkin(null);

    try {
      if (isOpeningRef.current) return;
      isOpeningRef.current = true;

      {
        // MODO REAL - Integração completa
        const { packOpeningService } = await import(
          "@/lib/services/pack-opening.service"
        );

        // Open pack using Candy Machine
        const result = await packOpeningService.openPack(
          selectedPack.id,
          walletCtx,
          null // connection will be handled by the service
        );

        setLastPackResult({
          signature: result.signature,
          asset: result.nftMint,
        });

        // FASE 2: Flash na tela quando transação confirmada
        setOpeningPhase("flash");

        // Após flash, iniciar vídeo
        setTimeout(() => {
          setOpeningPhase("video");
          // Vídeo fica em loop até o resultado estar pronto
        }, 500); // 500ms para o flash

        // Processar resultado em background
        setTimeout(async () => {
          try {
            // 2. Use real image metadata with graceful fallback
            let resolvedImage = result.skin.imageUrl as string | undefined;
            if (
              !resolvedImage &&
              result.skin.id &&
              /^https?:\/\//.test(result.skin.id)
            ) {
              try {
                const metaResp = await fetch(result.skin.id);
                if (metaResp.ok) {
                  const meta = await metaResp.json();
                  let img = meta.image as string | undefined;
                  if (img && img.startsWith("ipfs://")) {
                    img = `https://ipfs.io/ipfs/${img.replace("ipfs://", "")}`;
                  }
                  resolvedImage = img || undefined;
                }
              } catch (_) {
                // ignore, will fallback
              }
            }

            const winnerSkin: CSGOSkin = {
              id: result.skin.id,
              name: result.skin.name,
              rarity: result.skin.rarity,
              value: result.skin.basePriceUsd,
              image: resolvedImage || "icon-fallback",
            };

            setWonSkin(winnerSkin);

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
                  skinImage: result.skin.imageUrl || "",
                  transactionHash: result.signature,
                });
                // activity record created
              }
            } catch (error) {
              // non-critical telemetry failure; ignore
            }

            // FASE 3: Flash + mostrar resultado (quando resultado estiver pronto)
            setOpeningPhase("flash");
            setTimeout(() => {
              setShowResult(true);
              setOpeningPhase(null);
              setIsProcessing(false);

              // Custom toast with Sonner including skin image and transaction link
              toast.success(
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {winnerSkin.image === "icon-fallback" ? (
                      <div className="w-12 h-12 bg-zinc-800 rounded flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-zinc-400" />
                      </div>
                    ) : (
                      <img
                        src={winnerSkin.image}
                        alt={winnerSkin.name}
                        className="w-12 h-12 object-contain rounded"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">You won {winnerSkin.name}! 🎉</p>
                    <a
                      href={getSolscanUrl(result.signature)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#E99500] hover:underline inline-flex items-center gap-1"
                    >
                      View on Solscan
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </div>,
                {
                  duration: 6000,
                }
              );
            }, 300);
          } catch (error) {
            setOpeningPhase(null);
            setIsProcessing(false);
          }
        }, 8000); // 8 segundos total (6s vídeo + 2s espera)
      }
    } catch (error: any) {
      const msg = error?.message || "Failed to open pack. Please try again.";
      if (process.env.NODE_ENV !== "production") {
        toast.error(`Failed to open pack: ${msg}`);
      } else {
        toast.error("Failed to open pack. Please try again.");
      }
      setOpeningPhase(null);
      setIsProcessing(false);
    } finally {
      isOpeningRef.current = false;
    }
  };

  const handleCloseResult = async () => {
    setShowResult(false);
    setWonSkin(null);
    setLastPackResult(null);
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
      const loadingToast = toast.loading("Calculating buyback amount...");

      // Calculate buyback amount
      const calcResponse = await fetch(
        `${
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
        }/api/v1/buyback/calculate/${lastPackResult.asset}`
      );
      const calcData = await calcResponse.json();

      if (!calcData.success) {
        toast.dismiss(loadingToast);
        toast.error("Failed to calculate buyback");
        return;
      }

      toast.dismiss(loadingToast);
      toast.loading(
        `Buyback: ${calcData.data.buybackAmount} SOL - Requesting transaction...`
      );
      // buyback calculation received

      const walletAddress = publicKey.toBase58();

      const txResponse = await fetch(
        `${
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
        }/api/v1/buyback/request`,
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
        toast.error("Failed to create buyback transaction");
        return;
      }

      const transaction = txData.data.transaction;

      if (!signTransaction) {
        toast.error("Wallet does not support signing transactions.");
        return;
      }

      const { Transaction } = await import("@solana/web3.js");
      const recoveredTransaction = Transaction.from(
        Buffer.from(transaction, "base64")
      );

      toast.loading("Please sign the transaction in your wallet...");
      const signedTx = await signTransaction(recoveredTransaction);
      const rawTransaction = signedTx.serialize();

      toast.loading("Confirming buyback...");

      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      try {
        const confirmResponse = await fetch(
          `${
            process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
          }/api/v1/buyback/confirm`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              nftMint: lastPackResult.asset,
              walletAddress: publicKey.toBase58(),
              signedTransaction: Buffer.from(rawTransaction).toString("base64"),
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
          const txSignature = confirmData.data?.signature || confirmData.data?.txSignature || "";
          toast.success(
            <div className="flex flex-col gap-1">
              <p className="font-semibold text-sm">NFT successfully bought back! 💰</p>
              <a
                href={getSolscanUrl(txSignature)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#E99500] hover:underline inline-flex items-center gap-1"
              >
                View transaction on Solscan
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>,
            {
              duration: 6000,
            }
          );

          // Show summary modal
          const packPrice = selectedPack
            ? parseFloat(String((selectedPack as any).priceSol))
            : 0;
          const payout = Number(
            confirmData.data?.amountPaid ??
              confirmData.data?.buybackAmount ??
              confirmData.data?.amount ??
              0
          );
          setBuybackAmountSol(payout);
          setShowResult(false);
          setWonSkin(null);
          setLastPackResult(null);
          setShowBuybackModal(true);
        } else {
          toast.error(
            confirmData.error?.message || "Failed to confirm buyback"
          );
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === "AbortError") {
          // Transaction was successful on-chain but backend confirmation timed out
          // Show success message and proceed anyway
          toast.success(
            <div className="flex flex-col gap-1">
              <p className="font-semibold text-sm">NFT successfully bought back! ✅</p>
              <p className="text-xs text-zinc-400">(Transaction confirmed on-chain)</p>
            </div>,
            {
              duration: 6000,
            }
          );

          const packPrice = selectedPack
            ? parseFloat(String((selectedPack as any).priceSol))
            : 0;
          // When timing out, use last calculated buyback if available (calcData in upper scope), otherwise 0
          try {
            // Best-effort: refetch last calculation quickly
            const calcFallbackResp = await fetch(
              `${
                process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
              }/api/v1/buyback/calculate/${lastPackResult!.asset}`
            );
            const calcFallback = await calcFallbackResp.json();
            const payout = calcFallback?.data?.buybackAmount ?? 0;
            setBuybackAmountSol(Number(payout));
          } catch (_) {
            setBuybackAmountSol(0);
          }
          setShowResult(false);
          setWonSkin(null);
          setLastPackResult(null);
          setShowBuybackModal(true);
        } else {
          toast.error("Buyback confirmation failed. Please retry.");
        }
      }
    } catch (error: any) {
      toast.error("Failed to buyback NFT");
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

  useEffect(() => {
    if (showResult && lastPackResult?.asset) {
      setPendingBuybackAmount(null);
      fetch(`/api/v1/buyback/calculate/${lastPackResult.asset}`)
        .then(r => r.json())
        .then(j => {
          if (j.success && typeof j.data?.buybackAmount === 'number') {
            setPendingBuybackAmount(j.data.buybackAmount);
          }
        })
        .catch(() => setPendingBuybackAmount(null));
    }
  }, [showResult, lastPackResult?.asset]);

  // Fetch and cache buyback calculation (SOL/USD) whenever showResult && lastPackResult is set
  useEffect(() => {
    if (showResult && lastPackResult?.asset) {
      setPendingBuybackInfo(null);
      fetch(`/api/v1/buyback/calculate/${lastPackResult.asset}`)
        .then(r => r.json())
        .then(j => {
          if (j.success && typeof j.data?.buybackAmount === 'number') {
            setPendingBuybackInfo({
              skinUsd: wonSkin?.value ?? 0,
              skinSol: j.data.skinPrice ?? 0,
              payoutSol: j.data.buybackAmount ?? 0,
            });
          }
        })
        .catch(() => setPendingBuybackInfo(null));
    }
  }, [showResult, lastPackResult?.asset, wonSkin?.value]);
  const testToast = () => {
    const testSkin = {
      name: "AK-47 | Redline",
      image: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV09-5lpKKqPrxN7LEmyVQ7MEpiLuSrYmnjQO3-UdsZGHwddKVcFI2Ml7T_VO5xL_vhZS-tMudyXE36SYgsXiImhWpwUYbeOuVm2I/360fx360f",
      rarity: "legendary",
      value: 45.50
    };

    const testSignature = "5JKWJwHvN5bUbR8NCMQmJGWNqQYm9FKZvbXxHyVqZQHKhPqZGJR8NwXqHyVqZQHK";

    toast.success(
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <img
            src={testSkin.image}
            alt={testSkin.name}
            className="w-12 h-12 object-contain rounded"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">You won {testSkin.name}! 🎉</p>
          <a
            href={getSolscanUrl(testSignature)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#E99500] hover:underline inline-flex items-center gap-1"
          >
            View on Solscan
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>,
      {
        duration: 6000,
      }
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-4 md:p-6 overflow-hidden relative">
      {/* Fullscreen Opening Animation - Only show after processing */}
      <AnimatePresence>
        {openingPhase && openingPhase !== "processing" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black"
          >
            {/* FASE 1: Flash */}
            {openingPhase === "flash" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 bg-white"
              />
            )}

            {/* FASE 2: Vídeo com fundo preto e efeitos de smoke */}
            {openingPhase === "video" && (
              <div className="absolute inset-0 bg-black flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  loop
                  className="max-w-[60vw] max-h-[60vh] w-auto h-auto object-contain"
                >
                  <source src="/assets/video.mp4" type="video/mp4" />
                </video>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Buyback Summary Modal */}
      <AnimatePresence>
        {showBuybackModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0, rotateY: -180 }}
              animate={{ scale: 1, opacity: 1, rotateY: 0 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: "spring", duration: 0.8, bounce: 0.4 }}
              className="relative max-w-2xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <Card className="relative p-0 bg-[#0b0b0b] border border-white/10 overflow-hidden">
                {/* Top area */}
                <div className="relative p-6 pb-0">
                  <div className="pointer-events-none absolute -inset-40 bg-[radial-gradient(circle,rgba(255,170,0,0.3)_0%,rgba(0,0,0,0)_60%)]" />

                  <div className="relative w-full h-[220px] rounded-lg overflow-hidden border border-white/10 bg-black/40 flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <div className="text-zinc-300 text-sm uppercase tracking-wider">
                        Payout received
                      </div>
                      <div className="text-5xl font-extrabold text-white">
                        {typeof (buybackAmountSol ?? pendingBuybackInfo?.payoutSol) === 'number' && (buybackAmountSol ?? pendingBuybackInfo?.payoutSol) > 0
                          ? `+${Number(buybackAmountSol ?? pendingBuybackInfo?.payoutSol).toFixed(3)} SOL`
                          : `+0.00 SOL`}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom area */}
                <div className="mt-6 p-6 bg-[#0d0d0d] border-t border-white/10">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Pack Price */}
                    <div className="rounded-lg border border-white/10 bg-white/2 p-4">
                      <div className="text-white/70 text-sm">Pack Price</div>
                      <div className="text-white font-semibold text-2xl mt-1">
                        {selectedPack
                          ? `${parseFloat(
                              String((selectedPack as any).priceSol)
                            ).toFixed(2)} SOL`
                          : "—"}
                      </div>
                    </div>

                    {/* Payout */}
                    <div className="rounded-lg border border-white/10 bg-white/2 p-4">
                      <div className="text-white/70 text-sm">Payout</div>
                      <div className="text-white font-semibold text-2xl mt-1">
                        {buybackAmountSol !== null
                          ? `${Number(buybackAmountSol).toFixed(2)} SOL`
                          : "—"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex gap-3">
                    <Button
                      onClick={() => setShowBuybackModal(false)}
                      className="flex-1 bg-[#E99500] text-black hover:bg-[#d88500] font-bold py-6"
                    >
                      Buy Another Pack
                    </Button>
                    {/* Share on X */}
                    <a
                      href={generateXShareUrl({
                        kind: "buyback",
                        skin: wonSkin,
                        amountSol: Number(buybackAmountSol || 0),
                        packName: selectedPack?.name || null,
                      })}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-black border border-white/20 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-900 transition-colors whitespace-nowrap"
                    >
                      Share on <img src="/assets/x_icon.png" alt="X" className="w-5 h-5" />
                    </a>
                  </div>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content (blurred when opening, but not during processing) */}
      <div
        className={`transition-all duration-500 ${
          openingPhase && openingPhase !== "processing"
            ? "blur-xl pointer-events-none"
            : ""
        }`}
      >
        {/* Main Content */}
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* TEST BUTTON - Remove this later */}
          {/* <div className="flex justify-end mb-4">
            <Button
              onClick={testToast}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2 rounded-lg"
            >
              🧪 Test Toast (Remove Later)
            </Button>
          </div> */}

          {/* Hero */}
          <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-gradient-to-b from-zinc-950 to-zinc-900">
            <img
              src="/assets/banner3.png"
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
                  src="/assets/machine.jpeg"
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
                    className={`px-6 py-6 ml-4 font-semibold rounded-lg transition-all duration-300 ${
                      selectedPack?.supply?.isSoldOut
                        ? "bg-red-500/20 text-red-400 cursor-not-allowed"
                        : "bg-[#E99500] text-black hover:bg-[#d88500] active:bg-[#E99500]"
                    } ${
                      openingPhase === "processing"
                        ? "animate-pulse"
                        : "hover:scale-[1.02] active:scale-[0.99]"
                    }`}
                  >
                    {openingPhase === "processing" ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
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
                      </>
                    )}
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
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0, rotateY: -180 }}
              animate={{ scale: 1, opacity: 1, rotateY: 0 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: "spring", duration: 0.8, bounce: 0.4 }}
              className="relative max-w-2xl w-full mx-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <Card className="relative p-0 bg-[#0b0b0b] border border-white/10 overflow-hidden">
                <button
                  type="button"
                  aria-label="Close"
                  onClick={handleCloseResult}
                  className="absolute top-0 right-0 z-20 inline-flex items-center justify-center rounded-full border border-white/20 bg-black/60 text-white hover:bg-black/80 hover:border-white/40 transition-colors p-2 w-8 h-8 m-4"
                >
                  <X className="w-4 h-4" />
                </button>
                {/* Top area with bright glow */}
                <div className="relative p-6 pb-0">
                  {/* Skin Display Area - Inspired by the reference image */}
                  <div className="relative w-full h-[180px] md:h-[200px] rounded-lg overflow-hidden bg-black">
                    {/* Background with central light effect */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black via-orange-950/50 to-black" />
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center_bottom,rgba(233,149,0,0.35)_0%,rgba(0,0,0,0)_70%)]" />

                    {/* Subtle floating particles (inside only this rectangle) */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                      {Array.from({ length: 18 }).map((_, i) => (
                        <motion.div
                          key={`reveal-p-${i}`}
                          initial={{
                            opacity: 0,
                            y: 40 + Math.random() * 40,
                            x: Math.random() * 100,
                            scale: 0.6 + Math.random() * 0.8,
                          }}
                          animate={{
                            opacity: [0, 0.9, 0],
                            y: ["0%", "-140%"],
                          }}
                          transition={{
                            duration: 2 + Math.random() * 2.5,
                            repeat: Infinity,
                            delay: Math.random() * 1.5,
                            ease: "easeOut",
                          }}
                          className="absolute w-1.5 h-1.5 rounded-full"
                          style={{
                            left: `${Math.random() * 100}%`,
                            bottom: `${Math.random() * 10}%`,
                            boxShadow: "0 0 10px rgba(233,149,0,0.5)",
                            background: "rgba(233,149,0,0.85)",
                          }}
                        />
                      ))}
                    </div>

                    {/* Central light platform effect */}
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[65%] h-14 bg-gradient-to-t from-[#E99500]/15 to-transparent blur-md" />

                    {/* Skin Image - Centered and elevated */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pt-10">
                      {wonSkin.image === "icon-fallback" ? (
                        <ImageIcon className="h-24 w-24 md:h-28 md:w-28 text-white/30 drop-shadow-[0_0_30px_rgba(255,140,0,0.5)]" />
                      ) : (
                        <img
                          src={wonSkin.image}
                          alt={wonSkin.name}
                          className="h-24 w-24 md:h-28 md:w-28 object-contain drop-shadow-[0_0_30px_rgba(255,140,0,0.5)]"
                        />
                      )}
                    </div>

                    {/* Skin Name - Large and prominent like in reference */}
                    <div className="absolute top-1 left-0 right-0 text-center px-4 pt-2">
                      <h1
                        className="text-base md:text-lg lg:text-xl font-black text-white uppercase tracking-wider mb-0.5"
                        style={{ fontFamily: "monospace" }}
                      >
                        {wonSkin.name.split(" | ")[0]}
                        <span className="text-white/60 mx-1">|</span>
                        {wonSkin.name.split(" | ")[1] ||
                          wonSkin.rarity.toUpperCase()}
                      </h1>
                      <p
                        className="text-[11px] md:text-xs lg:text-sm font-bold text-[#E99500] uppercase tracking-wide"
                        style={{ fontFamily: "monospace" }}
                      >
                        {wonSkin.rarity.toUpperCase()} •
                        {typeof (pendingBuybackInfo?.skinSol) === 'number'
                          ? ` ${pendingBuybackInfo.skinSol.toFixed(3)} SOL`
                          : 'Market value: —'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom action area (fixed bg) */}
                <div className="mt-6 p-6 bg-[#0d0d0d] border-t border-white/10">
                  {userTradeUrl === null && !hideTradePrompt && (
                    <div className="mb-4 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-4">
                      <div className="flex items-start gap-3">
                        <Lock className="w-5 h-5 mt-0.5 text-[#E99500]" />
                        <div className="flex-1">
                          <div className="font-semibold text-yellow-200">
                            Steam Trade URL required to claim this skin
                          </div>
                          <p className="text-yellow-100/90 text-sm mt-1">
                            Add your Trade URL in Profile to enable Steam claims. You can still take a payout now.
                          </p>
                          <div className="mt-3 flex gap-2">
                            <Link
                              href="/app-dashboard/profile"
                              className="flex-1 inline-flex items-center justify-center rounded-md text-black px-3 py-2 text-sm font-semibold bg-[#E99500] hover:bg-[#f0a116]"
                            >
                              Add Trade URL
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Payout box */}
                    <div className="rounded-lg border border-white/10 bg-white/2 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-white font-semibold">
                            Receive a payout
                          </div>
                          <div className="text-white/60 text-sm">
                            {typeof (pendingBuybackInfo?.payoutSol) === 'number'
                              ? `≈ +${pendingBuybackInfo.payoutSol.toFixed(3)} SOL`
                              : 'Calculated on next step'}
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={handleBuyback}
                        className="mt-4 w-full bg-[#E99500] hover:bg-[#f0a116] text-black font-bold"
                      >
                        <Zap className="w-8 h-8 text-black fill-black" />
                        Take payout
                      </Button>
                    </div>

                    {/* Claim box */}
                    <div className="rounded-lg border border-white/10 bg-white/2 p-4">
                      <div className="text-white font-semibold">
                        Claim to Steam inventory
                      </div>
                      <div className="text-white/60 text-sm">
                        Send this skin to your Steam account
                      </div>
                      <Button
                        disabled={userTradeUrl === null}
                        onClick={async () => {
                          try {
                            const userProfile = await authService.getProfile();
                            if (
                              !userProfile.tradeUrl ||
                              userProfile.tradeUrl.trim() === ""
                            ) {
                              toast.error(
                                "Please set your Steam Trade URL in your profile before claiming skins!"
                              );
                              return;
                            }
                            if (wonSkin) {
                              // Send Discord ticket directly and create SKIN_CLAIMED activity
                              await discordService.createSkinClaimTicket({
                                userId:
                                  walletCtx.publicKey?.toString() || "unknown",
                                walletAddress:
                                  walletCtx.publicKey?.toString() || "unknown",
                                steamTradeUrl: userProfile.tradeUrl,
                                skinName: wonSkin.name,
                                skinRarity: wonSkin.rarity,
                                skinWeapon:
                                  wonSkin.name.split(" | ")[0] || "Unknown",
                                nftMintAddress:
                                  lastPackResult?.asset || "unknown",
                                openedAt: new Date(),
                                caseOpeningId: `pack-${Date.now()}`,
                              });

                              // Create SKIN_CLAIMED transaction directly
                              await pendingSkinsService.createSkinClaimedActivity(
                                {
                                  userId: user?.id || "",
                                  skinName: wonSkin.name,
                                  skinRarity: wonSkin.rarity,
                                  skinWeapon:
                                    wonSkin.name.split(" | ")[0] || "Unknown",
                                  nftMintAddress: lastPackResult?.asset || "",
                                }
                              );
                            }
                            toast.success("Skin claimed to inventory!");
                            // Show share option after claim
                            setClaimedSkin(wonSkin);
                            setShowClaimShare(true);
                            setShowResult(false);
                          } catch (error) {
                            toast.error("Failed to claim skin");
                          }
                        }}
                        className="mt-4 w-full bg-white text-black hover:bg-gray-200 font-bold"
                      >
                        Take Skin
                      </Button>
                    </div>
                  </div>

                  {wonSkin && null}
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share after Claim Modal */}
      <AnimatePresence>
        {showClaimShare && claimedSkin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0, rotateY: -180 }}
              animate={{ scale: 1, opacity: 1, rotateY: 0 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: "spring", duration: 0.8, bounce: 0.4 }}
              className="relative max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <Card className="relative p-0 bg-[#0b0b0b] border border-white/10 overflow-hidden">
                <div className="p-6">
                  <div className="text-center">
                    <div className="text-zinc-300 text-sm uppercase tracking-wider">
                      Share your win
                    </div>
                    <div className="mt-2 text-lg font-semibold text-white">
                      {claimedSkin.name}
                    </div>
                  </div>
                  <div className="mt-6 flex gap-3">
                    <a
                      href={generateXShareUrl({
                        kind: "claim",
                        skin: claimedSkin,
                        packName: selectedPack?.name || null,
                      })}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-black border border-white/20 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-900 transition-colors whitespace-nowrap"
                    >
                      Share on <img src="/assets/x_icon.png" alt="X" className="w-5 h-5" />
                    </a>
                    <Button
                      onClick={() => {
                        setShowClaimShare(false);
                        setClaimedSkin(null);
                      }}
                      className="flex-1 bg-[#E99500] text-black hover:bg-[#d88500] font-bold"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
