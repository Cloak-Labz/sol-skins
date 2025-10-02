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
            <div className="mb-4 h-10 w-auto flex justify-center">
              <img
                src="/assets/DUST3-SVG.svg"
                alt="Dust3 logo"
                className="h-10 w-auto"
              />
            </div>
            <p className="text-gray-400 text-lg mb-8">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show wallet connection prompt if not connected
  if (!connected) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-8">
          <div className="mb-8">
            <div className="mb-4 h-10 w-auto flex justify-center">
              <img
                src="/assets/DUST3-SVG.svg"
                alt="Dust3 logo"
                className="h-10 w-auto"
              />
            </div>
            <p className="text-gray-400 text-lg mb-8">
              Connect your Solana wallet to access the app
            </p>
          </div>

          <div className="flex flex-col gap-4 items-center">
            <WalletMultiButton className="!bg-[#E99500] hover:!bg-[#c77f00] !text-black !font-bold !px-8 !py-3 !rounded-lg !transition-all !duration-300" />

            <a
              href="/"
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              ← Back to home
            </a>
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
