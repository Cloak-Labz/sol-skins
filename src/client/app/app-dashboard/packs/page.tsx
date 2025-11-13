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
import { buybackService } from "@/lib/services/buyback.service";
import { LootBoxType } from "@/lib/types/api";
import XIconPng from "@/public/assets/x_icon.png";
import { useRouter } from "next/navigation";

interface CSGOSkin {
  id: string;
  name: string;
  rarity: string;
  value: number;
  image: string;
}

// Helper function to get Solscan URL based on NEXT_PUBLIC_SOLANA_NETWORK
const getSolscanUrl = (signature: string): string => {
  const network = (process.env.NEXT_PUBLIC_SOLANA_NETWORK || "").toLowerCase();

  if (network.includes("devnet")) {
    return `https://solscan.io/tx/${signature}?cluster=devnet`;
  }
  if (network.includes("testnet")) {
    return `https://solscan.io/tx/${signature}?cluster=testnet`;
  }
  // mainnet or unspecified
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
  const [videoKey, setVideoKey] = useState(0);
  const shouldHideSidebar =
    (openingPhase !== null && openingPhase !== "processing") ||
    showResult ||
    showBuybackModal;

  // Variable to indicate when a skin is being opened (any processing phase)
  const isOpeningSkin = openingPhase !== null || isProcessing;

  // Share state for claim flow
  const [showClaimShare, setShowClaimShare] = useState(false);
  const [claimedSkin, setClaimedSkin] = useState<CSGOSkin | null>(null);
  const [hideTradePrompt, setHideTradePrompt] = useState(false);
  const [pendingBuybackAmount, setPendingBuybackAmount] = useState<
    number | null
  >(null);
  const [pendingBuybackInfo, setPendingBuybackInfo] = useState<{
    skinUsd: number;
    skinSol: number;
    payoutSol: number;
  } | null>(null);

  // Force video reload when entering video phase to avoid cache issues
  useEffect(() => {
    if (openingPhase === "video") {
      // Force reload by changing key (this will remount the video element)
      setVideoKey(prev => prev + 1);
      
      // Also reset video element if it exists and ensure volume is set
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.load();
          videoRef.current.volume = 1.0;
          videoRef.current.muted = false;
        }
      }, 100);
    }
  }, [openingPhase]);

  // Prevent navigation and disable topbar during pack opening
  useEffect(() => {
    if (isOpeningSkin) {
      // Prevent page navigation (refresh, close tab, etc.)
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = "A pack opening is in progress. Are you sure you want to leave?";
        return e.returnValue;
      };

      // Prevent browser back/forward navigation
      const handlePopState = (e: PopStateEvent) => {
        if (isOpeningSkin) {
          window.history.pushState(null, "", window.location.href);
        }
      };

      window.addEventListener("beforeunload", handleBeforeUnload);
      // Push current state to prevent back navigation
      window.history.pushState(null, "", window.location.href);
      window.addEventListener("popstate", handlePopState);

      // Disable body scroll
      document.body.style.overflow = "hidden";

      // Disable topbar interactions
      const header = document.querySelector(".app-header");
      if (header) {
        (header as HTMLElement).style.pointerEvents = "none";
        (header as HTMLElement).style.opacity = "0.5";
      }

      // Disable sidebar interactions
      const sidebar = document.querySelector(".app-sidebar");
      if (sidebar) {
        (sidebar as HTMLElement).style.pointerEvents = "none";
        (sidebar as HTMLElement).style.opacity = "0.5";
      }

      return () => {
        window.removeEventListener("beforeunload", handleBeforeUnload);
        window.removeEventListener("popstate", handlePopState);
        document.body.style.overflow = "";
        
        // Re-enable topbar and sidebar
        const header = document.querySelector(".app-header");
        if (header) {
          (header as HTMLElement).style.pointerEvents = "";
          (header as HTMLElement).style.opacity = "";
        }
        
        const sidebar = document.querySelector(".app-sidebar");
        if (sidebar) {
          (sidebar as HTMLElement).style.pointerEvents = "";
          (sidebar as HTMLElement).style.opacity = "";
        }
      };
    }
  }, [isOpeningSkin]);

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
    const send = (hide: boolean) => {
      window.dispatchEvent(
        new CustomEvent("topbar-visibility", { detail: { hide } })
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

    const url = new URL("https://twitter.com/intent/tweet");
    url.searchParams.set("text", text);

    return url.toString();
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

  // Fetch user's trade URL on component mount and whenever user changes
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
  }, [connected, user?.tradeUrl]); // Also refresh when user trade URL changes

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
    dismissOpenPackToast();
    if (!connected) {
      openPackToastIdRef.current = toast.error("Connect your wallet first!");
      return;
    }

    // Require Steam Trade URL before allowing opening
    if (!userTradeUrl || userTradeUrl.trim() === "") {
      openPackToastIdRef.current = toast.error(
        "Set your Steam Trade URL in Profile to open packs."
      );
      return;
    }

    if (openingPhase || !selectedPack) return;

    // PHASE 1: Processing - Loading button on the same screen (no blur)
    setOpeningPhase("processing");
    setIsProcessing(true);
    setShowResult(false);
    setWonSkin(null);

    try {
      if (isOpeningRef.current) return;
      isOpeningRef.current = true;

      {
        // REAL MODE - Full integration
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

        // PHASE 2: Flash on screen when transaction confirmed
        setOpeningPhase("flash");

        // After flash, start video
        setTimeout(() => {
          setOpeningPhase("video");
          // Video loops until result is ready
        }, 500); // 500ms for the flash

        // Process result in background
        setTimeout(async () => {
          try {
            // 2. Prefer server-resolved image URL; graceful fallback to metadata
            let resolvedImage = result.skin.imageUrl as string | undefined;
            if (!resolvedImage && result.skin.metadataUri) {
              try {
                const metaResp = await fetch(result.skin.metadataUri);
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

            // PHASE 3: Flash + show result (when result is ready)
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
                    <p className="font-semibold text-sm">
                      You won {winnerSkin.name}! 🎉
                    </p>
                    <a
                      href={getSolscanUrl(result.signature)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#E99500] hover:underline inline-flex items-center gap-1"
                    >
                      View on Solscan
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
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
        }, 8000); // 8 seconds total (6s video + 2s wait)
      }
    } catch (error: any) {
      dismissOpenPackToast();
      
      // Extract user-friendly error message
      let errorMessage = error?.message || "An unexpected error occurred. Please try again.";
      
      // Make error messages more user-friendly
      if (errorMessage.includes('CSRF') || errorMessage.includes('csrf')) {
        errorMessage = "Session expired. Please refresh the page and try again.";
      } else if (errorMessage.includes('walletId') || errorMessage.includes('wallet') || errorMessage.includes('user')) {
        errorMessage = "Wallet connection issue. Please reconnect your wallet and try again.";
      } else if (errorMessage.includes('nonce') || errorMessage.includes('timestamp')) {
        errorMessage = "Request timed out. Please try again.";
      } else if (errorMessage.includes('transaction') && errorMessage.includes('successful')) {
        // Transaction was signed but registration failed - show success with warning
        openPackToastIdRef.current = toast.success("Pack opened successfully!", { 
          duration: 10000,
          description: "Your transaction was confirmed on-chain. The inventory sync may be delayed. Please refresh the page if you don't see your new skin."
        });
        setOpeningPhase(null);
        setIsProcessing(false);
        return;
      }
      
      openPackToastIdRef.current = toast.error(errorMessage);
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
      dismissBuybackToast();
      buybackToastIdRef.current = toast.loading(
        "Calculating buyback amount..."
      );

      // Calculate buyback amount using buybackService
      const calcData = await buybackService.calculateBuyback(lastPackResult.asset);

      dismissBuybackToast();
      buybackToastIdRef.current = toast.loading(
        `Buyback: ${calcData.buybackAmount} SOL - Requesting transaction...`
      );

      // Request buyback transaction using buybackService
      const requestData = await buybackService.requestBuyback(lastPackResult.asset);
      const transaction = requestData.transaction;

      if (!signTransaction) {
        dismissBuybackToast();
        buybackToastIdRef.current = toast.error(
          "Wallet does not support signing transactions."
        );
        return;
      }

      const { Transaction } = await import("@solana/web3.js");
      const recoveredTransaction = Transaction.from(
        Buffer.from(transaction, "base64")
      );

      dismissBuybackToast();
      buybackToastIdRef.current = toast.loading(
        "Please sign the transaction in your wallet..."
      );
      const signedTx = await signTransaction(recoveredTransaction);
      const rawTransaction = signedTx.serialize();

      dismissBuybackToast();
      buybackToastIdRef.current = toast.loading("Confirming buyback...");

      try {
        // Confirm buyback using buybackService
        // The signed transaction itself proves wallet ownership and authorization
        const confirmData = await buybackService.confirmBuybackSigned({
          nftMint: lastPackResult.asset,
          walletAddress: publicKey.toBase58(),
          signedTransaction: Buffer.from(rawTransaction).toString("base64"),
        });

        dismissBuybackToast();
        const txSig: string | undefined =
          confirmData.transactionSignature ||
          confirmData.signature ||
          confirmData.txSignature ||
          confirmData.hash ||
          confirmData.tx ||
          undefined;
        buybackToastIdRef.current = toast.success(
          <div className="flex flex-col gap-1">
            <p className="font-semibold text-sm">Skin successfully bought back! 💰</p>
            {txSig ? (
              <a
                href={getSolscanUrl(txSig)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#E99500] hover:underline inline-flex items-center gap-1"
              >
                View transaction on Solscan
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            ) : null}
          </div>,
          {
            duration: 6000,
          }
        );

        // Show summary modal
        const packPrice = selectedPack
          ? parseFloat(String((selectedPack as any).priceSol))
          : 0;
        const payout = Number(confirmData.amountPaid ?? 0);
        setBuybackAmountSol(payout);
        setShowResult(false);
        setWonSkin(null);
        setLastPackResult(null);
        setShowBuybackModal(true);
      } catch (fetchError: any) {
        // txn might be on chain even if backend timed out
        dismissBuybackToast();
        buybackToastIdRef.current = toast.success(
          <div className="flex flex-col gap-1">
            <p className="font-semibold text-sm">Skin successfully bought back! ✅</p>
            <p className="text-xs text-zinc-400">(Transaction likely sent. Backend didn't respond.)</p>
          </div>,
          { duration: 8000 }
        );
      }
    } catch (error: any) {
      dismissBuybackToast();
      buybackToastIdRef.current = toast.error("Failed to buyback NFT");
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
      buybackService.calculateBuyback(lastPackResult.asset)
        .then(calcData => {
          if (typeof calcData.buybackAmount === 'number') {
            setPendingBuybackAmount(calcData.buybackAmount);
          }
        })
        .catch(() => setPendingBuybackAmount(null));
    }
  }, [showResult, lastPackResult?.asset]);

  // Fetch and cache buyback calculation (SOL/USD) whenever showResult && lastPackResult is set
  useEffect(() => {
    if (showResult && lastPackResult?.asset) {
      setPendingBuybackInfo(null);
      buybackService.calculateBuyback(lastPackResult.asset)
        .then(calcData => {
          if (typeof calcData.buybackAmount === 'number') {
            setPendingBuybackInfo({
              skinUsd: wonSkin?.value ?? 0,
              skinSol: calcData.skinPrice ?? 0,
              payoutSol: calcData.buybackAmount ?? 0,
            });
          }
        })
        .catch(() => setPendingBuybackInfo(null));
    }
  }, [showResult, lastPackResult?.asset, wonSkin?.value]);
  const testToast = () => {
    const testSkin = {
      name: "AK-47 | Redline",
      image:
        "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV09-5lpKKqPrxN7LEmyVQ7MEpiLuSrYmnjQO3-UdsZGHwddKVcFI2Ml7T_VO5xL_vhZS-tMudyXE36SYgsXiImhWpwUYbeOuVm2I/360fx360f",
      rarity: "legendary",
      value: 45.5,
    };

    const testSignature =
      "5JKWJwHvN5bUbR8NCMQmJGWNqQYm9FKZvbXxHyVqZQHKhPqZGJR8NwXqHyVqZQHK";

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
            <svg
              className="w-3 h-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </div>
      </div>,
      {
        duration: 6000,
      }
    );
  };

  const buybackToastIdRef = useRef<string | number | null>(null);
  const openPackToastIdRef = useRef<string | number | null>(null);
  const claimToastIdRef = useRef<string | number | null>(null);

  const dismissBuybackToast = () => {
    if (buybackToastIdRef.current) toast.dismiss(buybackToastIdRef.current);
  };

  const dismissOpenPackToast = () => {
    if (openPackToastIdRef.current) toast.dismiss(openPackToastIdRef.current);
  };

  const dismissClaimToast = () => {
    if (claimToastIdRef.current) toast.dismiss(claimToastIdRef.current);
  };

  useEffect(() => {
    // Whenever showClaimShare changes, fire the event
    const hide = !!showClaimShare;
    window.dispatchEvent(
      new CustomEvent("topbar-visibility", { detail: { hide } })
    );
    return () => {
      // On unmount/close, force it back to visible just in case
      window.dispatchEvent(
        new CustomEvent("topbar-visibility", { detail: { hide: false } })
      );
    };
  }, [showClaimShare]);

  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-4 md:p-6 overflow-hidden relative">
      {/* Lock overlay - blocks all interactions during pack opening */}
      {isOpeningSkin && (
        <div
          className="fixed inset-0 bg-transparent cursor-not-allowed"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          style={{
            pointerEvents: "auto",
            userSelect: "none",
            WebkitUserSelect: "none",
            zIndex: 99999, // Higher than any other element
          }}
        />
      )}

      {/* Fullscreen Opening Animation - Only show after processing */}
      <AnimatePresence>
        {openingPhase && openingPhase !== "processing" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black"
          >
            {/* Phase 1: Flash */}
            {openingPhase === "flash" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 bg-white"
              />
            )}

            {/* Phase 2: Video with black background and smoke effects */}
            {openingPhase === "video" && (
              <div className="absolute inset-0 bg-black flex items-center justify-center">
                <video
                  key={videoKey}
                  ref={videoRef}
                  autoPlay
                  loop
                  playsInline
                  onError={(e) => {
                    // Fallback: skip video phase if it fails to load
                    setOpeningPhase(null);
                  }}
                  className="w-full h-full object-cover"
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
                      {(() => {
                        const payoutVal = Number(
                          buybackAmountSol ?? pendingBuybackInfo?.payoutSol ?? 0
                        );
                        return (
                          <div className="text-5xl font-extrabold text-white">
                            {payoutVal > 0
                              ? `+${payoutVal.toFixed(3)} SOL`
                              : `+0.00 SOL`}
                          </div>
                        );
                      })()}
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
                      Share on{" "}
                      <img
                        src="/assets/x_icon.png"
                        alt="X"
                        className="w-5 h-5"
                      />
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
          {!loading && (
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
                      onClick={() => !isOpeningSkin && setSelectedPack(pack)}
                      disabled={isOpeningSkin}
                      className={`group text-left rounded-lg border px-3 py-3 bg-gradient-to-b from-zinc-950 to-zinc-900 transition-colors ${
                        isOpeningSkin ? "opacity-50 cursor-not-allowed" : ""
                      } ${
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
                        ? (() => {
                            const priceSol = Number(selectedPack.priceSol ?? 0);
                            const priceUsd =
                              selectedPack.priceUsd ??
                              selectedPack.priceUsdc ??
                              (selectedPack.solPriceUsd
                                ? priceSol * Number(selectedPack.solPriceUsd)
                                : undefined);
                            return priceUsd !== undefined && !Number.isNaN(priceUsd)
                              ? `$${Number(priceUsd).toFixed(2)}`
                              : "";
                          })()
                        : ""}
                    </p>
                  </div>
                  <Button
                    onClick={handleOpenPack}
                    disabled={
                      isOpeningSkin ||
                      !connected ||
                      selectedPack?.supply?.isSoldOut
                    }
                    className={`px-6 py-6 ml-4 font-semibold rounded-lg transition-all duration-300 ${
                      selectedPack?.supply?.isSoldOut
                        ? "bg-red-500/20 text-red-400 cursor-not-allowed"
                        : isOpeningSkin
                        ? "bg-zinc-600 text-zinc-300 cursor-not-allowed opacity-50"
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
          )}

          {/* Pack Selection Skeleton */}
          {loading && (
            <div className="grid lg:grid-cols-3 gap-6 items-stretch">
              {/* Left: Pack Preview Skeleton */}
              <div className="rounded-2xl overflow-hidden border border-zinc-800 bg-gradient-to-b from-zinc-950 to-zinc-900 flex flex-col">
                <div className="relative w-full h-[260px] md:h-[320px] lg:h-[360px] bg-zinc-900 animate-pulse" />
                <div className="hidden lg:block border-t border-zinc-800 p-3">
                  <div className="grid grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 animate-pulse"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded bg-zinc-800" />
                          <div className="flex-1 space-y-2">
                            <div className="h-3 bg-zinc-800 rounded w-3/4" />
                            <div className="h-2 bg-zinc-800 rounded w-1/2" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Details and Odds Skeleton */}
              <div className="lg:col-span-2 rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-950 to-zinc-900 p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                  <div className="flex-1 space-y-2">
                    <div className="h-8 bg-zinc-800 rounded w-1/3 animate-pulse" />
                    <div className="h-4 bg-zinc-800 rounded w-2/3 animate-pulse" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right space-y-2">
                      <div className="h-8 bg-zinc-800 rounded w-24 animate-pulse" />
                      <div className="h-3 bg-zinc-800 rounded w-16 animate-pulse" />
                    </div>
                    <div className="h-12 bg-zinc-800 rounded w-32 animate-pulse" />
                  </div>
                </div>

                {/* Odds List Skeleton */}
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 animate-pulse"
                    >
                      <div className="flex items-center gap-3">
                        <div className="size-2 rounded-full bg-zinc-800" />
                        <div className="h-4 bg-zinc-800 rounded w-24" />
                        <div className="flex-1" />
                        <div className="h-4 bg-zinc-800 rounded w-16" />
                        <div className="h-5 bg-zinc-800 rounded w-12" />
                      </div>
                      <div className="mt-2 h-2 w-full rounded-full bg-zinc-800" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
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
                        {typeof pendingBuybackInfo?.skinSol === "number"
                          ? ` ${pendingBuybackInfo.skinSol.toFixed(3)} SOL`
                          : "Market value: —"}
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
                            Add your Trade URL in Profile to enable Steam
                            claims. You can still take a payout now.
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
                            {typeof pendingBuybackInfo?.payoutSol === "number"
                              ? `≈ +${pendingBuybackInfo.payoutSol.toFixed(
                                  3
                                )} SOL`
                              : "Calculated on next step"}
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={handleBuyback}
                        disabled={isOpeningSkin}
                        className="mt-4 w-full bg-[#E99500] hover:bg-[#f0a116] text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed"
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
                        disabled={userTradeUrl === null || isOpeningSkin}
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          dismissClaimToast();
                          try {
                            // Double-check trade URL is still valid (user might have removed it)
                            if (!userTradeUrl || userTradeUrl.trim() === "") {
                              claimToastIdRef.current = toast.error(
                                "Please set your Steam Trade URL in your profile before claiming skins!"
                              );
                              return;
                            }
                            if (!lastPackResult?.asset) {
                              claimToastIdRef.current =
                                toast.error("No NFT to claim");
                              return;
                            }
                            if (!wonSkin) {
                              claimToastIdRef.current =
                                toast.error("No skin to claim");
                              return;
                            }

                            // Only send Discord ticket - no on-chain transactions
                            claimToastIdRef.current = toast.loading(
                              "Creating Discord ticket..."
                            );
                            try {
                              await discordService.createSkinClaimTicket({
                                userId: walletCtx.publicKey?.toString() || 'unknown',
                                walletAddress: walletCtx.publicKey?.toString() || 'unknown',
                                steamTradeUrl: userTradeUrl,
                                skinName: wonSkin.name,
                                skinRarity: wonSkin.rarity,
                                skinWeapon:
                                  wonSkin.name.split(" | ")[0] || "Unknown",
                                nftMintAddress: lastPackResult.asset,
                                openedAt: new Date(),
                                caseOpeningId: `pack-${Date.now()}`,
                              });

                              // Create skin claimed activity using pendingSkinsService (CSRF token added automatically)
                              try {
                                await pendingSkinsService.createSkinClaimedActivity({
                                  walletAddress: walletCtx.publicKey?.toString() || 'unknown',
                                  skinName: wonSkin.name,
                                  skinRarity: wonSkin.rarity,
                                  skinWeapon: wonSkin.name.split(" | ")[0] || 'Unknown',
                                  nftMintAddress: lastPackResult.asset,
                                });
                              } catch (activityError) {
                                // Non-critical, just log
                              }

                              toast.dismiss(claimToastIdRef.current!);
                              claimToastIdRef.current = toast.success(
                                <div className="flex flex-col gap-1">
                                  <p className="font-semibold text-sm">
                                    Discord ticket created! 🎯
                                  </p>
                                  <p className="text-xs text-white/70">
                                    Your skin will be sent manually via Steam
                                    Trade URL.
                                  </p>
                                </div>,
                                { duration: 6000 }
                              );

                              // Show share option after claim
                              setClaimedSkin(wonSkin);
                              setShowClaimShare(true);
                              setShowResult(false);
                            } catch (discordError: any) {
                              toast.dismiss(claimToastIdRef.current!);
                              claimToastIdRef.current = toast.error(
                                discordError?.message ||
                                  "Failed to create Discord ticket"
                              );
                            }
                          } catch (error: any) {
                            toast.dismiss(claimToastIdRef.current!);
                            claimToastIdRef.current = toast.error(
                              error?.message || "Failed to claim skin"
                            );
                          }
                        }}
                        className="mt-4 w-full bg-white text-black hover:bg-gray-200 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
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
                {/* Top area (match buyback) */}
                <div className="relative p-6 pb-0">
                  <div className="pointer-events-none absolute -inset-40 bg-[radial-gradient(circle,rgba(255,170,0,0.3)_0%,rgba(0,0,0,0)_60%)]" />

                  <div className="relative w-full h-[220px] rounded-lg overflow-hidden border border-white/10 bg-black/40 flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <div className="text-zinc-300 text-sm uppercase tracking-wider">
                        Share your win
                      </div>
                      <div className="text-2xl md:text-3xl font-extrabold text-white break-words px-4">
                        {claimedSkin.name}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom area (match buyback) */}
                <div className="mt-6 p-6 bg-[#0d0d0d] border-t border-white/10">
                  <div className="text-xs text-zinc-400 leading-relaxed mb-4">
                    You will receive this skin via the Steam Trade URL you
                    provided in approximately 24 hours.
                  </div>

                  <div className="mt-2 flex items-stretch gap-3">
                    <Button
                      onClick={() => {
                        setShowClaimShare(false);
                        setClaimedSkin(null);
                        router.push("/app-dashboard/packs");
                      }}
                      disabled={isOpeningSkin}
                      className="flex-1 h-12 px-4 py-0 flex items-center justify-center bg-[#E99500] text-black hover:bg-[#d88500] font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Open a new pack
                    </Button>

                    <a
                      href={generateXShareUrl({
                        kind: "claim",
                        skin: claimedSkin,
                        packName: selectedPack?.name || null,
                      })}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex h-12 px-4 py-0 items-center justify-center gap-2 rounded-md bg-black border border-white/20 text-sm font-semibold text-white hover:bg-zinc-900 transition-colors whitespace-nowrap"
                    >
                      Share on{" "}
                      <img
                        src="/assets/x_icon.png"
                        alt="X"
                        className="w-5 h-5"
                      />
                    </a>
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
