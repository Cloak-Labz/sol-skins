"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Search, Filter, Coins, ExternalLink, Package } from "lucide-react"

interface InventorySkin {
  id: string
  name: string
  weapon: string
  rarity: "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary"
  condition: string
  price: number
  image: string
  nftAddress: string
  acquiredDate: string
  canSell: boolean
}

export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("date")
  const [filterBy, setFilterBy] = useState("all")
  const [selectedSkin, setSelectedSkin] = useState<InventorySkin | null>(null)
  const [isSellingDialogOpen, setIsSellingDialogOpen] = useState(false)

  const inventorySkins: InventorySkin[] = [
    {
      id: "1",
      name: "Redline",
      weapon: "AK-47",
      rarity: "Rare",
      condition: "Field-Tested",
      price: 45.2,
      image: "🔫",
      nftAddress: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
      acquiredDate: "2024-01-15",
      canSell: true,
    },
    {
      id: "2",
      name: "Dragon Lore",
      weapon: "AWP",
      rarity: "Legendary",
      condition: "Factory New",
      price: 2450.0,
      image: "🐉",
      nftAddress: "9yQNfKWUDgzq8Pw3x6BtaRJqHFfVtaRcGgXrz5UrGSRE",
      acquiredDate: "2024-01-10",
      canSell: true,
    },
    {
      id: "3",
      name: "Asiimov",
      weapon: "M4A4",
      rarity: "Epic",
      condition: "Well-Worn",
      price: 125.5,
      image: "⚡",
      nftAddress: "3dGCvDx9BbqzqYw7VtNjRqMfHgXrz5UrGSREKWUDgzq8",
      acquiredDate: "2024-01-12",
      canSell: true,
    },
    {
      id: "4",
      name: "Fade",
      weapon: "Karambit",
      rarity: "Legendary",
      condition: "Minimal Wear",
      price: 1200.0,
      image: "🗡️",
      nftAddress: "5fHJvEy2CcqzqYw7VtNjRqMfHgXrz5UrGSREKWUDgzq8",
      acquiredDate: "2024-01-08",
      canSell: false,
    },
    {
      id: "5",
      name: "Blue Steel",
      weapon: "Glock-18",
      rarity: "Common",
      condition: "Battle-Scarred",
      price: 8.5,
      image: "🔵",
      nftAddress: "8kMNtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
      acquiredDate: "2024-01-14",
      canSell: true,
    },
  ]

  const getRarityColor = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case "common":
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
      case "uncommon":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case "rare":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30"
      case "epic":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30"
      case "legendary":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getRarityGlow = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case "common":
        return "shadow-gray-500/30"
      case "uncommon":
        return "shadow-green-500/30"
      case "rare":
        return "shadow-blue-500/30"
      case "epic":
        return "shadow-purple-500/30"
      case "legendary":
        return "shadow-yellow-500/30"
      default:
        return ""
    }
  }

  const filteredSkins = inventorySkins.filter((skin) => {
    const matchesSearch =
      skin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      skin.weapon.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterBy === "all" || skin.rarity.toLowerCase() === filterBy.toLowerCase()
    return matchesSearch && matchesFilter
  })

  const sortedSkins = [...filteredSkins].sort((a, b) => {
    switch (sortBy) {
      case "price-low":
        return a.price - b.price
      case "price-high":
        return b.price - a.price
      case "name":
        return a.name.localeCompare(b.name)
      case "rarity":
        return b.rarity.localeCompare(a.rarity)
      case "date":
        return new Date(b.acquiredDate).getTime() - new Date(a.acquiredDate).getTime()
      default:
        return 0
    }
  })

  const totalValue = inventorySkins.reduce((sum, skin) => sum + skin.price, 0)

  const handleSellSkin = (skin: InventorySkin) => {
    setSelectedSkin(skin)
    setIsSellingDialogOpen(true)
  }

  const confirmSell = () => {
    // Handle sell logic here
    setIsSellingDialogOpen(false)
    setSelectedSkin(null)
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">My Inventory</h1>
              <p className="text-muted-foreground text-lg">Manage your CS:GO skin NFTs</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Total Portfolio Value</div>
              <div className="text-3xl font-bold text-accent">${totalValue.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">{inventorySkins.length} items</div>
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
        {sortedSkins.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedSkins.map((skin) => (
              <Card
                key={skin.id}
                className={`bg-card border-2 ${getRarityColor(skin.rarity)} ${getRarityGlow(skin.rarity)} hover:scale-105 transition-all duration-200`}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={getRarityColor(skin.rarity)}>{skin.rarity}</Badge>
                    {!skin.canSell && (
                      <Badge variant="outline" className="text-xs">
                        Locked
                      </Badge>
                    )}
                  </div>
                  <div className="aspect-square bg-muted rounded-lg flex items-center justify-center text-6xl mb-4 animate-float">
                    {skin.image}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardTitle className="text-lg mb-1">{skin.weapon}</CardTitle>
                  <p className="text-accent font-semibold mb-1">{skin.name}</p>
                  <p className="text-sm text-muted-foreground mb-3">{skin.condition}</p>

                  <div className="flex justify-between items-center mb-4">
                    <span className="text-2xl font-bold text-foreground">${skin.price.toFixed(2)}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(skin.acquiredDate).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-accent/50 text-accent hover:bg-accent/10 bg-transparent"
                      onClick={() => window.open(`https://explorer.solana.com/address/${skin.nftAddress}`, "_blank")}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View NFT
                    </Button>

                    {skin.canSell && (
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
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No skins found</h3>
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
        <Dialog open={isSellingDialogOpen} onOpenChange={setIsSellingDialogOpen}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Confirm Buyback Sale</DialogTitle>
            </DialogHeader>
            {selectedSkin && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                  <div className="text-4xl">{selectedSkin.image}</div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {selectedSkin.weapon} | {selectedSkin.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">{selectedSkin.condition}</p>
                    <Badge className={getRarityColor(selectedSkin.rarity)}>{selectedSkin.rarity}</Badge>
                  </div>
                </div>

                <div className="bg-accent/10 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-foreground">Buyback Price:</span>
                    <span className="text-2xl font-bold text-accent">${(selectedSkin.price * 0.85).toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    85% of market value (${selectedSkin.price.toFixed(2)})
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setIsSellingDialogOpen(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button
                    onClick={confirmSell}
                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    Confirm Sale
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
