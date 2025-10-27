"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Sparkles, Package, Gem, Crown } from "lucide-react";
import Link from "next/link";
import React from "react";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CSGOSkin {
  id: string;
  name: string;
  rarity: string;
  value: number;
  image: string;
  float: number;
}

// Mock skins para demonstração
const MOCK_SKINS: CSGOSkin[] = [
  {
    id: "1",
    name: "AK-47 | Neon Rider",
    rarity: "legendary",
    value: 850.0,
    image: "/assets/skins/img2.png",
    float: 0.15,
  },
  {
    id: "2",
    name: "AWP | Dragon Lore",
    rarity: "legendary",
    value: 1200.0,
    image: "/assets/skins/img2.png",
    float: 0.08,
  },
  {
    id: "3",
    name: "M4A4 | Howl",
    rarity: "epic",
    value: 450.0,
    image: "/assets/skins/img3.png",
    float: 0.25,
  },
  {
    id: "4",
    name: "Glock-18 | Fade",
    rarity: "rare",
    value: 125.5,
    image: "/assets/skins/img2.png",
    float: 0.12,
  },
  {
    id: "5",
    name: "Karambit | Fade",
    rarity: "legendary",
    value: 1850.0,
    image: "/assets/skins/img3.png",
    float: 0.03,
  },
];

const getRarityColor = (rarity: string) => {
  switch (rarity.toLowerCase()) {
    case "legendary":
      return "from-yellow-500 to-orange-600";
    case "epic":
      return "from-purple-500 to-pink-600";
    case "rare":
      return "from-blue-500 to-cyan-500";
    case "uncommon":
      return "from-green-500 to-emerald-600";
    default:
      return "from-gray-500 to-gray-700";
  }
};

const getRarityGlow = (rarity: string) => {
  switch (rarity.toLowerCase()) {
    case "legendary":
      return "shadow-yellow-500/50";
    case "epic":
      return "shadow-purple-500/50";
    case "rare":
      return "shadow-blue-500/50";
    case "uncommon":
      return "shadow-green-500/50";
    default:
      return "shadow-gray-500/50";
  }
};

type AnimationPhase =
  | "waiting"
  | "intro-flash"
  | "video"
  | "card-intro"
  | "card-selection"
  | "card-reveal"
  | "flashbang"
  | "skin-display"
  | "actions"
  | "dissolve";

