"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Shield, Zap, Lock, TrendingUp, Globe, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <h1 className="text-5xl font-bold text-white mb-4">About Dust3</h1>
          <p className="text-gray-400 text-xl">
            Where CS skins meet Web3 fairness
          </p>
        </motion.div>

        <div className="space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Card className="bg-[#111] border-[#333] hover:border-[#E99500] transition-all duration-300 rounded-xl">
              <CardContent className="p-8">
                <h2 className="text-3xl font-bold text-white mb-4">
                  What is Dust3?
                </h2>
                <p className="text-gray-400 leading-relaxed text-lg">
                  Dust3 makes opening CS:GO loot boxes transparent, provably fair, and instantly liquid.
                  Every skin you unbox is backed by real CS:GO inventory, verified on-chain through Merkle proofs.
                  No more shady markets. Just trust, speed, and real ownership.
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="bg-[#111] border-[#333] hover:border-[#E99500] transition-all duration-300 rounded-xl">
              <CardContent className="p-8">
                <h2 className="text-3xl font-bold text-white mb-6">
                  How It Works
                </h2>
                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#E99500] to-[#c77f00] rounded-full flex items-center justify-center text-black font-bold">
                      1
                    </div>
                    <div>
                      <h3 className="text-white font-bold mb-2 text-lg">
                        Buy a Dust3 loot box with USDC/SOL
                      </h3>
                      <p className="text-gray-400">
                        Purchase boxes directly with your Solana wallet. Fast, secure, on-chain.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#E99500] to-[#c77f00] rounded-full flex items-center justify-center text-black font-bold">
                      2
                    </div>
                    <div>
                      <h3 className="text-white font-bold mb-2 text-lg">
                        Open it — randomness is verified on-chain
                      </h3>
                      <p className="text-gray-400">
                        Provably fair drops. Every outcome is transparent and verifiable.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#E99500] to-[#c77f00] rounded-full flex items-center justify-center text-black font-bold">
                      3
                    </div>
                    <div>
                      <h3 className="text-white font-bold mb-2 text-lg">
                        Get your skin, backed by real inventory
                      </h3>
                      <p className="text-gray-400">
                        Every skin is secured by our verified CS:GO inventory with Merkle proofs.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#E99500] to-[#c77f00] rounded-full flex items-center justify-center text-black font-bold">
                      4
                    </div>
                    <div>
                      <h3 className="text-white font-bold mb-2 text-lg">
                        Keep it or sell it back instantly
                      </h3>
                      <p className="text-gray-400">
                        Dust3 buys back at 85% market value. No waiting, no scams.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Card className="bg-[#111] border-[#333] hover:border-[#E99500] transition-all duration-300 rounded-xl">
              <CardContent className="p-8">
                <h2 className="text-3xl font-bold text-white mb-6">
                  Why Choose Dust3?
                </h2>
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <div className="w-12 h-12 bg-[#E99500]/10 rounded-lg flex items-center justify-center">
                      <Shield className="w-6 h-6 text-[#E99500]" />
                    </div>
                    <h3 className="text-white font-bold text-xl">
                      Fairness
                    </h3>
                    <p className="text-gray-400">
                      Provably fair randomness, verified on-chain. No hidden odds. Every drop is transparent.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div className="w-12 h-12 bg-[#E99500]/10 rounded-lg flex items-center justify-center">
                      <Lock className="w-6 h-6 text-[#E99500]" />
                    </div>
                    <h3 className="text-white font-bold text-xl">
                      Trust & Backing
                    </h3>
                    <p className="text-gray-400">
                      Every skin is backed by a real CS:GO inventory. Merkle proofs guarantee your drop is authentic.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div className="w-12 h-12 bg-[#E99500]/10 rounded-lg flex items-center justify-center">
                      <Zap className="w-6 h-6 text-[#E99500]" />
                    </div>
                    <h3 className="text-white font-bold text-xl">
                      Instant Liquidity
                    </h3>
                    <p className="text-gray-400">
                      Keep your skin, or sell it back instantly at market price. No waiting. No scams.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div className="w-12 h-12 bg-[#E99500]/10 rounded-lg flex items-center justify-center">
                      <Globe className="w-6 h-6 text-[#E99500]" />
                    </div>
                    <h3 className="text-white font-bold text-xl">
                      Web3 Power
                    </h3>
                    <p className="text-gray-400">
                      Powered by Solana for speed and low fees. Your loot box, your wallet, your rules.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
