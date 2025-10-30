"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useState, useEffect } from "react";
import Footer from "@/components/footer";

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

  // Gate access: show blurred current page background with a modal to connect
  if (!connected) {
    return (
      <div className="relative min-h-screen bg-[#0a0a0a] overflow-hidden">
        {/* Show the actual dashboard content as background */}
        <div className="pointer-events-none select-none opacity-30 blur-sm">
          <div className="relative">
            <Sidebar />
            <Header />
            <main className="ml-64 pt-16 min-h-screen flex flex-col relative z-10">
              <div className="flex-1 relative z-10">{children}</div>
              <Footer />
            </main>
          </div>
        </div>

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-10" />

        {/* Centered modal */}
        <div className="fixed inset-0 z-20 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-950 to-zinc-900 shadow-2xl animate-slide-up">
            <div className="p-8 flex flex-col items-center text-center">
              {/* Logo */}
              <div className="mb-6">
                <img
                  src="/assets/DUST3-SVG.svg"
                  alt="Dust3"
                  className="h-16 w-auto mx-auto"
                />
              </div>

              {/* Title */}
              <p className="text-zinc-400 mb-8">
                Connect your wallet to start trading CS:GO skins
              </p>

              {/* Connect Button */}
              <div className="w-full">
                <WalletMultiButton className="w-full !bg-[#E99500] hover:!bg-[#c77f00] !text-black !font-bold !h-12 !rounded-lg !transition-all !duration-300 !text-lg" />
              </div>
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
      <main className="app-main ml-64 pt-16 min-h-screen flex flex-col relative z-10">
        <div className="flex-1 relative z-10">{children}</div>
      </main>
    </div>
  );
}
