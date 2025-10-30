"use client";

import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import {
  ArrowRight,
  Loader2,
  Shield,
  Zap,
  TrendingUp,
  CheckCircle2,
} from "lucide-react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";

// Dynamic import for 3D components to avoid SSR issues
const FloatingBox = dynamic(() => import("@/components/floating-box"), {
  ssr: false,
  loading: () => (
    <div className="aspect-square bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] rounded-2xl border border-[#333] flex items-center justify-center">
      <Loader2 className="w-12 h-12 animate-spin text-[#E99500]" />
    </div>
  ),
});

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black">
      {/* Landing Page Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-lg border-b border-[#333]">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-auto">
              <img
                src="/assets/DUST3-SVG.svg"
                alt="Dust3 logo"
                className="h-8 w-auto"
              />
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/app-dashboard/packs">
              <Button className="bg-[#E99500] hover:bg-[#c77f00] text-black font-bold">
                Launch App
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-32 pb-20 px-8">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#E99500]/10 via-black to-black" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(233,149,0,0.1),transparent_50%)]" />

        <div className="relative max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Text Content */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-8"
            >
              <div>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="inline-block mb-4"
                >
                  <span className="text-[#E99500] font-bold text-sm tracking-wider uppercase bg-[#E99500]/10 px-4 py-2 rounded-full border border-[#E99500]/30">
                    Where CS skins meet Web3 fairness
                  </span>
                </motion.div>

                <h1 className="text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
                  Unbox the future
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E99500] to-[#ffaa1a]">
                    of CS skins
                  </span>
                </h1>

                <p className="text-gray-400 text-xl leading-relaxed mb-8">
                  On-chain. Transparent. Instant.
                  <br />
                  <span className="text-white font-medium">
                    Every box is provably fair. Every skin is backed by reality.
                  </span>
                </p>

                <div className="flex flex-wrap gap-4">
                  <Link href="/app-dashboard/packs">
                    <Button
                      size="lg"
                      className="bg-[#E99500] hover:bg-[#c77f00] text-black font-bold border-0 rounded-lg px-8 py-6 text-lg transition-all duration-300 hover:scale-105 animate-glow"
                    >
                      Launch App & Connect Wallet
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </Link>

                  <Link href="/about">
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-[#333] hover:border-[#E99500] text-white hover:text-[#E99500] bg-transparent rounded-lg px-8 py-6 text-lg transition-all duration-300"
                    >
                      Learn More
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="grid grid-cols-3 gap-6 pt-8 border-t border-[#333]"
              >
                <div>
                  <div className="text-3xl font-bold text-[#E99500]">100%</div>
                  <div className="text-sm text-gray-400">Provably Fair</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-[#E99500]">
                    Instant
                  </div>
                  <div className="text-sm text-gray-400">Liquidity</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-[#E99500]">Real</div>
                  <div className="text-sm text-gray-400">Inventory Backed</div>
                </div>
              </motion.div>
            </motion.div>

            {/* Right Column - Hero Image */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="aspect-square rounded-2xl overflow-hidden border border-[#333]">
                <img
                  src="/image.jpg"
                  alt="CS:GO Skin Showcase"
                  className="w-full h-full object-cover"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-8 bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4">
              How It Works
            </h2>
            <p className="text-gray-400 text-lg">
              Open. Reveal. Trade. Or cash out instantly.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                step: "1",
                icon: Zap,
                title: "Buy a Loot Box",
                description:
                  "Purchase with USDC or SOL. Fast, secure, on-chain.",
              },
              {
                step: "2",
                icon: Shield,
                title: "Open & Verify",
                description: "Randomness is verified on-chain. Provably fair.",
              },
              {
                step: "3",
                icon: CheckCircle2,
                title: "Get Your Skin",
                description:
                  "Backed by real CS:GO inventory. Merkle proofs guarantee authenticity.",
              },
              {
                step: "4",
                icon: TrendingUp,
                title: "Keep or Sell",
                description: "Sell it back instantly at fair market value.",
              },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ scale: 1.05 }}
                className="relative"
              >
                <Card className="bg-[#111] border-[#333] hover:border-[#E99500] transition-all duration-300 rounded-xl overflow-hidden h-full">
                  <CardContent className="p-6">
                    <div className="mb-4">
                      <div className="w-12 h-12 bg-[#E99500]/10 rounded-lg flex items-center justify-center mb-4">
                        <item.icon className="w-6 h-6 text-[#E99500]" />
                      </div>
                      <div className="text-5xl font-bold text-[#E99500]/20 absolute top-4 right-4">
                        {item.step}
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">
                      {item.title}
                    </h3>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      {item.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section
        id="trust"
        className="py-20 px-8 bg-black relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#E99500]/5 via-transparent to-transparent" />

        <div className="max-w-7xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
                Backed by Reality
              </h2>
              <p className="text-gray-400 text-lg leading-relaxed mb-8">
                Every skin is secured by a real CS:GO inventory. Our on-chain
                Merkle proofs ensure authenticity.
              </p>
              <div className="space-y-4">
                {[
                  "No hidden odds. Every drop is transparent.",
                  "Provably fair randomness, verified on-chain.",
                  "Real inventory backing every single skin.",
                ].map((text, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <CheckCircle2 className="w-6 h-6 text-[#E99500] flex-shrink-0 mt-1" />
                    <span className="text-white text-lg">{text}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <div className="bg-[#111] border border-[#333] rounded-2xl p-8">
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-4 border-b border-[#333]">
                    <span className="text-gray-400">Merkle Root</span>
                    <span className="text-[#E99500] font-mono text-sm">
                      2Wvs...9c2d
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-4 border-b border-[#333]">
                    <span className="text-gray-400">Inventory Value</span>
                    <span className="text-white font-bold text-lg">
                      $2,847,392
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-4">
                    <span className="text-gray-400">Verification Status</span>
                    <span className="text-[#4ade80] flex items-center gap-2">
                      <div className="w-2 h-2 bg-[#4ade80] rounded-full animate-pulse-scale" />
                      Verified
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