export default function PackAnimationPage() {
  const [phase, setPhase] = useState<AnimationPhase>("waiting");
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [revealedSkin, setRevealedSkin] = useState<CSGOSkin | null>(null);
  const [particles, setParticles] = useState<
    Array<{ id: number; x: number; y: number }>
  >([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoTimeoutRef = useRef<number | null>(null);

  // Função para iniciar a animação
  const startBoxOpening = () => {
    // Pequeno flash/introdução antes do vídeo começar
    setPhase("intro-flash");
    window.setTimeout(() => {
      setPhase("video");
    }, 700);
  };

  // Ao entrar no vídeo, aguardar o fim real; fallback longo para garantir tempo de exibição
  useEffect(() => {
    if (phase !== "video") return;
    if (videoTimeoutRef.current) {
      window.clearTimeout(videoTimeoutRef.current);
    }
    // Fallback caso o onEnded não dispare (10s)
    videoTimeoutRef.current = window.setTimeout(() => {
      setPhase("card-intro");
    }, 10000);
    return () => {
      if (videoTimeoutRef.current) {
        window.clearTimeout(videoTimeoutRef.current);
        videoTimeoutRef.current = null;
      }
    };
  }, [phase]);

  // Breve flash para introduzir as cartas
  useEffect(() => {
    if (phase !== "card-intro") return;
    const to = window.setTimeout(() => setPhase("card-selection"), 700);
    return () => window.clearTimeout(to);
  }, [phase]);

  // Função para selecionar carta
  const selectCard = (cardIndex: number) => {
    setSelectedCard(cardIndex);
    setPhase("card-reveal");

    // Após 1 segundo, mostrar flashbang
    setTimeout(() => {
      setPhase("flashbang");

      // Após flashbang, revelar skin
      setTimeout(() => {
        const randomSkin =
          MOCK_SKINS[Math.floor(Math.random() * MOCK_SKINS.length)];
        setRevealedSkin(randomSkin);
        setPhase("skin-display");

        // Mostrar ações após 2 segundos
        setTimeout(() => {
          setPhase("actions");
        }, 2000);
      }, 1000);
    }, 1000);
  };

  // Função para claim ou sell
  const handleAction = (action: "claim" | "sell") => {
    setPhase("dissolve");

    // Criar partículas
    const newParticles = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * window.innerWidth,
      y: window.innerHeight / 2,
    }));
    setParticles(newParticles);

    // Reset após animação
    setTimeout(() => {
      setPhase("waiting");
      setSelectedCard(null);
      setRevealedSkin(null);
      setParticles([]);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Header */}
      <div className="absolute top-4 left-4 z-50">
        <Link href="/app-dashboard/packs">
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
      </div>

      {/* Fase: Waiting */}
      {phase === "waiting" && (
        <div className="flex items-center justify-center min-h-screen">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="mb-8">
              <Package className="w-24 h-24 mx-auto text-orange-500 mb-4" />
              <h1 className="text-4xl font-bold mb-2">Dust3 Case</h1>
              <p className="text-gray-400">Click to open your case</p>
            </div>
            <Button
              onClick={startBoxOpening}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-8 py-4 text-lg font-semibold rounded-lg shadow-lg hover:shadow-orange-500/25 transition-all duration-300"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Open Box
            </Button>
          </motion.div>
        </div>
      )}

      {/* Fase: Intro Flash */}
      {phase === "intro-flash" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.6, 0] }}
          transition={{ duration: 0.7, times: [0, 0.2, 0.6, 1] }}
          className="absolute inset-0 z-40"
          style={{
            background:
              "radial-gradient(circle at center, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.6) 20%, rgba(255,149,0,0.25) 45%, rgba(0,0,0,0.85) 70%)",
          }}
        />
      )}

      {/* Fase: Video */}
      {phase === "video" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="relative w-full h-full flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              muted
              className="max-w-4xl max-h-[80vh] rounded-lg shadow-2xl"
              style={{
                filter: "drop-shadow(0 0 50px rgba(0,0,0,0.8))",
              }}
              onEnded={() => {
                if (videoTimeoutRef.current) {
                  window.clearTimeout(videoTimeoutRef.current);
                  videoTimeoutRef.current = null;
                }
                setPhase("card-intro");
              }}
            >
              <source src="/assets/video.mp4" type="video/mp4" />
            </video>
            {/* Overlay para mesclar com o fundo */}
            <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-black opacity-30" />
          </div>
        </motion.div>
      )}

      {/* Fase: Card Intro (cinematic portal intro) */}
      {phase === "card-intro" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 flex items-center justify-center z-40"
        >
          {/* Vignette + radial light */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 50% 50%, rgba(255,200,120,0.25) 0%, rgba(255,149,0,0.15) 20%, rgba(0,0,0,0.9) 70%)",
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ boxShadow: "inset 0 0 200px 60px rgba(0,0,0,0.85)" }}
          />

          {/* Expanding portal ring */}
          <motion.div
            initial={{ scale: 0.4, opacity: 0.2 }}
            animate={{ scale: [0.4, 1, 1.2], opacity: [0.2, 0.9, 0.4] }}
            transition={{ duration: 1.1, ease: "easeOut" }}
            className="relative z-10 w-80 h-80 rounded-full"
            style={{
              background:
                "conic-gradient(from 0deg, rgba(255,149,0,0), rgba(255,149,0,0.5), rgba(255,255,255,0.65), rgba(255,149,0,0.5), rgba(255,149,0,0))",
              filter: "drop-shadow(0 0 45px rgba(255,149,0,0.45))",
              maskImage: "radial-gradient(circle, black 62%, transparent 64%)",
              WebkitMaskImage:
                "radial-gradient(circle, black 62%, transparent 64%)",
            }}
          />

          {/* Flare sweep */}
          <motion.div
            initial={{ x: "-120%", rotate: -18, opacity: 0 }}
            animate={{ x: "120%", opacity: [0, 0.8, 0] }}
            transition={{ duration: 0.8, ease: "easeInOut", delay: 0.15 }}
            className="absolute w-[140%] h-32"
            style={{
              background:
                "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,245,230,0.6) 40%, rgba(255,200,120,0.35) 60%, rgba(255,255,255,0) 100%)",
            }}
          />

          {/* Floating ember particles */}
          {Array.from({ length: 24 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-orange-400/70 rounded-full"
              initial={{
                x: (Math.random() - 0.5) * 400,
                y: (Math.random() - 0.2) * 160,
                opacity: 0,
                scale: 0.6,
              }}
              animate={{
                y: "-=120",
                opacity: [0, 1, 0],
                scale: [0.6, 1, 0.4],
              }}
              transition={{
                duration: 1.2 + Math.random() * 0.6,
                delay: 0.05 * i,
                ease: "easeOut",
                repeat: 0,
              }}
              style={{
                filter: "drop-shadow(0 0 6px rgba(255,149,0,0.8))",
              }}
            />
          ))}
        </motion.div>
      )}

      {/* Fase: Card Selection */}
      {phase === "card-selection" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          {/* Overlay escuro */}
          <div className="absolute inset-0 bg-black/80" />

          <div className="relative z-10 flex gap-8">
            {[0, 1, 2].map((cardIndex) => (
              <motion.div
                key={cardIndex}
                initial={{
                  opacity: 0,
                  y: 60,
                  rotateY: 180,
                  filter: "blur(6px) saturate(0.6)",
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                  rotateY: 0,
                  rotateX: [0, -5, 5, 0],
                  filter: ["blur(6px) saturate(0.6)", "blur(0px) saturate(1)"],
                }}
                transition={{
                  delay: cardIndex * 0.2,
                  duration: 0.9,
                  rotateX: {
                    repeat: Infinity,
                    duration: 4,
                    ease: "easeInOut",
                  },
                }}
                whileHover={{
                  scale: 1.07,
                  boxShadow: "0 0 40px rgba(233, 149, 0, 0.8)",
                  filter: "brightness(1.2)",
                }}
                onClick={() => selectCard(cardIndex)}
                className="cursor-pointer"
              >
                <Card className="w-48 h-72 bg-gradient-to-b from-gray-800 to-gray-900 border-2 border-orange-500/50 rounded-xl shadow-xl hover:shadow-orange-500/30 transition-all duration-300 flex items-center justify-center relative overflow-hidden">
                  {/* Reflexos laranja */}
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 via-transparent to-transparent" />
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent" />
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent" />
                  <motion.div
                    className="absolute -inset-1 rounded-xl"
                    style={{
                      background:
                        "conic-gradient(from 0deg, transparent, rgba(255,149,0,0.35), transparent 60%)",
                    }}
                    animate={{ rotate: 360 }}
                    transition={{
                      repeat: Infinity,
                      duration: 6,
                      ease: "linear",
                    }}
                  />

                  {/* Conteúdo da carta */}
                  <div className="text-center z-10">
                    <Package className="w-16 h-16 mx-auto text-orange-500 mb-4" />
                    <p className="text-orange-400 font-semibold">
                      Mystery Item
                    </p>
                  </div>

                  {/* Brilho de hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-transparent via-orange-500/10 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Fase: Card Reveal */}
      {phase === "card-reveal" && selectedCard !== null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="absolute inset-0 bg-black/90" />

          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1.2, opacity: 1 }}
            transition={{ duration: 1 }}
            className="relative z-10"
          >
            <Card className="w-48 h-72 bg-gradient-to-b from-gray-800 to-gray-900 border-2 border-orange-500 rounded-xl shadow-2xl shadow-orange-500/50 flex items-center justify-center">
              <div className="text-center">
                <Package className="w-16 h-16 mx-auto text-orange-500 mb-4 animate-pulse" />
                <p className="text-orange-400 font-semibold">Revealing...</p>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      )}

      {/* Fase: Flashbang */}
      {phase === "flashbang" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-white z-50"
        />
      )}

      {/* Fase: Skin Display */}
      {(phase === "skin-display" || phase === "actions") && revealedSkin && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="absolute inset-0 bg-black/90" />

          <motion.div
            initial={{ scale: 0, rotateY: 180 }}
            animate={{ scale: 1, rotateY: 0 }}
            transition={{ duration: 1, type: "spring" }}
            className="relative z-10 text-center"
          >
            <Card
              className={`w-80 h-96 bg-gradient-to-b ${getRarityColor(
                revealedSkin.rarity
              )} p-6 rounded-xl shadow-2xl ${getRarityGlow(
                revealedSkin.rarity
              )} border-2 border-white/20`}
            >
              <div className="h-full flex flex-col justify-between">
                <div>
                  <Badge
                    className={`mb-4 bg-black/50 text-white border-white/30`}
                  >
                    {revealedSkin.rarity.toUpperCase()}
                  </Badge>
                  <img
                    src={revealedSkin.image}
                    alt={revealedSkin.name}
                    className="w-full h-40 object-cover rounded-lg mb-4 shadow-lg"
                  />
                  <h3 className="text-xl font-bold text-white mb-2">
                    {revealedSkin.name}
                  </h3>
                  <p className="text-white/80 text-sm mb-2">
                    Float: {revealedSkin.float}
                  </p>
                  <p className="text-2xl font-bold text-white">
                    ${revealedSkin.value}
                  </p>
                </div>

                {/* Ações */}
                {phase === "actions" && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-4 mt-6"
                  >
                    <Button
                      onClick={() => handleAction("claim")}
                      variant="outline"
                      className="flex-1 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white transition-all duration-300"
                    >
                      Claim
                    </Button>
                    <Button
                      onClick={() => handleAction("sell")}
                      className="flex-1 bg-orange-500 hover:bg-orange-600 text-white transition-all duration-300"
                    >
                      Sell (${(revealedSkin.value * 0.85).toFixed(2)})
                    </Button>
                  </motion.div>
                )}
              </div>
            </Card>
          </motion.div>
        </motion.div>
      )}

      {/* Fase: Dissolve com partículas */}
      {phase === "dissolve" && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 3 }}
          className="absolute inset-0"
        >
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              initial={{ x: particle.x, y: particle.y, opacity: 1, scale: 1 }}
              animate={{
                x: particle.x + (Math.random() - 0.5) * 200,
                y: -100,
                opacity: 0,
                scale: 0,
              }}
              transition={{ duration: 3, ease: "easeOut" }}
              className="absolute w-2 h-2 bg-orange-500 rounded-full shadow-lg shadow-orange-500/50"
            />
          ))}
        </motion.div>
      )}

      {/* Efeitos de fundo */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-900/50 to-black pointer-events-none" />

      {/* Partículas de fundo flutuantes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 50 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-orange-500/30 rounded-full"
            animate={{
              x: [0, Math.random() * window.innerWidth],
              y: [window.innerHeight, -100],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              delay: Math.random() * 10,
            }}
            style={{
              left: Math.random() * window.innerWidth,
              top: window.innerHeight,
            }}
          />
        ))}
      </div>
    </div>
  );
}
