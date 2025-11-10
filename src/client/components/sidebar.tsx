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
} from "lucide-react";
import { memo, useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

function SidebarComponent() {
  const pathname = usePathname();
  const { publicKey } = useWallet();

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
    { href: "/app-dashboard", label: "Home", icon: Home },
    { href: "/app-dashboard/packs", label: "Packs", icon: Package },
    {
      href: "/app-dashboard/marketplace",
      label: "Marketplace",
      icon: ShoppingBag,
      soon: true,
    },
    {
      href: "/app-dashboard/prediction",
      label: "Prediction",
      icon: ChartBarIncreasing,
      soon: true,
    },
    { href: "/app-dashboard/inventory", label: "Inventory", icon: Package },
    { href: "/app-dashboard/leaderboard", label: "Leaderboard", icon: Trophy },
  ];

  const socialItems = [
    {
      href: "/app-dashboard/activity",
      label: "Activity",
      icon: Activity,
      soon: false,
    },
    {
      href: "/app-dashboard/profile",
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
      href: "/app-dashboard/packs/admin",
      label: "Pack Manager",
      icon: Shield,
    },
    {
      href: "/app-dashboard/admin/analytics",
      label: "Analytics",
      icon: BarChart3,
    },
    {
      href: "/app-dashboard/admin/users",
      label: "User Management",
      icon: Users,
    },
    {
      href: "/app-dashboard/admin/transfers",
      label: "Transfers",
      icon: Truck,
    },
  ];

  return (
    <aside className="app-sidebar fixed left-0 top-0 h-full w-64 bg-[#0a0a0a] border-r border-[#1a1a1a] flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-[#1a1a1a]">
        <Link href="/app-dashboard" className="flex items-center gap-2">
          <div className="h-8 w-auto">
            <img
              src="/assets/DUST3-SVG.svg"
              alt="Dust3 logo"
              className="h-8 w-auto"
            />
          </div>
          <span className="text-[#666] text-xs bg-[#E99500]/10 px-2 py-1 rounded border border-[#E99500]/30">
            BETA
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto">
        {/* Main Navigation */}
        <div className="p-4">
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
        <div className="px-4 pb-4">
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
        <div className="px-4 pb-4">
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
          <div className="px-4 pb-4">
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
    </aside>
  );
}

export const Sidebar = memo(SidebarComponent);
