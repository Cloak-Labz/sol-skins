"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Search, Filter, Package } from "lucide-react"
import Link from "next/link"

interface LootBox {
  id: string
  name: string
  price: number
  currency: "SOL" | "USDC"
  image: string
  rarity: string
  description: string
  chances: {
    common: number
    uncommon: number
    rare: number
    epic: number
    legendary: number
  }
  featured?: boolean
}

export default function MarketplacePage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("featured")
  const [filterBy, setFilterBy] = useState("all")

  const lootBoxes: LootBox[] = [
    {
      id: "1",
      name: "Weapon Case",
      price: 2.5,
      currency: "SOL",
      image: "🎯",
      rarity: "Standard",
      description: "Contains various weapon skins from different collections",
      chances: { common: 79.92, uncommon: 15.98, rare: 3.2, epic: 0.64, legendary: 0.26 },
      featured: true,
    },
    {
      id: "2",
      name: "Knife Case",
      price: 15.0,
      currency: "SOL",
      image: "🗡️",
      rarity: "Premium",
      description: "Exclusive knife skins with guaranteed rare drops",
      chances: { common: 0, uncommon: 50, rare: 35, epic: 12, legendary: 3 },
      featured: true,
    },
    {
      id: "3",
      name: "Glove Case",
      price: 8.5,
      currency: "SOL",
      image: "🧤",
      rarity: "Special",
      description: "Rare glove skins collection",
      chances: { common: 20, uncommon: 40, rare: 25, epic: 12, legendary: 3 },
    },
    {
      id: "4",
      name: "Operation Case",
      price: 5.0,
      currency: "SOL",
      image: "⚡",
      rarity: "Limited",
      description: "Limited time operation skins",
      chances: { common: 60, uncommon: 25, rare: 10, epic: 4, legendary: 1 },
    },
    {
      id: "5",
      name: "Sticker Capsule",
      price: 1.2,
      currency: "SOL",
      image: "🏷️",
      rarity: "Common",
      description: "Team stickers and holo stickers",
      chances: { common: 85, uncommon: 12, rare: 2.5, epic: 0.4, legendary: 0.1 },
    },
    {
      id: "6",
      name: "Dragon Lore Case",
      price: 50.0,
      currency: "SOL",
      image: "🐉",
      rarity: "Legendary",
      description: "Ultra rare case with guaranteed high-value skins",
      chances: { common: 0, uncommon: 0, rare: 40, epic: 45, legendary: 15 },
      featured: true,
    },
  ]

  const getRarityColor = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case "standard":
        return "bg-muted text-muted-foreground"
      case "premium":
        return "bg-accent/20 text-accent"
      case "special":
        return "bg-primary/20 text-primary"
      case "limited":
        return "bg-destructive/20 text-destructive"
      case "legendary":
        return "bg-gradient-to-r from-primary to-accent text-white"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const filteredBoxes = lootBoxes.filter((box) => {
    const matchesSearch = box.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterBy === "all" || box.rarity.toLowerCase() === filterBy.toLowerCase()
    return matchesSearch && matchesFilter
  })

  const sortedBoxes = [...filteredBoxes].sort((a, b) => {
    switch (sortBy) {
      case "price-low":
        return a.price - b.price
      case "price-high":
        return b.price - a.price
      case "name":
        return a.name.localeCompare(b.name)
      case "featured":
        return (b.featured ? 1 : 0) - (a.featured ? 1 : 0)
      default:
        return 0
    }
  })

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Loot Box Marketplace</h1>
        <p className="text-[#999] text-lg">Choose your case and test your luck</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#666] w-4 h-4" />
          <Input
            placeholder="Search loot boxes..."
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
            <SelectItem value="featured">Featured</SelectItem>
            <SelectItem value="price-low">Price: Low to High</SelectItem>
            <SelectItem value="price-high">Price: High to Low</SelectItem>
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
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="premium">Premium</SelectItem>
            <SelectItem value="special">Special</SelectItem>
            <SelectItem value="limited">Limited</SelectItem>
            <SelectItem value="legendary">Legendary</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedBoxes.map((box) => (
          <Card
            key={box.id}
            className="bg-[#111] border-[#333] hover:border-[#555] transition-all duration-200 hover:scale-105 relative overflow-hidden"
          >
            {box.featured && (
              <div className="absolute top-4 right-4 z-10">
                <Badge className="bg-[#333] text-white border-0">Featured</Badge>
              </div>
            )}
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between mb-2">
                <CardTitle className="text-white">{box.name}</CardTitle>
                <Badge className="bg-[#1a1a1a] text-[#999] border-[#333]">{box.rarity}</Badge>
              </div>
              <div className="aspect-square bg-[#1a1a1a] rounded-lg flex items-center justify-center text-6xl mb-4 border border-[#333]">
                {box.image}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-[#999] text-sm mb-4">{box.description}</p>

              <div className="mb-4">
                <h4 className="text-sm font-semibold text-white mb-2">Drop Chances:</h4>
                <div className="space-y-1 text-xs">
                  {box.chances.legendary > 0 && (
                    <div className="flex justify-between text-[#ccc]">
                      <span>Legendary</span>
                      <span>{box.chances.legendary}%</span>
                    </div>
                  )}
                  {box.chances.epic > 0 && (
                    <div className="flex justify-between text-[#aaa]">
                      <span>Epic</span>
                      <span>{box.chances.epic}%</span>
                    </div>
                  )}
                  {box.chances.rare > 0 && (
                    <div className="flex justify-between text-[#999]">
                      <span>Rare</span>
                      <span>{box.chances.rare}%</span>
                    </div>
                  )}
                  {box.chances.uncommon > 0 && (
                    <div className="flex justify-between text-[#777]">
                      <span>Uncommon</span>
                      <span>{box.chances.uncommon}%</span>
                    </div>
                  )}
                  {box.chances.common > 0 && (
                    <div className="flex justify-between text-[#666]">
                      <span>Common</span>
                      <span>{box.chances.common}%</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-white">
                  {box.price} {box.currency}
                </div>
                <Link href={`/open/${box.id}`}>
                  <Button className="bg-[#333] hover:bg-[#444] text-white border-0">
                    <Package className="w-4 h-4 mr-2" />
                    Open Case
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {sortedBoxes.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-xl font-semibold text-white mb-2">No loot boxes found</h3>
          <p className="text-[#999]">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  )
}
