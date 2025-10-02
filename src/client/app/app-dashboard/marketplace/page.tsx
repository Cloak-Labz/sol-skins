"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Search,
  Filter,
  ShoppingCart,
  Loader2,
  ExternalLink,
  Rocket,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import {
  skinMarketplaceService,
  SkinListing,
} from "@/lib/services/skinMarketplace";
import { useUser } from "@/lib/contexts/UserContext";
import { toast } from "react-hot-toast";

export default function MarketplacePage() {
  const { isConnected } = useUser();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [filterBy, setFilterBy] = useState("all");
  const [listings, setListings] = useState<SkinListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => {
    loadListings();
  }, [searchTerm, sortBy, filterBy]);

  const loadListings = async () => {
    try {
      setLoading(true);
      const data = await skinMarketplaceService.getListings({
        search: searchTerm || undefined,
        sortBy: sortBy as any,
        filterBy: filterBy === "all" ? undefined : filterBy,
        limit: 50,
      });
      setListings(data);
    } catch (err) {
      console.error("Failed to load listings:", err);
      toast.error("Failed to load marketplace listings");
    } finally {
      setLoading(false);
    }
  };

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
      console.error("Failed to buy skin:", err);
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
    <div className="min-h-screen bg-[#0a0a0a] p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Skin Marketplace</h1>
        <p className="text-[#999] text-lg">
          Buy and sell CS:GO skins with other players
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#666] w-4 h-4" />
          <Input
            placeholder="Search skins..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-[#1a1a1a] border-[#333] text-white placeholder:text-[#666]"
          />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full md:w-48 bg-[#1a1a1a] border-[#333] text-white">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1a1a] border-[#333]">
            <SelectItem value="price-low">Price: Low to High</SelectItem>
            <SelectItem value="price-high">Price: High to Low</SelectItem>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="name">Name</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterBy} onValueChange={setFilterBy}>
          <SelectTrigger className="w-full md:w-48 bg-[#1a1a1a] border-[#333] text-white">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by rarity" />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1a1a] border-[#333]">
            <SelectItem value="all">All Rarities</SelectItem>
            <SelectItem value="common">Common</SelectItem>
            <SelectItem value="uncommon">Uncommon</SelectItem>
            <SelectItem value="rare">Rare</SelectItem>
            <SelectItem value="epic">Epic</SelectItem>
            <SelectItem value="legendary">Legendary</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Info Banner */}
      <div className="mb-8 p-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg">
        <div className="flex items-start gap-4">
          <Rocket className="w-12 h-12 mx-auto text-muted-foreground" />
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white mb-2">
              Peer-to-Peer Marketplace
            </h3>
            <p className="text-[#999] mb-4">
              Buy and sell CS:GO skins directly with other players. All
              transactions are secured on the Solana blockchain.
            </p>
            <div className="flex gap-3">
              <Link href="/inventory">
                <Button className="bg-blue-500 hover:bg-blue-600 text-white">
                  List Your Skins
                </Button>
              </Link>
              <Link href="/packs">
                <Button
                  variant="outline"
                  className="border-[#333] text-white hover:bg-[#1a1a1a]"
                >
                  Browse Loot Boxes
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Listings Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-white" />
        </div>
      ) : listings.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {listings.map((listing) => (
            <Card
              key={listing.id}
              className="bg-[#111] border-[#333] hover:border-[#555] transition-all duration-200 hover:scale-105"
            >
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-2">
                  <Badge className={getRarityColor(listing.rarity)}>
                    {listing.rarity}
                  </Badge>
                </div>
                <div className="aspect-square bg-[#1a1a1a] rounded-lg flex items-center justify-center mb-4 border border-[#333]">
                  {listing.imageUrl ? (
                    <img
                      src={listing.imageUrl}
                      alt={listing.skinName}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="text-6xl">🔫</div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <h3 className="text-white font-bold mb-1">
                  {listing.skinName}
                </h3>
                <p className="text-[#999] text-sm mb-4">{listing.condition}</p>

                <div className="flex items-center justify-between text-xs text-[#666] mb-4">
                  <span>Seller:</span>
                  <span className="font-medium text-white">
                    {getSellerDisplay((listing as any).seller)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold text-white">
                    {formatCurrency(listing.price)}
                  </div>
                  <Button
                    onClick={() => handleBuy(listing.id)}
                    disabled={buying === listing.id}
                    className="bg-[#333] hover:bg-[#444] text-white border-0"
                    size="sm"
                  >
                    {buying === listing.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Buy
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold text-white mb-2">
            No listings available
          </h3>
          <p className="text-[#999] mb-6">
            Be the first to list a skin for sale!
          </p>
          <Link href="/inventory">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
              List Your Skins
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
