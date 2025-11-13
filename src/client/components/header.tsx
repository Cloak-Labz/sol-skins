"use client";

import { WalletConnect } from "./wallet-connect";
import { ChevronLeft } from "lucide-react";
import { memo } from "react";
import { useRouter } from "next/navigation";

function HeaderComponent() {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  return (
    <header className="app-header fixed top-0 right-0 left-64 h-16 bg-[#0a0a0a] border-b border-[#1a1a1a] flex items-center justify-between px-6 z-40">
      <button
        onClick={handleBack}
        className="p-2 text-[#999] hover:text-white transition-colors"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <div className="flex items-center gap-3">
        <span className="text-[#4ade80] text-xs bg-[#4ade80]/10 px-2 py-1 rounded border border-[#4ade80]/30 font-semibold">
          DEVNET LIVE
        </span>
        <WalletConnect />
      </div>
    </header>
  );
}

export const Header = memo(HeaderComponent);
