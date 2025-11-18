"use client";

import { Suspense, useEffect } from "react";
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
  Package,
  Coins,
  Wallet,
  ExternalLink,
} from "lucide-react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import Footer from "@/components/footer";
import { useSearchParams } from "next/navigation";

// Dynamic import for 3D components to avoid SSR issues
const FloatingBox = dynamic(() => import("@/components/floating-box"), {
  ssr: false,
  loading: () => (
    <div className="aspect-square bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] rounded-2xl border border-[#333] flex items-center justify-center">
      <Loader2 className="w-12 h-12 animate-spin text-[#E99500]" />
    </div>
  ),
});

function LandingPageContent() {
  const searchParams = useSearchParams();


  // Read invite query parameter and store in sessionStorage immediately (synchronously)
  // This ensures it's saved before any navigation happens
  const inviteParam = searchParams.get('invite');
  
  if (inviteParam && typeof window !== 'undefined') {
    // Store referral username in sessionStorage immediately
    // It will be used when the user connects their wallet
    const currentReferral = sessionStorage.getItem('referral_username');
    
    if (!currentReferral || currentReferral !== inviteParam) {
      sessionStorage.setItem('referral_username', inviteParam);
    }
  }

  // Also use useEffect as backup to handle URL changes
  useEffect(() => {
    const inviteParam = searchParams.get('invite');
    
    if (inviteParam && typeof window !== 'undefined') {
      const currentReferral = sessionStorage.getItem('referral_username');
      if (!currentReferral || currentReferral !== inviteParam) {
        sessionStorage.setItem('referral_username', inviteParam);
      }
    }
  }, [searchParams]);

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
            <span className="text-[#4ade80] text-xs bg-[#4ade80]/10 px-2 py-1 rounded border border-[#4ade80]/30 font-semibold">
              DEVNET LIVE
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/packs">
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
                  className="inline-flex items-center gap-3 mb-4 flex-wrap"
                >
                  <span className="text-[#4ade80] font-bold text-sm tracking-wider uppercase bg-[#4ade80]/10 px-4 py-2 rounded-full border border-[#4ade80]/30">
                    DEVNET LIVE
                  </span>
                  <span className="text-[#E99500] font-bold text-sm tracking-wider uppercase bg-[#E99500]/10 px-4 py-2 rounded-full border border-[#E99500]/30">
                    85% Instant Buyback Guarantee
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
                    Every box is provably fair. Every skin is backed by real
                    inventory.
                  </span>
                </p>

                <div className="flex flex-wrap gap-4">
                  <Link href="/packs">
                    <Button
                      size="lg"
                      className="bg-[#E99500] hover:bg-[#c77f00] text-black font-bold border-0 rounded-lg px-8 py-6 text-lg transition-all duration-300 hover:scale-105"
                    >
                      Launch App & Connect Wallet
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </Link>

                  <Link href="#how-it-works">
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
                  <div className="text-3xl font-bold text-[#E99500]">85%</div>
                  <div className="text-sm text-gray-400">Instant Buyback</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-[#E99500]">Real</div>
                  <div className="text-sm text-gray-400">CS:GO Inventory</div>
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
                  src="/assets/karambit.jpg"
                  alt="CS:GO Skin Showcase"
                  className="w-full h-full object-cover"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* The Dust3 Difference Section */}
      <section className="py-20 px-8 bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4">
              The Dust3 Difference
            </h2>
            <p className="text-gray-400 text-lg">
              Built on Solana. Powered by real technology.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Coins,
                title: "85% Instant Buyback",
                description:
                  "Sell any skin back instantly for 85% of market value in USDC. No waiting periods.",
                color: "from-yellow-500 to-orange-500",
              },
              {
                icon: Package,
                title: "On-Chain Minting",
                description:
                  "True ownership via Metaplex Candy Machine. Verifiable on Solana blockchain.",
                color: "from-purple-500 to-pink-500",
              },
              {
                icon: Shield,
                title: "Real CS:GO Inventory",
                description:
                  "Every skin backed by actual Steam inventory. Claim directly to your account.",
                color: "from-blue-500 to-cyan-500",
              },
              {
                icon: Zap,
                title: "Provably Fair Odds",
                description:
                  "Transparent probability calculation. Real-time odds from live database.",
                color: "from-green-500 to-emerald-500",
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ scale: 1.05 }}
              >
                <Card className="bg-[#111] border-[#333] hover:border-[#E99500] transition-all duration-300 rounded-xl overflow-hidden h-full">
                  <CardContent className="p-6">
                    <div
                      className={`w-12 h-12 bg-gradient-to-br ${item.color} rounded-lg flex items-center justify-center mb-4`}
                    >
                      <item.icon className="w-6 h-6 text-white" />
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

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-8 bg-black">
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
              Open. Reveal. Own. Or cash out instantly.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                step: "1",
                icon: Wallet,
                title: "Connect Wallet",
                description:
                  "Connect your Solana wallet. No KYC, no email required. Instant access.",
              },
              {
                step: "2",
                icon: Package,
                title: "Buy & Open Pack",
                description:
                  "Purchase with USDC. Watch the cinematic opening animation as your NFT mints on-chain.",
              },
              {
                step: "3",
                icon: CheckCircle2,
                title: "Reveal Your Skin",
                description:
                  "See your CS:GO skin NFT. Backed by real Steam inventory. Verifiable ownership.",
              },
              {
                step: "4",
                icon: TrendingUp,
                title: "Claim or Sell",
                description:
                  "Claim to Steam inventory OR take instant 85% USDC payout. Your choice.",
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

      {/* Powered by Solana Section */}
      <section className="py-20 px-8 bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4">
              Powered by Solana
            </h2>
            <p className="text-gray-400 text-lg">
              Built with industry-standard Web3 technology
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Candy Machine */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Card className="bg-[#111] border-[#333] hover:border-[#E99500] transition-all duration-300 rounded-xl overflow-hidden h-full">
                <CardContent className="p-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mb-6">
                    <Package className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">
                    Metaplex Candy Machine
                  </h3>
                  <p className="text-gray-400 mb-6">
                    We use Metaplex's industry-standard Candy Machine for NFT
                    minting:
                  </p>
                  <ul className="space-y-3">
                    {[
                      "On-chain NFT minting with 800k compute units",
                      "Guaranteed fairness through blockchain verification",
                      "Instant ownership transfer",
                      "Metadata stored on Arweave",
                      "No centralized control",
                    ].map((text, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-[#E99500] flex-shrink-0 mt-0.5" />
                        <span className="text-white text-sm">{text}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>

            {/* Buyback Protocol */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Card className="bg-[#111] border-[#333] hover:border-[#E99500] transition-all duration-300 rounded-xl overflow-hidden h-full">
                <CardContent className="p-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center mb-6">
                    <Coins className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">
                    85% Buyback Protocol
                  </h3>
                  <p className="text-gray-400 mb-6">
                    Instant liquidity on all skins. No waiting, no hassle:
                  </p>
                  <ul className="space-y-3">
                    {[
                      "Sell any skin back for 85% of market value",
                      "Automated USDC pricing calculation",
                      "Treasury-backed instant payouts",
                      "Transaction confirmed in <5 seconds",
                      "Full transaction history on-chain",
                    ].map((text, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-[#E99500] flex-shrink-0 mt-0.5" />
                        <span className="text-white text-sm">{text}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Trust & Transparency Section */}
      <section className="py-20 px-8 bg-black relative overflow-hidden">
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
                100% Transparent
              </h2>
              <p className="text-gray-400 text-lg leading-relaxed mb-8">
                Every skin is backed by real CS:GO inventory. Odds are
                calculated in real-time from our live database. All transactions
                are verifiable on-chain.
              </p>
              <div className="space-y-4">
                {[
                  "No hidden odds. Probability calculated from live database.",
                  "Provably fair randomness via Candy Machine.",
                  "Real Steam inventory backing every skin.",
                  "On-chain verification on Solscan.",
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

              <div className="mt-8">
                <Link
                  href="https://solscan.io"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    variant="outline"
                    className="border-[#E99500] text-[#E99500] hover:bg-[#E99500] hover:text-black"
                  >
                    View on Solscan
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
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
                <h3 className="text-xl font-bold text-white mb-6">
                  Live Platform Stats
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-4 border-b border-[#333]">
                    <span className="text-gray-400">Inventory Value</span>
                    <span className="text-white font-bold text-lg">
                      $2,847,392
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-4 border-b border-[#333]">
                    <span className="text-gray-400">Packs Opened (24h)</span>
                    <span className="text-white font-bold text-lg">1,247</span>
                  </div>
                  <div className="flex items-center justify-between py-4 border-b border-[#333]">
                    <span className="text-gray-400">Avg Payout Time</span>
                    <span className="text-white font-bold text-lg">4.2s</span>
                  </div>
                  <div className="flex items-center justify-between py-4">
                    <span className="text-gray-400">Platform Status</span>
                    <span className="text-[#4ade80] flex items-center gap-2">
                      <div className="w-2 h-2 bg-[#4ade80] rounded-full animate-pulse" />
                      Operational
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-8 bg-[#0a0a0a]">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-gray-400 text-lg">
              Everything you need to know about Dust3
            </p>
          </motion.div>

          <div className="space-y-6">
            {[
              {
                q: "What is Candy Machine?",
                a: "Candy Machine is Metaplex's industry-standard NFT minting system on Solana. It guarantees fairness through on-chain verification and instant ownership transfer. Every pack you open mints a real NFT directly to your wallet.",
              },
              {
                q: "How does the 85% buyback work?",
                a: "You can sell any skin back to the protocol instantly for 85% of its current market value in USDC. The payout is automatic, treasury-backed, and completes in under 5 seconds. No waiting periods or approval needed.",
              },
              {
                q: "How do I claim my skin to Steam?",
                a: "First, add your Steam Trade URL in your profile settings. Then, when you unbox a skin, click 'Claim to Steam'. Our system creates a support ticket and our team will manually send the skin to your Steam inventory via trade bot.",
              },
              {
                q: "Are the odds really fair?",
                a: "Yes. Odds are calculated in real-time from the actual distribution of skins in our database. The randomness comes from Solana's Candy Machine on-chain. Everything is verifiable and transparent.",
              },
              {
                q: "What wallets are supported?",
                a: "All major Solana wallets via Wallet Adapter: Phantom, Solflare, Backpack, and more. Simply connect your wallet and start playing.",
              },
              {
                q: "Do I need KYC?",
                a: "No. Just connect your Solana wallet and you're ready to go. No email, no personal information, no verification needed.",
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="bg-[#111] border-[#333] hover:border-[#E99500] transition-all duration-300 rounded-xl">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-bold text-white mb-3">
                      {item.q}
                    </h3>
                    <p className="text-gray-400 leading-relaxed">{item.a}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 px-8 bg-black relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#E99500]/10 via-transparent to-transparent" />

        <div className="max-w-4xl mx-auto relative text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl lg:text-6xl font-bold text-white mb-6">
              Ready to start unboxing?
            </h2>
            <p className="text-gray-400 text-xl mb-8">
              Connect your wallet and open your first pack in seconds.
            </p>
            <Link href="/packs">
              <Button
                size="lg"
                className="bg-[#E99500] hover:bg-[#c77f00] text-black font-bold border-0 rounded-lg px-12 py-8 text-xl transition-all duration-300 hover:scale-105"
              >
                Launch App Now
                <ArrowRight className="w-6 h-6 ml-3" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default function LandingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#E99500]" />
      </div>
    }>
      <LandingPageContent />
    </Suspense>
  );
}