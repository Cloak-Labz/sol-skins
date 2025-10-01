"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Plus, Minus, Info, Zap, Loader2, Wallet } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { casesService, marketplaceService } from "@/lib/services"
import { apiClient } from "@/lib/services/api"
import { toast } from "react-hot-toast"
import { useWallet } from "@solana/wallet-adapter-react"

export default function PacksPage() {
  const { connected, publicKey, connect } = useWallet()
  const [quantity, setQuantity] = useState(1)
  const [superchargeMode, setSuperchargeMode] = useState(false)
  const [isOpening, setIsOpening] = useState(false)
  const [lootBoxes, setLootBoxes] = useState<any[]>([])
  const [selectedLootBox, setSelectedLootBox] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Load available loot boxes from backend
  useEffect(() => {
    loadLootBoxes()
  }, [])

  // Update API client with wallet address when wallet connects
  useEffect(() => {
    if (connected && publicKey) {
      apiClient.setWalletAddress(publicKey.toString())
      console.log('Wallet connected:', publicKey.toString())
    } else {
      apiClient.setWalletAddress(null)
    }
  }, [connected, publicKey])

  const loadLootBoxes = async () => {
    try {
      setLoading(true)
      console.log('Loading loot boxes...')
      const response = await marketplaceService.getLootBoxes({ limit: 10 })
      console.log('Loot boxes response:', response)
      
      if (response.success && response.data) {
        setLootBoxes(response.data)
        // Select the first loot box as default
        if (response.data.length > 0) {
          setSelectedLootBox(response.data[0])
        }
      }
    } catch (error) {
      console.error('Error loading loot boxes:', error)
      toast.error('Failed to load loot boxes')
    } finally {
      setLoading(false)
    }
  }

  const probabilityData = [
    { range: "$12-$30", percentage: "88.47%", color: "text-gray-400" },
    { range: "$30-$100", percentage: "9%", color: "text-green-400" },
    { range: "$100-$200", percentage: "2%", color: "text-blue-400" },
    { range: "$200-$500", percentage: "0.5%", color: "text-purple-400" },
    { range: "$500-$1,000", percentage: "0.02%", color: "text-red-400" },
    { range: "$1,000-$2,000+", percentage: "0.01%", color: "text-yellow-400" },
  ]

  const otherPacks = [
    { id: 1, name: "Rookie Pack", image: "/cs-go-rookie-pack.jpg", active: true },
    { id: 2, name: "Pro Pack", image: "/cs-go-pro-pack.jpg", active: false },
    { id: 3, name: "Elite Pack", image: "/cs-go-elite-pack.jpg", active: false },
    { id: 4, name: "Legend Pack", image: "/cs-go-legend-pack.jpg", active: false },
    { id: 5, name: "Coming Soon", image: "/coming-soon-pack.jpg", active: false, comingSoon: true },
    { id: 6, name: "Coming Soon", image: "/coming-soon-pack.jpg", active: false, comingSoon: true },
    { id: 7, name: "Coming Soon", image: "/coming-soon-pack.jpg", active: false, comingSoon: true },
  ]

  const handleOpenPack = async () => {
    if (isOpening) return

    // Check wallet connection
    if (!connected || !publicKey) {
      toast.error('Please connect your wallet first')
      return
    }

    if (!selectedLootBox) {
      toast.error('No loot box selected')
      return
    }

    // Redirect directly to the opening page with the loot box ID
    window.location.href = `/open/${selectedLootBox.id}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] p-6 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-white mx-auto mb-4" />
          <p className="text-white">Loading loot boxes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6 relative z-50">
      <div className="mb-6 relative z-50">
        <Link href="/marketplace" className="inline-flex items-center text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Marketplace
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto relative z-50">
        <div className="relative z-50">
          <Card className="bg-[#1a1a1a] border-[#333] rounded-2xl overflow-hidden">
            <CardContent className="p-0 relative">
              {/* Status badges */}
              <div className="absolute top-4 left-4 z-10">
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                  In Stock
                </Badge>
              </div>
              <div className="absolute top-4 right-4 z-10">
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">+2,500 pts</Badge>
              </div>

              {/* Main pack image */}
              <div className="aspect-square bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] flex items-center justify-center">
                {selectedLootBox?.imageUrl ? (
                  <img 
                    src={selectedLootBox.imageUrl} 
                    alt={selectedLootBox.name} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="text-8xl">📦</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 relative z-50">
          <div>
            <h1 className="text-4xl font-bold text-white mb-4">
              {selectedLootBox?.name || 'Select a Loot Box'}
            </h1>
            <p className="text-gray-400 text-lg leading-relaxed">
              Open a pack to instantly reveal your card and choose to hold, trade, redeem, or accept a{" "}
              <span className="text-white font-semibold">85% instant buyback offer</span> based on your card's fair
              market value. Each pack contains one professionally graded and authenticated trading card, securely
              vaulted and fully insured.
            </p>
            <div className="flex items-center gap-4 mt-4">
              <Link href="#" className="text-gray-400 hover:text-white text-sm underline">
                Read disclaimer
              </Link>
              <span className="text-gray-600">|</span>
              <span className="text-gray-400 text-sm">Professionally graded & insured</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-white">Odds & Probabilities</h3>
                <Info className="w-4 h-4 text-gray-400" />
              </div>
              <div className="text-right">
                <p className="text-gray-400 text-sm">Expected Value</p>
                <p className="text-green-400 text-xl font-bold">$25.81</p>
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-4">Real-time probability data</p>

            <div className="grid grid-cols-3 gap-3">
              {selectedLootBox?.chances ? (
                Object.entries(selectedLootBox.chances).map(([rarity, chance], index) => (
                  <Card key={index} className="bg-[#111] border-[#333] rounded-lg">
                    <CardContent className="p-3">
                      <p className="text-gray-400 text-xs mb-1 capitalize">{rarity}</p>
                      <p className="font-bold text-sm text-white">{chance}%</p>
                    </CardContent>
                  </Card>
                ))
              ) : (
                probabilityData.map((item, index) => (
                  <Card key={index} className="bg-[#111] border-[#333] rounded-lg">
                    <CardContent className="p-3">
                      <p className="text-gray-400 text-xs mb-1">{item.range}</p>
                      <p className={`font-bold text-sm ${item.color}`}>{item.percentage}</p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          <div className="space-y-4 relative z-50">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-white text-3xl font-bold">
                  {selectedLootBox ? `${parseFloat(selectedLootBox.priceSol)} SOL` : '$25.00'}
                </span>
                <span className="text-gray-400 ml-2">per pack</span>
                <span className="text-blue-400 ml-2">• +2,500 pts</span>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-[#1a1a1a] border-[#333] text-white hover:bg-[#333] w-8 h-8 p-0 relative z-50"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={isOpening}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="text-white font-bold text-xl w-8 text-center">{quantity}</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-[#1a1a1a] border-[#333] text-white hover:bg-[#333] w-8 h-8 p-0 relative z-50"
                  onClick={() => setQuantity(quantity + 1)}
                  disabled={isOpening}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-[#111] rounded-lg border border-[#333] relative z-50">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-yellow-400" />
                <div>
                  <p className="text-white font-semibold">Supercharge Mode</p>
                  <p className="text-gray-400 text-sm">Auto-sell low value cards</p>
                </div>
                <Info className="w-4 h-4 text-gray-400" />
              </div>
              <button
                onClick={() => setSuperchargeMode(!superchargeMode)}
                disabled={isOpening}
                className={`relative w-12 h-6 rounded-full transition-colors z-50 ${
                  superchargeMode ? "bg-blue-500" : "bg-[#333]"
                } ${isOpening ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    superchargeMode ? "translate-x-7" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {!connected ? (
              <Button 
                onClick={() => connect()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 text-lg rounded-lg relative z-50"
              >
                <Wallet className="w-5 h-5 mr-2" />
                Connect Wallet to Open Pack
              </Button>
            ) : (
              <Button 
                onClick={handleOpenPack}
                disabled={isOpening}
                className="w-full bg-white text-black hover:bg-gray-200 font-bold py-4 text-lg rounded-lg disabled:opacity-50 disabled:cursor-not-allowed relative z-50"
              >
                {isOpening ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Opening Pack...
                  </>
                ) : (
                  `Open Pack${quantity > 1 ? 's' : ''}`
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-12 max-w-7xl mx-auto relative z-50">
        <h3 className="text-xl font-bold text-white mb-4">Available Loot Boxes</h3>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {lootBoxes.map((lootBox) => (
            <Card
              key={lootBox.id}
              className={`flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden border-2 transition-all relative z-50 cursor-pointer ${
                selectedLootBox?.id === lootBox.id
                  ? "border-purple-500 bg-purple-500/20"
                  : "border-[#333] bg-[#1a1a1a] hover:border-[#555]"
              }`}
              onClick={() => setSelectedLootBox(lootBox)}
            >
              <CardContent className="p-0 w-full h-full">
                {lootBox.imageUrl ? (
                  <img src={lootBox.imageUrl} alt={lootBox.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#1a1a1a]">
                    <div className="text-2xl">📦</div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
