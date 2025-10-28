"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import Footer from "@/components/footer";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useState, useEffect } from "react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { connected } = useWallet();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch by rendering placeholder during SSR
  if (!mounted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-8">
          <div className="mb-8">
            {/* Animated Logo */}
            <div className="mb-6 h-16 w-auto flex justify-center relative">
              <div className="relative">
                <img
                  src="/assets/DUST3-SVG.svg"
                  alt="Dust3 logo"
                  className="h-16 w-auto animate-pulse"
                />
                <div className="absolute inset-0 h-16 w-auto animate-ping">
                  <div className="h-full w-full rounded-full bg-[#E99500]/20"></div>
                </div>
              </div>
            </div>

            {/* Animated Loading Text */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-white animate-pulse">
                Loading Dashboard
              </h2>

              <p className="text-gray-400 text-sm">
                Preparing your CS:GO skin collection...
              </p>
            </div>

            {/* Animated Progress Bar */}
            <div className="mt-8 w-full bg-gray-800 rounded-full h-2 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#E99500] to-[#ff6b00] rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Gate access: show blurred homepage-like background with a modal to connect
  if (!connected) {
    return (
      <div className="relative min-h-screen bg-black overflow-hidden">
        {/* Background hero (acts like homepage preview) */}
        <div className="pointer-events-none select-none">
          <div className="absolute inset-0 opacity-20">
            <img
              src="/dust3.jpeg"
              alt="Dust3 background"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="relative z-0 px-6 md:px-10 py-16 md:py-24">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center gap-4 mb-8">
                <img
                  src="/assets/DUST3-SVG.svg"
                  alt="Dust3"
                  className="h-10 w-auto"
                />
                <h1 className="text-2xl md:text-3xl font-bold text-white">
                  Discover and Trade CS:GO Skins on Solana
                </h1>
              </div>

              {/* Mock marketplace strip */}
              <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 opacity-80">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-lg bg-muted/40 border border-border backdrop-blur flex items-center justify-center text-xs text-muted-foreground"
                  >
                    Preview Item #{i + 1}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Blur and darken the entire background when modal is open */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-10" />

        {/* Centered modal */}
        <div className="fixed inset-0 z-20 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card/80 backdrop-blur-xl shadow-xl">
            <div className="p-6 flex flex-col items-center text-center">
              <div className="flex items-center gap-3 mb-4 justify-center">
                <img
                  src="/assets/DUST3-SVG.svg"
                  alt="Dust3"
                  className="h-8 w-auto"
                />
                <h2 className="text-xl font-semibold text-foreground">
                  Connect Wallet
                </h2>
              </div>

              <p className="text-sm text-muted-foreground">
                Connect your Solana wallet to access trading, inventory and
                rewards.
              </p>

              <div className="mt-6">
                <WalletMultiButton className="w-full !bg-[#E99500] hover:!bg-[#c77f00] !text-black !font-bold !h-11 !rounded-lg !transition-all !duration-300" />
              </div>

              <p className="mt-6 text-xs text-muted-foreground text-center">
                Preview shown is mock data. Your assets load after connecting.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <Sidebar />
      <Header />
      <main className="ml-64 pt-16 min-h-screen flex flex-col relative z-10">
        <div className="flex-1 relative z-10">{children}</div>
        <Footer />
      </main>
    </div>
  );
}
