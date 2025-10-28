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
  Sparkles,
} from "lucide-react";
import { inventoryService, authService, buybackService } from "@/lib/services";
import { MOCK_CONFIG } from "@/lib/config/mock";
import { UserSkin } from "@/lib/types/api";
import { useUser } from "@/lib/contexts/UserContext";
import { toast } from "react-hot-toast";
import { formatCurrency } from "@/lib/utils";
import { discordService } from "@/lib/services/discord.service";
import { pendingSkinsService, PendingSkin } from "@/lib/services/pendingSkins.service";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";

export default function InventoryPage() {
  const { isConnected, walletAddress, user } = useUser();
  const wallet = useWallet();
  const { connection } = useConnection();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [filterBy, setFilterBy] = useState("all");
  const [selectedSkin, setSelectedSkin] = useState<UserSkin | null>(null);
  const [isSellingDialogOpen, setIsSellingDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selling, setSelling] = useState(false);
  const [inventorySkins, setInventorySkins] = useState<UserSkin[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [pendingSkin, setPendingSkin] = useState<PendingSkin | null>(null);
  const [userTradeUrl, setUserTradeUrl] = useState<string | null>(null);
  const [buybackAmount, setBuybackAmount] = useState<number | null>(null);

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

  // Check for pending skin and fetch user trade URL
  useEffect(() => {
    const checkPendingSkin = async () => {
      try {
        if (isConnected && user?.id) {
          console.log('🔍 Checking for pending skins with user ID:', user.id);
          
          // Fetch pending skins from API using user ID
          try {
            console.log('🔍 Fetching pending skins for user:', user.id);
            const pendingSkins = await pendingSkinsService.getPendingSkinsByUserId(user.id);
            console.log('📦 Pending skins from API:', pendingSkins);
            if (pendingSkins.length > 0) {
              setPendingSkin(pendingSkins[0]); // Show the first pending skin
              console.log('🔄 Found pending skin in database:', pendingSkins[0].skinName);
            } else {
              console.log('📭 No pending skins found in database');
            }
          } catch (apiError) {
            console.error('Failed to fetch pending skins from API:', apiError);
            // Fallback to localStorage
            const stored = localStorage.getItem('pendingSkin');
            if (stored) {
              const pendingSkinData = JSON.parse(stored);
              setPendingSkin(pendingSkinData);
              console.log('🔄 Fallback: Found pending skin in localStorage:', pendingSkinData.name);
            }
          }

          // Try to fetch user profile for trade URL (but don't fail if it doesn't work)
          try {
            const userProfile = await authService.getProfile();
            setUserTradeUrl(userProfile.tradeUrl || null);
          } catch (profileError) {
            console.log('Could not fetch user profile, will try again later:', profileError);
            // Don't fail the whole process if profile fetch fails
          }
        }
      } catch (error) {
        console.error('Failed to check pending skin:', error);
      }
    };

    checkPendingSkin();
  }, [isConnected, user?.id]);

  // Claim pending skin
  const claimPendingSkin = async () => {
    if (!pendingSkin) return;

    try {
      // Check if user has Steam Trade URL set up
      if (!userTradeUrl || userTradeUrl.trim() === '') {
        toast.error("Please set up your Steam Trade URL in your profile before claiming skins!");
        return;
      }

      // Claim the pending skin via API (Discord ticket will be created automatically)
      const claimedSkin = await pendingSkinsService.claimPendingSkin(
        pendingSkin.id,
        walletAddress || undefined,
        userTradeUrl || undefined
      );
      console.log('✅ Pending skin claimed successfully:', claimedSkin.id);

      // Clear the pending skin from state and localStorage
      setPendingSkin(null);
      localStorage.removeItem('pendingSkin');
      
      toast.success("Skin claimed to inventory!");
    } catch (error) {
      console.error("Failed to claim pending skin:", error);
      toast.error("Failed to claim skin");
    }
  };

  const loadInventory = async () => {
    try {
      setLoading(true);
      const response = await inventoryService.getInventory({
        sortBy: sortBy as any,
        filterBy: filterBy === "all" ? undefined : (filterBy as any),
      });
      // The API returns { success: true, data: items } or just the items array directly
      let inventoryItems = [];
      if (Array.isArray(response)) {
        // Response is already the items array
        inventoryItems = response;
      } else if (response && response.data && Array.isArray(response.data)) {
        // Response has data property with items array
        inventoryItems = response.data;
      } else if (response && response.skins && Array.isArray(response.skins)) {
        // Response has skins property (legacy format)
        inventoryItems = response.skins;
      }
      
      setInventorySkins(inventoryItems);
      setTotalValue(Number(response?.summary?.totalValue ?? 0));
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
    // Colorful tiers while rest of UI stays monochrome
    switch (rarity.toLowerCase()) {
      case "common":
        return "bg-gray-500/20 text-gray-300 border border-gray-500/30";
      case "uncommon":
        return "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";
      case "rare":
        return "bg-sky-500/20 text-sky-300 border border-sky-500/30";
      case "epic":
        return "bg-purple-500/20 text-purple-300 border border-purple-500/30";
      case "legendary":
        return "bg-amber-500/20 text-amber-300 border border-amber-500/30";
      default:
        return "bg-zinc-900 text-zinc-300 border border-zinc-800";
    }
  };

  const filteredSkins = useMemo(() => {
    return inventorySkins.filter((skin) => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        skin.name.toLowerCase().includes(searchLower) ||
        skin.name.toLowerCase().includes(searchLower)
      );
    });
  }, [inventorySkins, searchTerm]);

  const handleSellSkin = async (skin: UserSkin) => {
    setSelectedSkin(skin);
    setIsSellingDialogOpen(true);
    
    // Calculate buyback amount
    try {
      if (skin.nftMintAddress) {
        const calculation = await buybackService.calculateBuyback(skin.nftMintAddress);
        setBuybackAmount(calculation.buybackAmount);
      }
    } catch (error) {
      console.error('Failed to calculate buyback:', error);
      setBuybackAmount(null);
    }
  };

  const confirmSell = async () => {
    if (!selectedSkin || !selectedSkin.nftMintAddress) {
      toast.error('Invalid NFT');
      return;
    }

    if (!wallet.connected || !wallet.publicKey) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      setSelling(true);
      
      // Execute buyback through the new service
      const result = await buybackService.executeBuyback(
        selectedSkin.nftMintAddress,
        wallet,
        connection
      );

      toast.success(
        `Buyback complete! Received ${result.amountPaid.toFixed(4)} SOL`
      );
      
      setIsSellingDialogOpen(false);
      setSelectedSkin(null);
      setBuybackAmount(null);
      
      // Reload inventory
      loadInventory();
    } catch (err) {
      console.error("Failed to execute buyback:", err);
      toast.error(err instanceof Error ? err.message : "Failed to execute buyback");
    } finally {
      setSelling(false);
    }
  };

  // Show not connected state
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] py-8">
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
      <div className="min-h-screen bg-[#0a0a0a] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-200 mx-auto mb-4" />
            <p className="text-zinc-200">Loading inventory...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] py-8">
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
              <div className="text-3xl font-bold text-foreground">
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
              className="pl-10 bg-zinc-950 border-zinc-800"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full md:w-48 bg-zinc-950 border-zinc-800">
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
            <SelectTrigger className="w-full md:w-48 bg-zinc-950 border-zinc-800">
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

        {/* Pending Skin */}
        {pendingSkin && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-yellow-500" />
              <h3 className="text-lg font-semibold text-yellow-200">Pending Skin</h3>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <Card className="group bg-gradient-to-b from-yellow-950/20 to-yellow-900/20 border border-yellow-500/30 transition-transform duration-200 hover:scale-[1.015] hover:border-yellow-400/50">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className="bg-yellow-500/20 text-yellow-200 border-yellow-500/30">
                      {pendingSkin.skinRarity}
                    </Badge>
                    <Badge variant="outline" className="text-xs bg-yellow-900/20 text-yellow-300 border border-yellow-500/30">
                      PENDING
                    </Badge>
                  </div>
                  <div className="aspect-square bg-gradient-to-br from-yellow-900/20 to-yellow-800/20 rounded-lg flex items-center justify-center mb-3">
                    <img
                      src={pendingSkin.skinImage}
                      alt={pendingSkin.skinName}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </div>
                  <CardTitle className="text-white text-lg leading-tight">
                    {pendingSkin.skinName}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl font-bold text-yellow-200">
                      ${Number(pendingSkin.skinValue).toFixed(2)}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {userTradeUrl ? (
                      <Button
                        onClick={claimPendingSkin}
                        className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-semibold"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Claim Skin
                      </Button>
                    ) : (
                      <div className="space-y-2">
                        <Button
                          disabled
                          className="w-full bg-gray-600 text-gray-300 font-semibold"
                        >
                          <Lock className="w-4 h-4 mr-2" />
                          Steam Trade URL Required
                        </Button>
                        <p className="text-xs text-yellow-300 text-center">
                          Set up your Steam Trade URL in your profile to claim this skin
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Inventory Grid */}
        {filteredSkins.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredSkins.map((skin) => (
              <Card
                key={skin.id}
                className="group bg-gradient-to-b from-zinc-950 to-zinc-900 border border-zinc-800 transition-transform duration-200 hover:scale-[1.015] hover:border-zinc-700"
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge
                      className={`${getRarityColor(
                        skin.rarity
                      )} hover:bg-transparent hover:text-inherit hover:border-inherit transition-none`}
                    >
                      {skin.rarity}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="text-xs bg-zinc-900 text-zinc-300 border border-zinc-800"
                    >
                      Owned
                    </Badge>
                  </div>
                  <div className="aspect-square rounded-lg flex items-center justify-center mb-4 animate-float border border-zinc-800 bg-zinc-950">
                    {skin.imageUrl ? (
                      <img
                        src={skin.imageUrl}
                        alt={skin.name}
                        className="w-full h-full object-contain rounded-lg"
                      />
                    ) : (
                      <Package className="w-16 h-16 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardTitle className="text-lg mb-1">
                    {skin.name}
                  </CardTitle>
                  <p className="text-foreground font-semibold mb-1">
                    {skin.description || skin.name}
                  </p>
                  <p className="text-sm text-muted-foreground mb-3">
                    {skin.attributes?.find(attr => attr.trait_type === 'Wear')?.value || 'Unknown'}
                  </p>

                  <div className="flex justify-between items-center mb-4">
                    <span className="text-2xl font-bold text-foreground">
                      {skin.attributes?.find(attr => attr.trait_type === 'Float')?.value || 'N/A'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(skin.mintedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {skin.mintedAsset && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-zinc-100 bg-transparent hover:bg-zinc-900 transition-transform duration-150 hover:scale-[1.01] focus-visible:ring-1 focus-visible:ring-zinc-600"
                        onClick={() =>
                          window.open(
                            `https://explorer.solana.com/address/${skin.mintedAsset}`,
                            "_blank"
                          )
                        }
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View NFT
                      </Button>
                    )}

                      <Button
                        size="sm"
                        className="w-full bg-zinc-100 text-black hover:bg-white transition-transform duration-150 hover:scale-[1.01] active:scale-[0.99] focus-visible:ring-1 focus-visible:ring-zinc-600"
                        onClick={() => handleSellSkin(skin)}
                      >
                        <Coins className="w-4 h-4 mr-2" />
                        Sell via Buyback
                      </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold text-foreground mb-2">
              No skins found
            </h3>
            <p className="text-muted-foreground mb-6">
              {searchTerm || filterBy !== "all"
                ? "Try adjusting your search or filters"
                : "Start opening packs to build your collection"}
            </p>
            {!searchTerm && filterBy === "all" && (
              <Button className="bg-zinc-100 text-black hover:bg-white transition-transform duration-150 hover:scale-[1.01] active:scale-[0.99] focus-visible:ring-1 focus-visible:ring-zinc-600">
                <Package className="w-4 h-4 mr-2" />
                Open Packs
              </Button>
            )}
          </div>
        )}

        {/* Sell Confirmation Dialog */}
        <Dialog
          open={isSellingDialogOpen}
          onOpenChange={setIsSellingDialogOpen}
        >
          <DialogContent className="bg-gradient-to-b from-zinc-950 to-zinc-900 border border-zinc-800">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                Confirm Buyback Sale
              </DialogTitle>
            </DialogHeader>
            {selectedSkin && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-lg border border-zinc-800 bg-zinc-950">
                  <div className="w-16 h-16 flex items-center justify-center">
                    {selectedSkin.imageUrl ? (
                      <img
                        src={selectedSkin.imageUrl}
                        alt={selectedSkin.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                    ) : (
                      <Package className="w-12 h-12 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {selectedSkin.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedSkin.attributes?.find(attr => attr.trait_type === 'Wear')?.value || 'Unknown'}
                    </p>
                    <Badge
                      className={`${getRarityColor(
                        selectedSkin.rarity
                      )} hover:bg-transparent hover:text-inherit hover:border-inherit transition-none`}
                    >
                      {selectedSkin.rarity}
                    </Badge>
                  </div>
                </div>

                <div className="p-4 rounded-lg border border-zinc-800 bg-zinc-950">
                  <div className="flex justify-between items-center">
                    <span className="text-foreground">Buyback Price:</span>
                    {buybackAmount !== null ? (
                      <span className="text-2xl font-bold text-foreground">
                        {buybackAmount.toFixed(4)} SOL
                      </span>
                    ) : (
                      <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    85% of market value
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setIsSellingDialogOpen(false)}
                    className="flex-1 border-zinc-800 hover:bg-zinc-900 transition-transform duration-150 hover:scale-[1.01] focus-visible:ring-1 focus-visible:ring-zinc-600"
                    disabled={selling}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={confirmSell}
                    className="flex-1 bg-zinc-100 text-black hover:bg-white transition-transform duration-150 hover:scale-[1.01] active:scale-[0.99] focus-visible:ring-1 focus-visible:ring-zinc-600"
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
