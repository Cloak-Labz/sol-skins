"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NeonCard } from "@/components/neon-card";
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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Search,
  Filter,
  Package,
  Loader2,
  Lock,
  Zap,
  X,
} from "lucide-react";
import { inventoryService, authService, buybackService } from "@/lib/services";
import { UserSkin } from "@/lib/types/api";
import { useUser } from "@/lib/contexts/UserContext";
import { toast } from "sonner";
 
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { getSolscanUrl } from "@/lib/utils";

// Use the typed service directly


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
  
  const [userTradeUrl, setUserTradeUrl] = useState<string | null>(null);
  const [payoutAmount, setPayoutAmount] = useState<number | null>(null);
  

  // Load inventory from backend
  useEffect(() => {
    if (isConnected) {
      loadInventory();
    } else {
      // Not connected - clear data and stop loading
      setLoading(false);
      setInventorySkins([]);
      setTotalValue(0);
    }
  }, [isConnected]); // Only depend on isConnected, filters handled in loadInventory

  // Fetch user profile for trade URL (kept)
  useEffect(() => {
    const fetchTradeUrl = async () => {
      try {
        const userProfile = await authService.getProfile();
        setUserTradeUrl(userProfile.tradeUrl || null);
      } catch {}
    };
    if (isConnected) fetchTradeUrl();
  }, [isConnected]);

  

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
      
      // Calculate total value from individual skin prices
      const calculatedTotalValue = inventoryItems.reduce((sum, skin) => {
        const price = parseFloat(skin.currentPriceUsd || skin.skinTemplate?.basePriceUsd || '0');
        return sum + price;
      }, 0);
      
      setTotalValue(calculatedTotalValue);
    } catch (err) {
      
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
    const filtered = inventorySkins.filter((skin) => {
      // Filter by search term
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = (
          skin.name.toLowerCase().includes(searchLower) ||
          skin.skinTemplate?.skinName?.toLowerCase().includes(searchLower) ||
          skin.skinTemplate?.weapon?.toLowerCase().includes(searchLower)
        );
        if (!matchesSearch) return false;
      }

      // Filter by rarity
      if (filterBy !== "all") {
        const skinRarity = skin.skinTemplate?.rarity?.toLowerCase() || 'unknown';
        if (skinRarity !== filterBy.toLowerCase()) return false;
      }

      return true;
    });

    // Sort the filtered results
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "price-high":
          const valueA = parseFloat(a.currentPriceUsd || a.skinTemplate?.basePriceUsd || '0');
          const valueB = parseFloat(b.currentPriceUsd || b.skinTemplate?.basePriceUsd || '0');
          return valueB - valueA; // Descending order (highest first)
        case "price-low":
          const valueA2 = parseFloat(a.currentPriceUsd || a.skinTemplate?.basePriceUsd || '0');
          const valueB2 = parseFloat(b.currentPriceUsd || b.skinTemplate?.basePriceUsd || '0');
          return valueA2 - valueB2; // Ascending order (lowest first)
        case "rarity":
          const rarityOrder = { legendary: 5, epic: 4, rare: 3, uncommon: 2, common: 1 };
          const rarityA = rarityOrder[a.skinTemplate?.rarity?.toLowerCase() as keyof typeof rarityOrder] || 0;
          const rarityB = rarityOrder[b.skinTemplate?.rarity?.toLowerCase() as keyof typeof rarityOrder] || 0;
          return rarityB - rarityA; // Descending order (highest rarity first)
        case "date":
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); // Newest first
      }
    });
  }, [inventorySkins, searchTerm, filterBy, sortBy]);

  const handleSellSkin = async (skin: UserSkin) => {
    setSelectedSkin(skin);
    setIsSellingDialogOpen(true);
    
    // Calculate payout amount
    try {
      if (skin.nftMintAddress) {
        const calculation = await buybackService.calculateBuyback(skin.nftMintAddress);
        
        setPayoutAmount(calculation?.buybackAmount || 0);
      }
    } catch (error) {
      
      setPayoutAmount(null);
    }
  };

  const confirmSell = async () => {
    const nftMint = selectedSkin?.nftMintAddress;
    if (!nftMint) {
      toast.error('Invalid NFT');
      return;
    }

    if (!wallet.connected || !wallet.publicKey) {
      toast.error('Please connect your wallet');
      return;
    }

    let currentToast: number | string | undefined;
    try {
      setSelling(true);

      // Step 1: Calculating buyback amount (already fetched in dialog, but mirror UX)
      if (typeof payoutAmount === 'number') {
        currentToast = toast.loading(`Buyback: ${Number(payoutAmount).toFixed(6)} SOL - Requesting transaction...`);
      } else {
        currentToast = toast.loading('Calculating buyback amount...');
      }

      // Request unsigned transaction from backend
      const requestData = await buybackService.requestBuyback(nftMint);

      // Step 2: Sign the transaction
      toast.dismiss(currentToast);
      currentToast = toast.loading('Please sign the transaction in your wallet...');
      const signedTxBase64 = await buybackService.signBuybackTransaction(requestData.transaction, wallet);

      // Step 3: Confirm on backend
      toast.dismiss(currentToast);
      currentToast = toast.loading('Confirming buyback...');
      const walletAddress = wallet.publicKey.toBase58();
      const confirmData = await buybackService.confirmBuybackSigned({
        nftMint,
        walletAddress,
        signedTransaction: signedTxBase64,
      });

      // Success
      toast.dismiss(currentToast);
      const txSig: string | undefined =
        (confirmData as any)?.transactionSignature ||
        (confirmData as any)?.signature ||
        (confirmData as any)?.txSignature ||
        (confirmData as any)?.hash ||
        (confirmData as any)?.tx ||
        undefined;

      currentToast = toast.success(
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-sm">Skin successfully bought back! 💰</span>
          {txSig ? (
            <a
              href={getSolscanUrl(txSig)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#E99500] hover:underline inline-flex items-center gap-1"
            >
              View transaction on Solscan
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          ) : null}
        </div>,
        { duration: 6000 }
      );

      setIsSellingDialogOpen(false);
      setSelectedSkin(null);
      setPayoutAmount(null);
      await loadInventory();
    } catch (err: any) {
      toast.dismiss(currentToast);
      // Fallback: consider tx may have succeeded on-chain even if backend failed
      const fallbackMsg = err instanceof Error ? err.message : 'Failed to execute payout';
      currentToast = toast.error(fallbackMsg);
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

        

        {/* Owned Skins */}
        {filteredSkins.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-lg font-semibold text-orange-200">Owned Skins</h3>
            </div>
            {/* Full-page scroll; grid flows naturally */}
            <div className="grid md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8 auto-rows-auto">
            {filteredSkins.map((skin) => (
              <div
                key={skin.id}
                className="group relative transition-transform duration-200 hover:-translate-y-0.5 cursor-pointer"
                onClick={() => setSelectedSkin(skin)}
              >
                <NeonCard
                  topContent={
                    <div className="flex flex-col justify-between h-full">
                      {/* Skin Name */}
                      <h3 
                        className="text-orange-400 font-black text-lg mb-2 truncate uppercase tracking-wider"
                        style={{ fontFamily: "monospace" }}
                      >
                        {skin.name}
                      </h3>
                      {/* Rarity and Status */}
                      <div className="flex items-center justify-between">
                        <div className="relative">
                          <div className="absolute inset-0 bg-orange-400/20 rounded-full blur-sm"></div>
                          <div className="relative bg-gradient-to-r from-orange-500/30 to-amber-500/30 border border-orange-400/50 rounded-full px-3 py-1.5 shadow-[0_0_8px_rgba(251,146,60,0.3)] flex items-center justify-center">
                            <span 
                              className="text-orange-300 text-xs font-black uppercase tracking-wider"
                              style={{ fontFamily: "monospace" }}
                            >
                              {skin.skinTemplate?.rarity || 'Unknown'}
                            </span>
                          </div>
                        </div>
                        <div className="relative">
                          {skin.isWaitingTransfer ? (
                            <>
                              <div className="absolute inset-0 bg-yellow-400/20 rounded-full blur-sm"></div>
                              <div className="relative bg-gradient-to-r from-yellow-500/30 to-amber-500/30 border border-yellow-400/50 rounded-full px-3 py-1.5 shadow-[0_0_8px_rgba(234,179,8,0.3)] flex items-center justify-center">
                                <span 
                                  className="text-yellow-300 text-xs font-black uppercase tracking-wider"
                                  style={{ fontFamily: "monospace" }}
                                >
                                  WAITING TRANSFER
                                </span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="absolute inset-0 bg-green-400/20 rounded-full blur-sm"></div>
                              <div className="relative bg-gradient-to-r from-green-500/30 to-emerald-500/30 border border-green-400/50 rounded-full px-3 py-1.5 shadow-[0_0_8px_rgba(34,197,94,0.3)] flex items-center justify-center">
                                <span 
                                  className="text-green-300 text-xs font-black uppercase tracking-wider"
                                  style={{ fontFamily: "monospace" }}
                                >
                                  OWNED
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  }
                  bottomContent={
                    <div className="space-y-1 flex-1 pt-2">
                      {/* Skin Image */}
                      <div className="flex items-center justify-center h-8 mb-20 mt-10">
                        {skin.imageUrl ? (
                          <img
                            src={skin.imageUrl}
                            alt={skin.name}
                            className="max-h-16 max-w-16 object-contain"
                          />
                        ) : (
                          <Package className="w-16 h-16 text-orange-400" />
                        )}
                      </div>

                      {/* Skin Stats */}
                      <div className="space-y-1 flex-1">
                        <div className="flex justify-between items-center">
                          <span className="text-orange-300 text-sm font-bold uppercase tracking-wide" style={{ fontFamily: "monospace" }}>Wear:</span>
                          <span className="text-orange-400 text-sm font-bold uppercase tracking-wide" style={{ fontFamily: "monospace" }}>
                            {skin.attributes?.find(attr => attr.trait_type === 'Wear')?.value || 'Unknown'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-orange-300 text-sm font-bold uppercase tracking-wide" style={{ fontFamily: "monospace" }}>Value:</span>
                          <span className="text-orange-400 text-base font-black uppercase tracking-wide" style={{ fontFamily: "monospace" }}>
                            ${skin.currentPriceUsd || skin.skinTemplate?.basePriceUsd || '0.00'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-orange-300 text-sm font-bold uppercase tracking-wide" style={{ fontFamily: "monospace" }}>Minted At:</span>
                          <span className="text-orange-400 text-sm font-bold uppercase tracking-wide" style={{ fontFamily: "monospace" }}>
                            {new Date(skin.mintedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Sell Button */}
                      <div className="mt-6">
                        <Button
                          size="sm"
                          disabled={skin.isWaitingTransfer}
                          className="w-full bg-[#FE9310] hover:bg-[#F2840E] text-black text-xs font-black uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ fontFamily: "monospace" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!skin.isWaitingTransfer) {
                              handleSellSkin(skin);
                            }
                          }}
                        >
                          <Zap className="w-8 h-8 text-black fill-black" />
                          {skin.isWaitingTransfer ? 'Transfer Pending' : 'Take Payout'}
                        </Button>
                      </div>
                    </div>
                  }
                  className="h-auto"
                />
              </div>
            ))}
            </div>
          </div>
        )}

        {/* No Skins Found */}
        {filteredSkins.length === 0 && (
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
          <DialogContent className="bg-[#0b0b0b] border border-white/10 p-0 max-w-2xl">
            <DialogHeader className="sr-only">
              <DialogTitle>Confirm Payout</DialogTitle>
              <DialogDescription>Review the payout amount and confirm the sale of your skin</DialogDescription>
            </DialogHeader>
            {selectedSkin && (
              <div className="relative">
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setIsSellingDialogOpen(false)}
                  className="absolute top-0 right-0 z-20 inline-flex items-center justify-center rounded-full border border-white/20 bg-black/60 text-white hover:bg-black/80 hover:border-white/40 transition-colors p-2 w-8 h-8 m-4"
                >
                  <X className="w-4 h-4" />
                </button>
                {/* Top area - simple layout like before */}
                <div className="p-6">
                  <div className="flex items-center gap-4 p-4 rounded-lg border border-zinc-800 bg-zinc-950">
                    <div className="w-16 h-16 flex items-center justify-center">
                      {selectedSkin?.imageUrl ? (
                        <img src={selectedSkin.imageUrl} alt={selectedSkin.name} className="w-16 h-16 object-cover rounded" />
                      ) : (
                        <Package className="w-12 h-12 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {selectedSkin?.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedSkin?.attributes?.find(attr => attr.trait_type === 'Wear')?.value || 'Unknown'}
                      </p>
                      <Badge
                        className={`${getRarityColor(selectedSkin?.skinTemplate?.rarity || 'Unknown')} hover:bg-transparent hover:text-inherit hover:border-inherit transition-none`}
                      >
                        {selectedSkin?.skinTemplate?.rarity || 'Unknown'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Bottom action area (fixed bg) */}
                <div className="mt-6 p-6 bg-[#0d0d0d] border-t border-white/10">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Payout box */}
                    <div className="rounded-lg border border-white/10 bg-white/2 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-white font-semibold">Receive a payout</div>
                          <div className="text-white/60 text-sm">85% of market value</div>
                        </div>
                      </div>
                      <div className="mt-4 text-right">
                        {payoutAmount !== null ? (
                          <div className="text-3xl font-bold text-white">
                            {payoutAmount.toFixed(4)} SOL
                          </div>
                        ) : (
                          <Loader2 className="w-8 h-8 animate-spin text-white/50 mx-auto" />
                        )}
                      </div>
                    </div>

                    {/* Action box */}
                    <div className="rounded-lg border border-white/10 bg-white/2 p-4">
                      <div className="text-white font-semibold">Confirm Payout</div>
                      <div className="text-white/60 text-sm">Sell this skin for SOL</div>
                      <Button
                        onClick={confirmSell}
                        disabled={selling || payoutAmount === null}
                        className="mt-4 w-full bg-[#E99500] hover:bg-[#f0a116] text-black font-bold"
                      >
                        {selling ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                          <Zap className="w-8 h-8 text-black fill-black" />
                          Take Payout
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
