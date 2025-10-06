"use client";

import { WalletConnect } from "./wallet-connect";
import { ChevronLeft } from "lucide-react";
import { memo, useCallback } from "react";
import { useRouter } from "next/navigation";

function HeaderComponent() {
  const router = useRouter();
  const handleBack = useCallback(() => {
    router.push("/");
  }, [router]);

  return (
    <header className="fixed top-0 right-0 left-64 h-16 bg-[#0a0a0a] border-b border-[#1a1a1a] flex items-center justify-between px-6 z-50">
      <button
        onClick={handleBack}
        className="p-2 text-[#999] hover:text-white transition-colors"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <div className="flex items-center gap-3">
        <WalletConnect />
      </div>
    </header>
  );
}

export const Header = memo(HeaderComponent);
