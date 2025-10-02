"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
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
} from "lucide-react"

export function Sidebar() {
  const pathname = usePathname()

  const mainNavItems = [
    { href: "/app-dashboard", label: "Dashboard", icon: Home },
    { href: "/app-dashboard/marketplace", label: "Marketplace", icon: ShoppingBag },
    { href: "/app-dashboard/packs", label: "Packs", icon: Package },
    { href: "/app-dashboard/inventory", label: "Inventory", icon: Package },
    { href: "/app-dashboard/leaderboard", label: "Leaderboard", icon: Trophy },
  ]

  const socialItems = [
    { href: "/app-dashboard/activity", label: "Activity", icon: Activity },
    { href: "/app-dashboard/profile", label: "Profile", icon: User },
  ]

  const exploreItems = [
    { href: "/csgo", label: "CS:GO", icon: Star },
    { href: "/refer", label: "Refer and Earn", icon: Gift },
  ]

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-[#0a0a0a] border-r border-[#1a1a1a] flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-[#1a1a1a]">
        <Link href="/app-dashboard" className="flex items-center gap-2">
          <div className="text-2xl font-bold">
            <span className="text-white">Dust</span>
            <span className="text-[#E99500]">3</span>
          </div>
          <span className="text-[#666] text-xs bg-[#E99500]/10 px-2 py-1 rounded border border-[#E99500]/30">BETA</span>
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto">
        {/* Main Navigation */}
        <div className="p-4">
          <nav className="space-y-1">
            {mainNavItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    pathname === item.href
                      ? "bg-[#1a1a1a] text-white"
                      : "text-[#999] hover:text-white hover:bg-[#151515]",
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Social Section */}
        <div className="px-4 pb-4">
          <h3 className="text-[#666] text-xs font-semibold uppercase tracking-wider mb-3">SOCIAL</h3>
          <nav className="space-y-1">
            {socialItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    pathname === item.href
                      ? "bg-[#1a1a1a] text-white"
                      : "text-[#999] hover:text-white hover:bg-[#151515]",
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                  {item.soon && <span className="text-[#666] text-xs bg-[#1a1a1a] px-2 py-0.5 rounded">SOON</span>}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Explore Section */}
        <div className="px-4 pb-4">
          <h3 className="text-[#666] text-xs font-semibold uppercase tracking-wider mb-3">EXPLORE</h3>
          <nav className="space-y-1">
            {exploreItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    pathname === item.href
                      ? "bg-[#1a1a1a] text-white"
                      : "text-[#999] hover:text-white hover:bg-[#151515]",
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>
    </aside>
  )
}
