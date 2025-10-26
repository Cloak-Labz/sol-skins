"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Shield,
  Zap,
  Lock,
  Globe,
  CheckCircle2,
  ShieldCheck,
  Fingerprint,
  Coins,
  Rocket,
} from "lucide-react";
import { motion } from "framer-motion";
// metadata is provided in app/about/layout.tsx (server component)

export default function AboutPage() {
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };
  const stagger = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.15,
      },
    },
  };
  const hoverTilt = {
    rest: {
      rotateX: 0,
      rotateY: 0,
      scale: 1,
      transition: { type: "spring", stiffness: 200, damping: 15 },
    },
    hover: {
      rotateX: -2,
      rotateY: 3,
      scale: 1.02,
      transition: { type: "spring", stiffness: 200, damping: 15 },
    },
  } as const;
  return (
    <div className="min-h-screen bg-black">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/dust3.jpeg"
            alt="Dust3"
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black via-black/70 to-black" />
        </div>
        <div className="relative px-6 md:px-10 lg:px-16 py-24">
          {/* Floating orbs */}
          <motion.div
            className="pointer-events-none absolute -top-10 -right-10 size-60 rounded-full blur-3xl bg-[#E99500]/15"
            animate={{ y: [0, 10, 0], opacity: [0.6, 0.9, 0.6] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="pointer-events-none absolute bottom-0 -left-10 size-72 rounded-full blur-3xl bg-[#ffaa33]/10"
            animate={{ y: [0, -12, 0], opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="max-w-6xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight mb-4">
                The Future of
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E99500] to-[#ffad33]">
                  Collecting
                </span>
              </h1>
              <p className="text-gray-300 text-lg md:text-xl max-w-3xl mx-auto mb-8">
                Experience the seamless bridge between premium pack opening and
                verifiable ownership — fair, fast, and liquid on Solana.
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button className="bg-[#E99500] text-black hover:bg-[#d88500]">
                  View Marketplace
                </Button>
                <Button
                  variant="outline"
                  className="border-[#333] text-white hover:bg-[#111]"
                >
                  Learn More
                </Button>
              </div>
            </motion.div>
            {/* Scroll cue */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-10 flex justify-center"
            >
              <div className="h-10 w-[2px] bg-gradient-to-b from-transparent via-zinc-600 to-transparent animate-pulse" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Benefits Strip */}
      <section className="px-6 md:px-10 lg:px-16 py-10 bg-[#0b0b0b] border-y border-[#141414]">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
          {[
            { label: "Track Collection\nProgression", Icon: CheckCircle2 },
            { label: "Instant Verifiable\nOwnership", Icon: Fingerprint },
            { label: "Vaulted & Insured\nwith Dust3", Icon: Shield },
            { label: "Rank on\nGlobal Leaderboard", Icon: Zap },
            { label: "Redeem Anytime,\nAnywhere", Icon: Globe },
          ].map(({ label, Icon }, i) => (
            <div
              key={i}
              className="flex flex-col items-center justify-center gap-2"
            >
              <div className="size-8 rounded-md bg-[#E99500]/15 flex items-center justify-center">
                <Icon className="w-4 h-4 text-[#E99500]" />
              </div>
              <span className="text-sm text-gray-300 whitespace-pre-line leading-tight">
                {label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Core Benefits */}
      <section className="px-6 md:px-10 lg:px-16 py-16">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            variants={fadeIn}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="text-2xl md:text-3xl font-bold text-white mb-8"
          >
            Core Benefits
          </motion.h2>
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {[
              {
                title: "Track Your Wins",
                desc: "See every pack, drop, and payout in a transparent on-chain history.",
                Icon: CheckCircle2,
              },
              {
                title: "Provably Fair",
                desc: "VRF randomness you can audit. No hidden odds. No shady math.",
                Icon: ShieldCheck,
              },
              {
                title: "Backed by Reality",
                desc: "Each skin mapped to a custodial inventory, verified by Merkle proofs.",
                Icon: Fingerprint,
              },
              {
                title: "Instant Liquidity",
                desc: "Keep your prize — or sell it back instantly at 85% of market price.",
                Icon: Coins,
              },
            ].map(({ title, desc, Icon }, idx) => (
              <motion.div
                key={idx}
                variants={fadeIn}
                whileHover="hover"
                initial="rest"
                animate="rest"
              >
                <motion.div
                  variants={hoverTilt}
                  className="[transform-style:preserve-3d]"
                >
                  <Card className="bg-[#0d0d0d] border-[#1f1f1f] hover:border-[#E99500] transition-colors">
                    <CardContent className="p-6">
                      <div className="w-10 h-10 rounded-md bg-[#E99500]/10 flex items-center justify-center mb-4">
                        <Icon className="w-5 h-5 text-[#E99500]" />
                      </div>
                      <h3 className="text-white font-semibold mb-2">{title}</h3>
                      <p className="text-gray-400 text-sm leading-relaxed">
                        {desc}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Digital Packs */}
      <section className="px-6 md:px-10 lg:px-16 py-16 bg-[#0b0b0b] border-y border-[#141414]">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Digital Packs
            </h2>
            <p className="text-gray-300 mb-6">
              Open packs in a premium, game-like experience — without the pain
              of traditional marketplaces.
            </p>
            <ul className="space-y-2 text-gray-400">
              <li>• Authenticated prizes with on-chain provenance.</li>
              <li>• Real-time market pricing for fair buyback.</li>
              <li>• Redeem or sell instantly, no shipping delays.</li>
              <li>• Transparent drop tables and odds.</li>
            </ul>
            <div className="mt-6">
              <Button className="bg-[#E99500] text-black hover:bg-[#d88500]">
                Open Packs Now
              </Button>
            </div>
          </div>
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Card className="bg-[#0f0f0f] border-[#1f1f1f] overflow-hidden">
                <CardContent className="p-0">
                  <motion.img
                    src="/assets/banner2.jpg"
                    alt="Dust3"
                    className="w-full h-64 object-cover"
                    whileHover={{ scale: 1.03 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  />
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="px-6 md:px-10 lg:px-16 py-16">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            variants={fadeIn}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="text-2xl md:text-3xl font-bold text-white mb-8"
          >
            Key Benefits
          </motion.h2>
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {[
              {
                t: "On-Chain Fairness",
                d: "Verifiable randomness (VRF) — fully auditable.",
                Icon: Shield,
              },
              {
                t: "Inventory Proofs",
                d: "Merkle-rooted snapshots for real backing.",
                Icon: Fingerprint,
              },
              {
                t: "85% Buyback",
                d: "Sell instantly at market — keep playing with confidence.",
                Icon: Coins,
              },
              {
                t: "P2P Marketplace (Phase 2)",
                d: "Peer-to-peer skin trading with low fees.",
                Icon: Globe,
              },
              {
                t: "Creator & Esports Drops",
                d: "Limited-edition themed packs and partner collections.",
                Icon: Rocket,
              },
              {
                t: "Social & Leaderboards",
                d: "Track ranks, streaks, and seasonal events.",
                Icon: CheckCircle2,
              },
              {
                t: "Speed & Cost",
                d: "Solana performance — fast finality, low fees.",
                Icon: Zap,
              },
              {
                t: "Secure Custody",
                d: "Operational safeguards and transparent reporting.",
                Icon: Lock,
              },
            ].map(({ t, d, Icon }, i) => (
              <motion.div
                key={i}
                variants={fadeIn}
                whileHover="hover"
                initial="rest"
                animate="rest"
              >
                <motion.div
                  variants={hoverTilt}
                  className="[transform-style:preserve-3d]"
                >
                  <Card className="bg-[#0d0d0d] border-[#1f1f1f]">
                    <CardContent className="p-6">
                      <div className="w-10 h-10 rounded-md bg-[#E99500]/10 flex items-center justify-center mb-4">
                        <Icon className="w-5 h-5 text-[#E99500]" />
                      </div>
                      <h3 className="text-white font-semibold mb-2">{t}</h3>
                      <p className="text-gray-400 text-sm leading-relaxed">
                        {d}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How it Works */}
      <section className="px-6 md:px-10 lg:px-16 py-16 bg-[#0b0b0b] border-y border-[#141414]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">
            How It Works
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                n: 1,
                t: "Connect Wallet",
                d: "Phantom, Backpack, or Solflare.",
              },
              { n: 2, t: "Open", d: "Choose a pack or play Dust Claw." },
              { n: 3, t: "Reveal", d: "Odds and results on-chain, instantly." },
              { n: 4, t: "Decide", d: "Keep the skin or sell at 85%." },
            ].map(({ n, t, d }) => (
              <Card key={n} className="bg-[#0f0f0f] border-[#1f1f1f]">
                <CardContent className="p-6">
                  <div className="w-8 h-8 rounded-full bg-[#E99500] text-black font-bold flex items-center justify-center mb-3">
                    {n}
                  </div>
                  <h3 className="text-white font-semibold">{t}</h3>
                  <p className="text-gray-400 text-sm mt-1">{d}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* GTM + Revenue */}
      <section className="px-6 md:px-10 lg:px-16 py-16">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-10">
          <div>
            <h3 className="text-xl font-semibold text-white mb-3">
              GTM Highlights
            </h3>
            <ul className="text-gray-400 space-y-2">
              <li>• MVP: Packs + Buyback + Claim</li>
              <li>• Phase 2: P2P marketplace with trading fees</li>
              <li>
                • Phase 3: Influencers, esports partners, multi-game expansion
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-white mb-3">
              Revenue Streams
            </h3>
            <ul className="text-gray-400 space-y-2">
              <li>• Pack Fee: Small markup per pack.</li>
              <li>• Buyback Spread: 15% margin on instant sell-back.</li>
              <li>• Marketplace Fees: 2–5% on P2P trades.</li>
              <li>• Branded Drops: Partnerships & limited collections.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Trust Strip */}
      <section className="px-6 md:px-10 lg:px-16 py-10 bg-[#0b0b0b] border-y border-[#141414]">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
          {[
            { label: "VRF Verified", Icon: ShieldCheck },
            { label: "Merkle Proofs", Icon: Fingerprint },
            { label: "Solana Speed", Icon: Zap },
            { label: "Secure Custody", Icon: Lock },
            { label: "Instant USDC Payouts", Icon: Coins },
          ].map(({ label, Icon }, i) => (
            <div
              key={i}
              className="flex items-center justify-center gap-2 text-gray-300"
            >
              <Icon className="w-4 h-4 text-[#E99500]" />
              <span className="text-sm">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Block */}
      <section className="px-6 md:px-10 lg:px-16 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-2">
            Ready to Unbox Fairly?
          </h2>
          <p className="text-gray-300 mb-6">
            Join thousands of players opening packs with real value and instant
            liquidity.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button className="bg-[#E99500] text-black hover:bg-[#d88500]">
              Start Collecting
            </Button>
            <Button
              variant="outline"
              className="border-[#333] text-white hover:bg-[#111]"
            >
              Contact Us
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 md:px-10 lg:px-16 pb-24">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">
            FAQ
          </h2>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="q1">
              <AccordionTrigger className="text-white">
                How is Dust3 fair?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                We use verifiable randomness (VRF). Every result is auditable
                on-chain.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q2">
              <AccordionTrigger className="text-white">
                Are the prizes real?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Yes. Each skin is mapped to a custodial inventory and validated
                via Merkle proofs.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q3">
              <AccordionTrigger className="text-white">
                How does instant buyback work?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                After you reveal, you can sell back at 85% of market price and
                receive USDC instantly.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q4">
              <AccordionTrigger className="text-white">
                What wallets are supported?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Phantom, Backpack, and Solflare — with Solana speed and low
                fees.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q5">
              <AccordionTrigger className="text-white">
                When is P2P trading coming?
              </AccordionTrigger>
              <AccordionContent className="text-gray-300">
                Phase 2: peer-to-peer marketplace with low trading fees and
                curated listings.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>
    </div>
  );
}
