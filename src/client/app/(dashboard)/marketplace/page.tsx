"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingBag, Rocket, Clock } from "lucide-react";
import Link from "next/link";

export default function MarketplacePage() {
  const { isConnected } = useUser();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [filterBy, setFilterBy] = useState("all");
  const [listings, setListings] = useState<SkinListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadListings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await skinMarketplaceService.getListings({
        search: debouncedSearch || undefined,
        sortBy: sortBy as any,
        filterBy: filterBy === "all" ? undefined : filterBy,
        limit: 50,
      });
      setListings(data);
    } catch (err) {
      toast.error("Failed to load marketplace listings");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, sortBy, filterBy]);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  const getSellerDisplay = (seller: any): string => {
    if (!seller) return "Unknown";
    if (typeof seller === "string") return seller;
    if (typeof seller.username === "string" && seller.username)
      return seller.username;
    if (typeof seller.walletAddress === "string" && seller.walletAddress) {
      const addr = seller.walletAddress;
      return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
    }
    return "Unknown";
  };

  const handleBuy = async (listingId: string) => {
    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }

    try {
      setBuying(listingId);
      await skinMarketplaceService.buySkin(listingId);
      toast.success("Skin purchased successfully!");
      loadListings(); // Refresh listings
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to purchase skin"
      );
    } finally {
      setBuying(null);
    }
  };

  const getRarityColor = (rarity?: string | null) => {
    const normalized = typeof rarity === "string" ? rarity.toLowerCase() : "";
    switch (normalized) {
      case "common":
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
      case "uncommon":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "rare":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "epic":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "legendary":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-8">
      <Card className="bg-[#111] border-[#333] max-w-2xl w-full">
        <CardContent className="p-12 text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <ShoppingBag className="w-20 h-20 text-[#666]" />
              <div className="absolute -top-2 -right-2 bg-[#E99500] rounded-full p-2">
                <Clock className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <h1 className="text-4xl font-bold text-white mb-4">
            Marketplace Coming Soon
          </h1>
          
          <p className="text-[#999] text-lg mb-8 leading-relaxed">
            We're building an amazing peer-to-peer marketplace where you can buy and sell 
            CS:GO skins directly with other players. All transactions will be secured on 
            the Solana blockchain.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link href="/packs">
              <Button className="bg-[#E99500] hover:bg-[#E99500]/90 text-white px-8">
                <Rocket className="w-4 h-4 mr-2" />
                Open Packs
              </Button>
            </Link>
            <Link href="/inventory">
              <Button variant="outline" className="border-[#333] text-white hover:bg-[#1a1a1a] px-8">
                View Inventory
              </Button>
            </Link>
          </div>

          <div className="pt-8 border-t border-[#333]">
            <p className="text-[#666] text-sm">
              Want to be notified when the marketplace launches? Connect your wallet and start collecting skins!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
