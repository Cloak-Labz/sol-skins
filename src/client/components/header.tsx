"use client";

import { WalletConnect } from "./wallet-connect";
import { ChevronLeft, Menu, Loader2, Coins } from "lucide-react";
import { memo, createContext, useContext, useState } from "react";
import { useRouter } from "next/navigation";
import { useUsdcBalance } from "@/hooks/use-usdc-balance";
import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/components/ui/button";

// Create a context for sidebar toggle
const SidebarContext = createContext<{
  toggleSidebar: () => void;
} | null>(null);

export const SidebarProvider = ({ children }: { children: React.ReactNode }) => {
  const [toggleFn, setToggleFn] = useState<(() => void) | null>(null);

  return (
    <SidebarContext.Provider value={{ toggleSidebar: toggleFn || (() => {}) }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebarContext = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebarContext must be used within SidebarProvider');
  }
  return context;
};

function HeaderComponent({ onMenuClick }: { onMenuClick?: () => void }) {
  const router = useRouter();
  const { connected } = useWallet();
  const { balance, isLoading } = useUsdcBalance();

  const handleBack = () => {
    router.back();
  };

  return (
    <header className="app-header fixed top-0 right-0 left-0 lg:left-64 h-16 bg-[#0a0a0a] border-b border-[#1a1a1a] flex items-center justify-between px-4 sm:px-6 z-30">
      <div className="flex items-center gap-2">
        {/* Mobile Menu Button */}
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 text-[#999] hover:text-white transition-colors rounded-lg hover:bg-[#1a1a1a]"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        
        {/* Back button - Hidden on mobile */}
        <button
          onClick={handleBack}
          className="hidden sm:block p-2 text-[#999] hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <span className="text-[#4ade80] text-[10px] sm:text-xs bg-[#4ade80]/10 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded border border-[#4ade80]/30 font-semibold">
          DEVNET LIVE
        </span>
        {connected && (
          <Button
            variant="outline"
            size="sm"
            className="bg-card border-border text-foreground hover:bg-muted hover:text-foreground text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2 animate-spin" />
            ) : (
              <Coins className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
            )}
            <span className="hidden sm:inline">Balance: </span>
            <span className="font-semibold">{balance !== null ? Math.floor(balance) : "0"}</span>
            <span>USDC</span>
          </Button>
        )}
        <WalletConnect />
      </div>
    </header>
  );
}

export const Header = memo(HeaderComponent);
