"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Filter,
  Coins,
  ExternalLink,
  Package,
  Loader2,
  Lock,
  Box,
} from "lucide-react";
import { inventoryService } from "@/lib/services";
import { MOCK_CONFIG } from "@/lib/config/mock";
import { UserSkin } from "@/lib/types/api";
import { useUser } from "@/lib/contexts/UserContext";
import { useWallet } from "@solana/wallet-adapter-react";
import { toast } from "react-hot-toast";
import { formatCurrency } from "@/lib/utils";

export default function InventoryPage() {
  const { connected: isConnected } = useWallet();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [filterBy, setFilterBy] = useState("all");
  const [selectedSkin, setSelectedSkin] = useState<UserSkin | null>(null);
  const [isSellingDialogOpen, setIsSellingDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selling, setSelling] = useState(false);
  const [inventorySkins, setInventorySkins] = useState<UserSkin[]>([]);
  const [totalValue, setTotalValue] = useState(0);

  // Load inventory from backend
  useEffect(() => {
    if (isConnected || MOCK_CONFIG.ENABLE_MOCK) {
      loadInventory();
    } else {
      // Not connected - clear data and stop loading
      setLoading(false);
      setInventorySkins([]);
      setTotalValue(0);
    }
  }, [isConnected]); // Only depend on isConnected, filters handled in loadInventory

  const loadInventory = async () => {
    try {
      setLoading(true);
      const response = await inventoryService.getInventory({
        sortBy: sortBy as any,
        filterBy: filterBy === "all" ? undefined : (filterBy as any),
      });
      const payload: any = (response as any).skins
        ? response
        : (response as any).data ?? response;
      if (payload && payload.skins) {
        setInventorySkins(payload.skins);
        setTotalValue(Number(payload.summary?.totalValue ?? 0));
      } else {
        setInventorySkins([]);
        setTotalValue(0);
      }
    } catch (err) {
      console.error("Failed to load inventory:", err);
      toast.error("Failed to load inventory");
      setInventorySkins([]);
      setTotalValue(0);
    } finally {
      setLoading(false);
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity.toLowerCase()) {
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

  const filteredSkins = useMemo(() => {
    return inventorySkins.filter((skin) => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        skin.skinTemplate.skinName.toLowerCase().includes(searchLower) ||
        skin.skinTemplate.weapon.toLowerCase().includes(searchLower)
      );
    });
  }, [inventorySkins, searchTerm]);

  const handleSellSkin = (skin: UserSkin) => {
    setSelectedSkin(skin);
    setIsSellingDialogOpen(true);
  };

  const confirmSell = async () => {
    if (!selectedSkin) return;

    try {
      setSelling(true);
      const response = await inventoryService.sellSkin(selectedSkin.id, {});

      if (response.success) {
        toast.success(
          `Sold for ${formatCurrency(response.data.payoutAmount)}!`
        );
        setIsSellingDialogOpen(false);
        setSelectedSkin(null);
        // Reload inventory
        loadInventory();
      }
    } catch (err) {
      console.error("Failed to sell skin:", err);
      toast.error(err instanceof Error ? err.message : "Failed to sell skin");
    } finally {
      setSelling(false);
    }
  };

  // Show not connected state
  if (!isConnected) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <Lock className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Wallet Not Connected
            </h3>
            <p className="text-muted-foreground">
              Please connect your wallet to view your inventory
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-white mx-auto mb-4" />
            <p className="text-white">Loading inventory...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">
                My Inventory
              </h1>
              <p className="text-muted-foreground text-lg">
                Manage your CS:GO skin NFTs
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">
                Total Portfolio Value
              </div>
              <div className="text-3xl font-bold text-accent">
                ${totalValue.toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">
                {inventorySkins.length} items
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search skins..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-input border-border"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full md:w-48 bg-input border-border">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Recently Acquired</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="rarity">Rarity</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterBy} onValueChange={setFilterBy}>
            <SelectTrigger className="w-full md:w-48 bg-input border-border">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by rarity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Rarities</SelectItem>
              <SelectItem value="common">Common</SelectItem>
              <SelectItem value="uncommon">Uncommon</SelectItem>
              <SelectItem value="rare">Rare</SelectItem>
              <SelectItem value="epic">Epic</SelectItem>
              <SelectItem value="legendary">Legendary</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Inventory Grid */}
        {filteredSkins.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredSkins.map((skin) => (
              <Card
                key={skin.id}
                className="bg-card border-2 border-border hover:scale-105 transition-all duration-200"
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={getRarityColor(skin.skinTemplate.rarity)}>
                      {skin.skinTemplate.rarity}
                    </Badge>
                    {skin.status !== "owned" && (
                      <Badge variant="outline" className="text-xs">
                        {skin.status}
                      </Badge>
                    )}
                  </div>
                  <div className="aspect-square rounded-lg flex items-center justify-center mb-4 animate-float">
                    {skin.skinTemplate.imageUrl ? (
                      <img
                        src={skin.skinTemplate.imageUrl}
                        alt={skin.skinTemplate.skinName}
                        className="w-full h-full object-contain rounded-lg"
                      />
                    ) : (
                      <Package className="w-16 h-16 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardTitle className="text-lg mb-1">
                    {skin.skinTemplate.weapon}
                  </CardTitle>
                  <p className="text-accent font-semibold mb-1">
                    {skin.skinTemplate.skinName}
                  </p>
                  <p className="text-sm text-muted-foreground mb-3">
                    {skin.condition}
                  </p>

                  <div className="flex justify-between items-center mb-4">
                    <span className="text-2xl font-bold text-foreground">
                      {formatCurrency(skin.currentPrice)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(skin.acquiredAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {skin.mintAddress && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-accent/50 text-accent hover:bg-accent/10 bg-transparent"
                        onClick={() =>
                          window.open(
                            `https://explorer.solana.com/address/${skin.mintAddress}`,
                            "_blank"
                          )
                        }
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View NFT
                      </Button>
                    )}

                    {skin.status === "owned" && (
                      <Button
                        size="sm"
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                        onClick={() => handleSellSkin(skin)}
                      >
                        <Coins className="w-4 h-4 mr-2" />
                        Sell via Buyback
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Box className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              No skins found
            </h3>
            <p className="text-muted-foreground mb-6">
              {searchTerm || filterBy !== "all"
                ? "Try adjusting your search or filters"
                : "Start opening loot boxes to build your collection"}
            </p>
            {!searchTerm && filterBy === "all" && (
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Package className="w-4 h-4 mr-2" />
                Open Loot Boxes
              </Button>
            )}
          </div>
        )}

        {/* Sell Confirmation Dialog */}
        <Dialog
          open={isSellingDialogOpen}
          onOpenChange={setIsSellingDialogOpen}
        >
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                Confirm Buyback Sale
              </DialogTitle>
            </DialogHeader>
            {selectedSkin && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                  <div className="w-16 h-16 flex items-center justify-center">
                    {selectedSkin.skinTemplate.imageUrl ? (
                      <img
                        src={selectedSkin.skinTemplate.imageUrl}
                        alt={selectedSkin.skinTemplate.skinName}
                        className="w-16 h-16 object-cover rounded"
                      />
                    ) : (
                      <Package className="w-12 h-12 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {selectedSkin.skinTemplate.weapon} |{" "}
                      {selectedSkin.skinTemplate.skinName}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedSkin.condition}
                    </p>
                    <Badge
                      className={getRarityColor(
                        selectedSkin.skinTemplate.rarity
                      )}
                    >
                      {selectedSkin.skinTemplate.rarity}
                    </Badge>
                  </div>
                </div>

                <div className="bg-accent/10 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-foreground">Buyback Price:</span>
                    <span className="text-2xl font-bold text-accent">
                      {formatCurrency(selectedSkin.currentPrice * 0.85)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    85% of market value (
                    {formatCurrency(selectedSkin.currentPrice)})
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setIsSellingDialogOpen(false)}
                    className="flex-1"
                    disabled={selling}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={confirmSell}
                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                    disabled={selling}
                  >
                    {selling ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Selling...
                      </>
                    ) : (
                      "Confirm Sale"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
