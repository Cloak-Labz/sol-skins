"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Plus, Minus, Info, Zap } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

export default function PacksPage() {
  const [quantity, setQuantity] = useState(1)
  const [superchargeMode, setSuperchargeMode] = useState(false)

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

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6">
      <div className="mb-6">
        <Link href="/packs" className="inline-flex items-center text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
        <div className="relative">
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
                <img src="/cs-go-rookie-pack-with-purple-neon-effects.jpg" alt="Rookie Pack" className="w-full h-full object-cover" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-4xl font-bold text-white mb-4">Rookie Pack</h1>
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
              {probabilityData.map((item, index) => (
                <Card key={index} className="bg-[#111] border-[#333] rounded-lg">
                  <CardContent className="p-3">
                    <p className="text-gray-400 text-xs mb-1">{item.range}</p>
                    <p className={`font-bold text-sm ${item.color}`}>{item.percentage}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-white text-3xl font-bold">$25.00</span>
                <span className="text-gray-400 ml-2">per pack</span>
                <span className="text-blue-400 ml-2">• +2,500 pts</span>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-[#1a1a1a] border-[#333] text-white hover:bg-[#333] w-8 h-8 p-0"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="text-white font-bold text-xl w-8 text-center">{quantity}</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-[#1a1a1a] border-[#333] text-white hover:bg-[#333] w-8 h-8 p-0"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-[#111] rounded-lg border border-[#333]">
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
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  superchargeMode ? "bg-blue-500" : "bg-[#333]"
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    superchargeMode ? "translate-x-7" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <Button className="w-full bg-white text-black hover:bg-gray-200 font-bold py-4 text-lg rounded-lg">
              Open Pack
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-12 max-w-7xl mx-auto">
        <div className="flex gap-4 overflow-x-auto pb-4">
          {otherPacks.map((pack) => (
            <Card
              key={pack.id}
              className={`flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden border-2 transition-all ${
                pack.active
                  ? "border-purple-500 bg-purple-500/20"
                  : pack.comingSoon
                    ? "border-[#333] bg-[#1a1a1a] opacity-50"
                    : "border-[#333] bg-[#1a1a1a] hover:border-[#555] cursor-pointer"
              }`}
            >
              <CardContent className="p-0 w-full h-full">
                <img src={pack.image || "/placeholder.svg"} alt={pack.name} className="w-full h-full object-cover" />
                {pack.comingSoon && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <span className="text-gray-400 text-xs font-semibold">Coming Soon</span>
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
