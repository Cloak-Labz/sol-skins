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
import { useState, useEffect, useRef } from "react";
import { toast } from "react-hot-toast";
import { useWallet } from "@solana/wallet-adapter-react";
import { motion, AnimatePresence } from "framer-motion";
// import { casesService } from "@/lib/services"; // Uncomment when ready to integrate

interface CSGOSkin {
  id: string;
  name: string;
  rarity: string;
  value: number;
  image: string;
}

const PACKS = [
  {
    id: "starter",
    name: "Starter Pack",
    price: 5.99,
    priceSol: 0.05,
    color: "from-gray-600 to-gray-800",
    glowColor: "shadow-gray-500/50",
    icon: Package,
  },
  {
    id: "premium",
    name: "Premium Pack",
    price: 19.99,
    priceSol: 0.15,
    color: "from-blue-600 to-purple-600",
    glowColor: "shadow-blue-500/50",
    icon: Gem,
  },
  {
    id: "legendary",
    name: "Legendary Pack",
    price: 49.99,
    priceSol: 0.4,
    color: "from-yellow-500 to-orange-600",
    glowColor: "shadow-yellow-500/50",
    icon: Crown,
  },
];

// Mock skins using local assets
const MOCK_SKINS: CSGOSkin[] = [
  {
    id: "1",
    name: "AK-47 | Neon Rider",
    rarity: "legendary",
    value: 850.0,
    image: "/assets/skins/img1.jpeg",
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
    image: "/assets/skins/img1.jpeg",
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
    image: "/assets/skins/img1.jpeg",
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
    image: "/assets/skins/img1.jpeg",
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
  const [selectedPack, setSelectedPack] = useState(PACKS[1]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isWaitingResponse, setIsWaitingResponse] = useState(false);
  const [wonSkin, setWonSkin] = useState<CSGOSkin | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [spinItems, setSpinItems] = useState<CSGOSkin[]>([]);
  const rouletteRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<any>(null);

  // Generate initial roulette items
  useEffect(() => {
    generateSpinItems();
  }, []);

  const generateSpinItems = () => {
    const items: CSGOSkin[] = [];
    for (let i = 0; i < 50; i++) {
      items.push(MOCK_SKINS[Math.floor(Math.random() * MOCK_SKINS.length)]);
    }
    setSpinItems(items);
  };

  // Continuous spinning animation while waiting for response
  const startContinuousSpin = () => {
    if (!rouletteRef.current) return;

    const animate = () => {
      if (rouletteRef.current && isWaitingResponse) {
        const currentTransform = rouletteRef.current.style.transform;
        const currentX = parseFloat(currentTransform.replace(/[^-\d.]/g, "")) || 0;
        const newX = currentX - 2; // Speed of continuous scroll

        // Reset position when reaching end to create infinite loop effect
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

  // Stop continuous spin and animate to final position
  const stopAndShowResult = (winnerSkin: CSGOSkin) => {
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
        const finalPosition = -(winningIndex * itemWidth - window.innerWidth / 2 + itemWidth / 2);

        rouletteRef.current.style.transition = "transform 3s cubic-bezier(0.17, 0.67, 0.12, 0.99)";
        rouletteRef.current.style.transform = `translateX(${finalPosition}px)`;
      }

      // Show result modal after animation
      setTimeout(() => {
        setWonSkin(winnerSkin);
        setShowResult(true);
        setIsSpinning(false);
        setIsWaitingResponse(false);
        toast.success(`You won ${winnerSkin.name}!`, {
          icon: "🎉",
          duration: 4000,
        });
      }, 3200);
    }, 100);
  };

  const handleOpenPack = async () => {
    if (!connected) {
      toast.error("Connect your wallet first!");
      return;
    }

    if (isSpinning || isWaitingResponse) return;

    setIsSpinning(true);
    setIsWaitingResponse(true);
    setShowResult(false);
    setWonSkin(null);

    // Reset and start continuous animation
    generateSpinItems();
    if (rouletteRef.current) {
      rouletteRef.current.style.transition = "none";
      rouletteRef.current.style.transform = "translateX(0px)";
    }

    setTimeout(() => {
      startContinuousSpin();
    }, 100);

    // ============================================
    // ACTUAL API INTEGRATION - Uncomment when ready
    // ============================================
    /*
    try {
      const response = await casesService.openCase({
        lootBoxTypeId: selectedPack.id,
        quantity: 1,
      });

      // When response arrives, stop spinning and show result
      // Map the response skin to CSGOSkin format
      const wonSkin: CSGOSkin = {
        id: response.data.skin.id,
        name: response.data.skin.name,
        rarity: response.data.skin.rarity,
        value: response.data.skin.value,
        image: response.data.skin.image,
      };

      stopAndShowResult(wonSkin);

    } catch (error) {
      console.error("Failed to open pack:", error);
      toast.error("Failed to open pack");
      setIsSpinning(false);
      setIsWaitingResponse(false);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
    */

    // ============================================
    // MOCK DELAY FOR TESTING - Remove when using real API
    // ============================================
    setTimeout(() => {
      // Simulate receiving response from blockchain
      const mockWinner = MOCK_SKINS[Math.floor(Math.random() * MOCK_SKINS.length)];
      stopAndShowResult(mockWinner);
    }, 5000); // Simulating 5 second response time
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
    <div className="min-h-screen bg-black p-4 md:p-6 overflow-hidden">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/app-dashboard"
          className="inline-flex items-center text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>
      </div>

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
            {isWaitingResponse ? (
              <span className="text-[#E99500] font-semibold animate-pulse">
                Processing on blockchain...
              </span>
            ) : (
              "Test your luck and win legendary skins"
            )}
          </motion.p>
        </div>

        {/* Pack Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {PACKS.map((pack, index) => {
            const IconComponent = pack.icon;
            return (
              <motion.div
                key={pack.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  onClick={() => !isSpinning && !isWaitingResponse && setSelectedPack(pack)}
                  className={`cursor-pointer transition-all duration-300 bg-gradient-to-br ${pack.color} p-6 border-2 ${
                    selectedPack.id === pack.id
                      ? `border-[#E99500] ${pack.glowColor} shadow-2xl scale-105`
                      : "border-transparent hover:border-gray-600 hover:scale-102"
                  } ${isSpinning || isWaitingResponse ? "pointer-events-none opacity-50" : ""}`}
                >
                  <div className="text-center space-y-4">
                    <IconComponent className="w-16 h-16 mx-auto text-white" />
                    <h3 className="text-xl font-bold text-white">{pack.name}</h3>
                    <div className="space-y-1">
                      <p className="text-3xl font-bold text-white">
                        {pack.priceSol} SOL
                      </p>
                      <p className="text-sm text-gray-200">${pack.price} USD</p>
                    </div>
                    {selectedPack.id === pack.id && (
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

        {/* Roulette Section */}
        <div className="relative">
          {/* Center Line Indicator */}
          <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-[#E99500] z-20 transform -translate-x-1/2 shadow-[0_0_20px_rgba(233,149,0,0.8)]">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-[#E99500]"></div>
            </div>
          </div>

          {/* Roulette Container */}
          <div className="relative bg-gradient-to-b from-[#1a1a1a] to-black rounded-2xl p-8 overflow-hidden border border-[#333]">
            {/* Status Indicator */}
            {isWaitingResponse && (
              <div className="absolute top-4 right-4 z-30 flex items-center gap-2 bg-[#E99500]/20 px-4 py-2 rounded-lg border border-[#E99500]">
                <Loader2 className="w-4 h-4 text-[#E99500] animate-spin" />
                <span className="text-[#E99500] font-semibold text-sm">Waiting for result...</span>
              </div>
            )}

            {/* Fade edges */}
            <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-black to-transparent z-10"></div>
            <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-black to-transparent z-10"></div>

            {/* Items Container */}
            <div className="overflow-hidden py-4">
              <div
                ref={rouletteRef}
                className="flex gap-4"
                style={{ transform: "translateX(0px)", transition: "none" }}
              >
                {spinItems.map((item, index) => (
                  <div
                    key={index}
                    className="flex-shrink-0 w-36 h-48 relative"
                  >
                    <Card className={`w-full h-full bg-gradient-to-br ${getRarityColor(item.rarity)} p-3 border-2 ${getRarityBorderColor(item.rarity)} flex flex-col items-center justify-center space-y-2 shadow-xl`}>
                      <div className="w-full h-24 flex items-center justify-center bg-black/20 rounded">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                      <p className="text-white text-xs font-bold text-center line-clamp-2 px-1">
                        {item.name}
                      </p>
                      <p className="text-white text-sm font-bold">
                        ${item.value.toFixed(2)}
                      </p>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-center">
          <Button
            onClick={handleOpenPack}
            disabled={isSpinning || isWaitingResponse || !connected}
            size="lg"
            className={`relative px-12 py-8 text-2xl font-bold rounded-xl transition-all duration-300 ${
              isSpinning || isWaitingResponse
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-gradient-to-r from-[#E99500] to-[#ff6b00] hover:shadow-[0_0_30px_rgba(233,149,0,0.6)] hover:scale-105"
            } text-black disabled:opacity-50`}
          >
            {!connected ? (
              <>
                <Lock className="w-6 h-6 mr-3" />
                Connect Wallet
              </>
            ) : isWaitingResponse ? (
              <>
                <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                Processing...
              </>
            ) : isSpinning ? (
              <>
                <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                Opening...
              </>
            ) : (
              <>
                <Sparkles className="w-6 h-6 mr-3" />
                Open {selectedPack.name}
              </>
            )}
          </Button>
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
                initial={{ scale: 0.8, opacity: 0, rotateY: -90 }}
                animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: "spring", duration: 0.6 }}
                className="relative max-w-2xl w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <Card className={`bg-gradient-to-br ${getRarityColor(wonSkin.rarity)} p-8 border-4 border-white/30 shadow-2xl`}>
                  <div className="text-center space-y-6">
                    {/* Skin Image */}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: [0, 1.2, 1] }}
                      transition={{ duration: 0.6 }}
                      className="w-64 h-64 mx-auto flex items-center justify-center bg-black/30 rounded-lg"
                    >
                      <img
                        src={wonSkin.image}
                        alt={wonSkin.name}
                        className="max-w-full max-h-full object-contain drop-shadow-2xl p-4"
                      />
                    </motion.div>

                    <div className="space-y-2">
                      <Badge className="bg-black/30 text-white border-white/20 text-lg px-4 py-1 uppercase">
                        {wonSkin.rarity}
                      </Badge>
                      <h2 className="text-3xl font-bold text-white px-4">
                        {wonSkin.name}
                      </h2>
                      <p className="text-5xl font-bold text-white">
                        ${wonSkin.value.toFixed(2)}
                      </p>
                    </div>

                    <div className="flex gap-4 justify-center pt-4">
                      <Button
                        onClick={() => {
                          setShowResult(false);
                          toast.success("Skin claimed to inventory!");
                        }}
                        size="lg"
                        className="bg-white text-black hover:bg-gray-200 font-bold px-8"
                      >
                        <Unlock className="w-5 h-5 mr-2" />
                        Claim Skin
                      </Button>
                      <Button
                        onClick={() => {
                          setShowResult(false);
                          toast.success(`Sold for $${(wonSkin.value * 0.85).toFixed(2)}`);
                        }}
                        size="lg"
                        variant="outline"
                        className="bg-transparent border-2 border-white text-white hover:bg-white/20 font-bold px-8"
                      >
                        <TrendingUp className="w-5 h-5 mr-2" />
                        Sell (85%)
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

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
  );
}
