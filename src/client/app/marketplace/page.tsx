"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Search, Filter, Package, Loader2 } from "lucide-react"
import Link from "next/link"
import { marketplaceService } from "@/lib/services"
import { LootBoxType } from "@/lib/types/api"
import { formatSOL, getRarityBgColor } from "../../lib/utils"

export default function MarketplacePage() {
  const [lootBoxes, setLootBoxes] = useState<LootBoxType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("featured")
  const [filterBy, setFilterBy] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Load loot boxes from API (doesn't require wallet connection)
  useEffect(() => {
    loadLootBoxes()
  }, [searchTerm, sortBy, filterBy, currentPage])
  
  // Reset to page 1 when filters change
  // (split from loadLootBoxes effect to avoid double load)

  const loadLootBoxes = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const filters = {
        search: searchTerm || undefined,
        sortBy: sortBy as any,
        filterBy: filterBy as any,
        page: currentPage,
        limit: 20
      }

      const response = await marketplaceService.getLootBoxes(filters)
      
      // Handle the actual API response structure
      if (response.success && response.data) {
        setLootBoxes(response.data)
        setTotalPages(response.pagination?.totalPages || 1)
      } else {
        setLootBoxes([])
        setTotalPages(1)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load loot boxes')
      setLootBoxes([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1) // Reset to first page when searching
  }

  const handleSortChange = (value: string) => {
    setSortBy(value)
    setCurrentPage(1)
  }

  const handleFilterChange = (value: string) => {
    setFilterBy(value)
    setCurrentPage(1)
  }

  const getRarityColorClass = (rarity: string) => {
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

  // Show loading state only on initial load
  if (loading && lootBoxes.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] p-8 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-white mx-auto mb-4" />
          <p className="text-white">Loading loot boxes...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h3 className="text-xl font-semibold text-white mb-2">Error loading loot boxes</h3>
          <p className="text-[#999] mb-4">{error}</p>
          <Button 
            onClick={loadLootBoxes}
            className="bg-[#333] hover:bg-[#444] text-white border-0"
          >
            Try Again
          </Button>
        </div>
      </div>
    )
  }

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
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10 bg-[#1a1a1a] border-[#333] text-white placeholder:text-[#666]"
          />
        </div>
        <Select value={sortBy} onValueChange={handleSortChange}>
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
        <Select value={filterBy} onValueChange={handleFilterChange}>
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
        {lootBoxes.map((box) => (
          <Card
            key={box.id}
            className="bg-[#111] border-[#333] hover:border-[#555] transition-all duration-200 hover:scale-105 relative overflow-hidden"
          >
            {box.isFeatured && (
              <div className="absolute top-4 right-4 z-10">
                <Badge className="bg-[#333] text-white border-0">Featured</Badge>
              </div>
            )}
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between mb-2">
                <CardTitle className="text-white">{box.name}</CardTitle>
                <Badge className={getRarityColorClass(box.rarity)}>
                  {box.rarity}
                </Badge>
              </div>
              <div className="aspect-square bg-[#1a1a1a] rounded-lg flex items-center justify-center mb-4 border border-[#333] overflow-hidden">
                {box.imageUrl ? (
                  <img 
                    src={box.imageUrl} 
                    alt={box.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-6xl">📦</div>
                )}
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
                  {formatSOL(parseFloat(box.priceSol))}
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

      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-white" />
        </div>
      )}

      {lootBoxes.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-xl font-semibold text-white mb-2">No loot boxes found</h3>
          <p className="text-[#999]">Try adjusting your search or filters</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-8 gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="bg-[#1a1a1a] border-[#333] text-white hover:bg-[#333]"
          >
            Previous
          </Button>
          <span className="flex items-center px-4 text-white">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="bg-[#1a1a1a] border-[#333] text-white hover:bg-[#333]"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
