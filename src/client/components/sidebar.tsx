"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home,
  ShoppingBag,
  Package,
  Trophy,
  Info,
  Video,
  ArrowLeftRight,
  MessageCircle,
  Activity,
  Star,
  Gift,
  User,
  ChartBarIncreasing,
  Shield,
  Users,
  Truck,
  BarChart3,
  Menu,
  X,
} from "lucide-react";
import { memo, useMemo, useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

function SidebarComponent({ isOpen, setIsOpen }: SidebarProps) {
  const pathname = usePathname();
  const { publicKey } = useWallet();

  // Close mobile menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname, setIsOpen]);

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, setIsOpen]);

  // Check if connected wallet is admin
  const isAdmin = useMemo(() => {
    const env = process.env.NEXT_PUBLIC_ADMIN_WALLETS || "";
    const admins = env
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (publicKey && admins.length > 0) {
      return admins.includes(publicKey.toBase58());
    }
    return false;
  }, [publicKey]);

  const mainNavItems = [
    { href: "/dashboard", label: "Home", icon: Home },
    { href: "/packs", label: "Packs", icon: Package },
    {
      href: "/marketplace",
      label: "Marketplace",
      icon: ShoppingBag,
      soon: true,
    },
    {
      href: "/prediction",
      label: "Prediction",
      icon: ChartBarIncreasing,
      soon: true,
    },
    { href: "/inventory", label: "Inventory", icon: Package },
    { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  ];

  const socialItems = [
    {
      href: "/activity",
      label: "Activity",
      icon: Activity,
      soon: false,
    },
    {
      href: "/profile",
      label: "Profile",
      icon: User,
      soon: false,
    },
  ];

  const exploreItems = [
    { href: "/refer", label: "Refer and Earn", icon: Gift, soon: true },
  ];

  const adminItems = [
    {
      href: "/packs/admin",
      label: "Pack Manager",
      icon: Shield,
    },
    {
      href: "/admin/analytics",
      label: "Analytics",
      icon: BarChart3,
    },
    {
      href: "/admin/users",
      label: "User Management",
      icon: Users,
    },
    {
      href: "/admin/transfers",
      label: "Transfers",
      icon: Truck,
    },
  ];

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="p-4 sm:p-6 border-b border-[#1a1a1a] flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="h-6 sm:h-8 w-auto">
            <img
              src="/assets/DUST3-SVG.svg"
              alt="Dust3 logo"
              className="h-6 sm:h-8 w-auto"
            />
          </div>
          <span className="text-[#666] text-[10px] sm:text-xs bg-[#E99500]/10 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded border border-[#E99500]/30">
            BETA
          </span>
        </Link>
        {/* Close button for mobile */}
        <button
          onClick={() => setIsOpen(false)}
          className="lg:hidden p-2 text-gray-400 hover:text-white transition-colors"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
        {/* Main Navigation */}
        <div className="p-3 sm:p-4">
          <nav className="space-y-1">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const itemContent = (
                <>
                  <Icon className="w-4 h-4" />
                  {item.label}
                  {item.soon && (
                    <span className="ml-auto text-[#666] text-xs bg-[#1a1a1a] px-2 py-0.5 rounded">
                      SOON
                    </span>
                  )}
                </>
              );

              if (item.soon) {
                return (
                  <div
                    key={item.href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#666] cursor-not-allowed opacity-60"
                  >
                    {itemContent}
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    pathname === item.href
                      ? "bg-[#1a1a1a] text-white"
                      : "text-[#999] hover:text-white hover:bg-[#151515]"
                  )}
                >
                  {itemContent}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Social Section */}
        <div className="px-3 sm:px-4 pb-3 sm:pb-4">
          <h3 className="text-[#666] text-xs font-semibold uppercase tracking-wider mb-3">
            SOCIAL
          </h3>
          <nav className="space-y-1">
            {socialItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    pathname === item.href
                      ? "bg-[#1a1a1a] text-white"
                      : "text-[#999] hover:text-white hover:bg-[#151515]"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                  {item.soon && (
                    <span className="text-[#666] text-xs bg-[#1a1a1a] px-2 py-0.5 rounded">
                      SOON
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Explore Section */}
        <div className="px-3 sm:px-4 pb-3 sm:pb-4">
          <h3 className="text-[#666] text-xs font-semibold uppercase tracking-wider mb-3">
            EXPLORE
          </h3>
          <nav className="space-y-1">
            {exploreItems.map((item) => {
              const Icon = item.icon;
              const itemContent = (
                <>
                  <Icon className="w-4 h-4" />
                  {item.label}
                  {item.soon && (
                    <span className="ml-auto text-[#666] text-xs bg-[#1a1a1a] px-2 py-0.5 rounded">
                      SOON
                    </span>
                  )}
                </>
              );

              if ((item as any).soon) {
                return (
                  <div
                    key={item.href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#666] cursor-not-allowed opacity-60"
                  >
                    {itemContent}
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    pathname === item.href
                      ? "bg-[#1a1a1a] text-white"
                      : "text-[#999] hover:text-white hover:bg-[#151515]"
                  )}
                >
                  {itemContent}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Admin Section - Only visible to admin wallet */}
        {isAdmin && (
          <div className="px-3 sm:px-4 pb-3 sm:pb-4">
            <h3 className="text-[#E99500] text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
              <Shield className="w-3 h-3" />
              ADMIN
            </h3>
            <nav className="space-y-1">
              {adminItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border border-[#E99500]/20",
                      pathname === item.href
                        ? "bg-[#E99500]/20 text-[#E99500] border-[#E99500]"
                        : "text-[#E99500]/80 hover:text-[#E99500] hover:bg-[#E99500]/10"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar - Slide in on mobile, fixed on desktop */}
      <aside
        className={cn(
          "app-sidebar fixed left-0 top-0 h-full bg-[#0a0a0a] border-r border-[#1a1a1a] flex flex-col z-50 transition-transform duration-300 ease-in-out",
          // Mobile: slide in from left, smaller width
          "w-64 sm:w-72",
          // Desktop: always visible
          "lg:translate-x-0",
          // Mobile: hidden by default, slide in when open
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}

export const Sidebar = memo(SidebarComponent);
