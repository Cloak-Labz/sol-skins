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
import { casesService, marketplaceService } from "@/lib/services";
import { LootBoxType } from "@/lib/types/api";

interface CSGOSkin {
  id: string;
  name: string;
  rarity: string;
  value: number;
  image: string;
}

const getPackIcon = (rarity: string) => {
  switch (rarity.toLowerCase()) {
    case 'legendary':
      return Crown;
    case 'premium':
      return Gem;
    default:
      return Package;
  }
};

const getPackColor = (rarity: string) => {
  switch (rarity.toLowerCase()) {
    case 'legendary':
      return "from-yellow-500 to-orange-600";
    case 'premium':
      return "from-blue-600 to-purple-600";
    case 'special':
      return "from-purple-500 to-pink-600";
    default:
      return "from-gray-600 to-gray-800";
  }
};

const getPackGlow = (rarity: string) => {
  switch (rarity.toLowerCase()) {
    case 'legendary':
      return "shadow-yellow-500/50";
    case 'premium':
      return "shadow-blue-500/50";
    case 'special':
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

export default function PacksPage() {
  const { connected } = useWallet();
  const [lootBoxes, setLootBoxes] = useState<LootBoxType[]>([]);
  const [selectedPack, setSelectedPack] = useState<LootBoxType | null>(null);
  const [loading, setLoading] = useState(true);
  const [openingPhase, setOpeningPhase] = useState<
    "waiting" | "spinning" | "revealing" | null
  >(null);
  const [wonSkin, setWonSkin] = useState<CSGOSkin | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [spinItems, setSpinItems] = useState<CSGOSkin[]>([]);
  const rouletteRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<any>(null);

  // Load loot boxes from API
  useEffect(() => {
    loadLootBoxes();
  }, []);

  const loadLootBoxes = async () => {
    try {
      setLoading(true);
      const response = await marketplaceService.getLootBoxes({ filterBy: 'all' });
      const boxes = response.data || [];
      setLootBoxes(boxes);
      if (boxes.length > 0 && !selectedPack) {
        setSelectedPack(boxes[0]);
      }
    } catch (error) {
      console.error('Failed to load loot boxes:', error);
      toast.error('Failed to load packs');
    } finally {
      setLoading(false);
    }
  };

  // Generate initial roulette items
  useEffect(() => {
    generateSpinItems();
  }, []);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const generateSpinItems = () => {
    const items: CSGOSkin[] = [];
    for (let i = 0; i < 50; i++) {
      items.push(MOCK_SKINS[Math.floor(Math.random() * MOCK_SKINS.length)]);
    }
    setSpinItems(items);
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

    // Regenerate items with winner at specific position
    const items: CSGOSkin[] = [];
    for (let i = 0; i < 50; i++) {
      items.push(MOCK_SKINS[Math.floor(Math.random() * MOCK_SKINS.length)]);
    }

    const winningIndex = 42;
    items[winningIndex] = winnerSkin;
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
      // Open case via API
      const response = await casesService.openCase({
        lootBoxTypeId: selectedPack.id,
        paymentMethod: 'SOL',
      });

      console.log('Case opening response:', response);

      // FASE 2: Spinning (mostrar roleta girando)
      setOpeningPhase('spinning');
      startContinuousSpin();

      // Poll for completion
      const caseOpeningId = response.data.caseOpeningId;
      let attempts = 0;
      const maxAttempts = 15; // 15 seconds max
      
      const checkStatus = async () => {
        try {
          const status = await casesService.getOpeningStatus(caseOpeningId);
          
          if (status.completedAt && status.skinResult) {
            // Case is complete, show result
            const wonSkin: CSGOSkin = {
              id: status.skinResult.id,
              name: `${status.skinResult.weapon} | ${status.skinResult.skinName}`,
              rarity: status.skinResult.rarity,
              value: parseFloat(status.skinResult.currentPriceUsd || '0'),
              image: status.skinResult.imageUrl || '/assets/skins/img2.png',
            };

            stopAndShowResult(wonSkin);
          } else if (attempts < maxAttempts) {
            // Keep polling
            attempts++;
            setTimeout(checkStatus, 1000);
          } else {
            // Timeout
            toast.error('Case opening timed out');
            setOpeningPhase(null);
            if (animationRef.current) {
              cancelAnimationFrame(animationRef.current);
            }
          }
        } catch (error) {
          console.error('Error checking status:', error);
          toast.error('Failed to check opening status');
          setOpeningPhase(null);
          if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
          }
        }
      };

      // Start polling after 1 second
      setTimeout(checkStatus, 1000);

    } catch (error) {
      console.error("Failed to open pack:", error);
      toast.error("Failed to open pack");
      setOpeningPhase(null);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
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
    <div className="min-h-screen bg-black p-4 md:p-6 overflow-hidden relative">
      {/* Fullscreen Opening Animation */}
      <AnimatePresence>
        {openingPhase && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black"
          >
            {/* Animated Background */}
            <div className="absolute inset-0 overflow-hidden">
              {/* Pulsing gradient overlay */}
              <motion.div
                animate={{
                  background: [
                    "radial-gradient(circle at 50% 50%, rgba(233, 149, 0, 0.1) 0%, rgba(0, 0, 0, 1) 70%)",
                    "radial-gradient(circle at 50% 50%, rgba(233, 149, 0, 0.3) 0%, rgba(0, 0, 0, 1) 70%)",
                    "radial-gradient(circle at 50% 50%, rgba(233, 149, 0, 0.1) 0%, rgba(0, 0, 0, 1) 70%)",
                  ],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute inset-0"
              />

              {/* Rotating rays */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{
                  duration: 20,
                  repeat: Infinity,
                  ease: "linear",
                }}
                className="absolute inset-0"
                style={{
                  background:
                    "conic-gradient(from 0deg, transparent 0%, rgba(233, 149, 0, 0.1) 10%, transparent 20%, transparent 40%, rgba(233, 149, 0, 0.1) 50%, transparent 60%, transparent 80%, rgba(233, 149, 0, 0.1) 90%, transparent 100%)",
                }}
              />
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
                  <motion.div
                    animate={{
                      boxShadow: [
                        "0 0 20px rgba(233, 149, 0, 0.5)",
                        "0 0 60px rgba(233, 149, 0, 0.8)",
                        "0 0 20px rgba(233, 149, 0, 0.5)",
                      ],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                    }}
                    className="w-32 h-32 bg-gradient-to-br from-[#E99500] to-[#ff6b00] rounded-2xl flex items-center justify-center"
                  >
                    {selectedPack && React.createElement(getPackIcon(selectedPack.rarity), { className: "w-16 h-16 text-black" })}
                  </motion.div>

                    {/* Orbiting particles */}
                    {[...Array(8)].map((_, i) => (
                      <motion.div
                        key={i}
                        animate={{
                          rotate: 360,
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: "linear",
                          delay: i * 0.2,
                        }}
                        className="absolute inset-0"
                        style={{
                          transformOrigin: "center",
                        }}
                      >
                        <div
                          className="absolute w-2 h-2 bg-[#E99500] rounded-full"
                          style={{
                            top: "50%",
                            left: "50%",
                            transform: `translate(-50%, -50%) translateY(-80px)`,
                          }}
                        />
                      </motion.div>
                    ))}
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
                          <motion.div
                            key={index}
                            className="flex-shrink-0 w-32 md:w-40 h-44 md:h-56 relative"
                            animate={{
                              y: [0, -4, 0],
                            }}
                            transition={{
                              duration: 0.8,
                              repeat: Infinity,
                              delay: index * 0.05,
                            }}
                          >
                            <motion.div
                              animate={{
                                boxShadow: [
                                  "0 0 15px rgba(233, 149, 0, 0.4)",
                                  "0 0 30px rgba(233, 149, 0, 0.8)",
                                  "0 0 15px rgba(233, 149, 0, 0.4)",
                                ],
                              }}
                              transition={{
                                duration: 1.2,
                                repeat: Infinity,
                              }}
                              className="w-full h-full"
                            >
                              <Card
                                className={`w-full h-full bg-gradient-to-br ${getRarityColor(
                                  item.rarity
                                )} p-3 md:p-4 border-2 ${getRarityBorderColor(
                                  item.rarity
                                )} flex flex-col items-center justify-center space-y-2 shadow-2xl`}
                              >
                                <div className="w-full h-20 md:h-28 flex items-center justify-center bg-black/30 rounded-lg">
                                  <img
                                    src={item.image}
                                    alt={item.name}
                                    className="max-w-full max-h-full object-contain"
                                  />
                                </div>
                                <p className="text-white text-xs font-bold text-center line-clamp-2 px-1">
                                  {item.name}
                                </p>
                                <p className="text-white text-sm md:text-base font-bold">
                                  ${typeof item.value === 'number' ? item.value.toFixed(2) : parseFloat(item.value || '0').toFixed(2)}
                                </p>
                              </Card>
                            </motion.div>
                          </motion.div>
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
          {/* Title Section */}
          <div className="text-center space-y-2">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-6xl font-bold"
            >
              <span className="text-white">Open </span>
              <span className="text-[#E99500]">Packs</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-gray-400 text-lg"
            >
              Test your luck and win legendary skins
            </motion.p>
          </div>

          {/* Pack Selection */}
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 animate-spin text-[#E99500] mx-auto mb-4" />
              <p className="text-gray-400">Loading packs...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
              {lootBoxes.map((pack, index) => {
                const IconComponent = getPackIcon(pack.rarity);
                const packColor = getPackColor(pack.rarity);
                const packGlow = getPackGlow(pack.rarity);
                return (
                  <motion.div
                    key={pack.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card
                      onClick={() => !openingPhase && setSelectedPack(pack)}
                      className={`cursor-pointer transition-all duration-300 bg-gradient-to-br ${packColor} p-6 border-2 ${
                        selectedPack?.id === pack.id
                          ? `border-[#E99500] ${packGlow} shadow-2xl scale-105`
                          : "border-transparent hover:border-gray-600 hover:scale-102"
                      } ${openingPhase ? "pointer-events-none opacity-50" : ""}`}
                    >
                      <div className="text-center space-y-4">
                        <IconComponent className="w-16 h-16 mx-auto text-white" />
                        <h3 className="text-xl font-bold text-white">
                          {pack.name}
                        </h3>
                        <div className="space-y-1">
                          <p className="text-3xl font-bold text-white">
                            {parseFloat(pack.priceSol).toFixed(2)} SOL
                          </p>
                          <p className="text-sm text-gray-200">
                            ${parseFloat(pack.priceUsdc || pack.priceSol).toFixed(2)} USD
                          </p>
                        </div>
                        {selectedPack?.id === pack.id && (
                          <Badge className="bg-[#E99500] text-black border-none">
                            Selected
                          </Badge>
                        )}
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Action Button */}
          <div className="flex justify-center">
            <Button
              onClick={handleOpenPack}
              disabled={openingPhase !== null || !connected}
              size="lg"
              className={`relative px-12 py-8 text-2xl font-bold rounded-xl transition-all duration-300 ${
                openingPhase
                  ? "bg-gray-600 cursor-not-allowed"
                  : "bg-gradient-to-r from-[#E99500] to-[#ff6b00] hover:shadow-[0_0_30px_rgba(233,149,0,0.6)] hover:scale-105"
              } text-black disabled:opacity-50`}
            >
              {!connected ? (
                <>
                  <Lock className="w-6 h-6 mr-3" />
                  Connect Wallet
                </>
              ) : openingPhase ? (
                <>
                  <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                  Opening...
                </>
              ) : (
                <>
                  <Sparkles className="w-6 h-6 mr-3" />
                  Open {selectedPack?.name || 'Pack'}
                </>
              )}
            </Button>
          </div>

          {/* Info Cards */}
          <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            <Card className="bg-[#1a1a1a] border-[#333] p-6">
              <div className="flex items-center gap-3 mb-2">
                <Sparkles className="w-6 h-6 text-[#E99500]" />
                <h3 className="text-white font-bold">On-Chain Fair</h3>
              </div>
              <p className="text-gray-400 text-sm">
                Provably fair system running on Solana blockchain
              </p>
            </Card>

            <Card className="bg-[#1a1a1a] border-[#333] p-6">
              <div className="flex items-center gap-3 mb-2">
                <Zap className="w-6 h-6 text-[#E99500]" />
                <h3 className="text-white font-bold">Instant Delivery</h3>
              </div>
              <p className="text-gray-400 text-sm">
                Get your skins instantly in your inventory
              </p>
            </Card>

            <Card className="bg-[#1a1a1a] border-[#333] p-6">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-6 h-6 text-[#E99500]" />
                <h3 className="text-white font-bold">85% Buyback</h3>
              </div>
              <p className="text-gray-400 text-sm">
                Instant 85% buyback offer on all skins
              </p>
            </Card>
          </div>
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
                          console.error('Failed to claim skin:', error);
                          toast.error('Failed to claim skin');
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
                          console.error('Failed to sell skin:', error);
                          toast.error('Failed to sell skin');
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
