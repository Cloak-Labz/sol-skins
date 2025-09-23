"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Package, Coins } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface Skin {
  id: string
  name: string
  weapon: string
  rarity: "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary"
  condition: string
  price: number
  image: string
}

interface LootBox {
  id: string
  name: string
  price: number
  currency: "SOL" | "USDC"
}

export default function OpenCasePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [isOpening, setIsOpening] = useState(false)
  const [revealedSkin, setRevealedSkin] = useState<Skin | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [animationPhase, setAnimationPhase] = useState<"idle" | "spinning" | "slowing" | "revealed">("idle")

  const lootBox: LootBox = {
    id: params.id,
    name: "Weapon Case",
    price: 2.5,
    currency: "SOL",
  }

  const possibleSkins: Skin[] = [
    { id: "1", name: "Redline", weapon: "AK-47", rarity: "Rare", condition: "Field-Tested", price: 45.2, image: "🔫" },
    {
      id: "2",
      name: "Dragon Lore",
      weapon: "AWP",
      rarity: "Legendary",
      condition: "Factory New",
      price: 2450.0,
      image: "🐉",
    },
    { id: "3", name: "Asiimov", weapon: "M4A4", rarity: "Epic", condition: "Well-Worn", price: 125.5, image: "⚡" },
    {
      id: "4",
      name: "Fade",
      weapon: "Karambit",
      rarity: "Legendary",
      condition: "Minimal Wear",
      price: 1200.0,
      image: "🗡️",
    },
    { id: "5", name: "Howl", weapon: "M4A4", rarity: "Epic", condition: "Field-Tested", price: 3500.0, image: "🐺" },
    {
      id: "6",
      name: "Blue Steel",
      weapon: "Glock-18",
      rarity: "Common",
      condition: "Battle-Scarred",
      price: 8.5,
      image: "🔵",
    },
    {
      id: "7",
      name: "Crimson Web",
      weapon: "Bayonet",
      rarity: "Rare",
      condition: "Minimal Wear",
      price: 850.0,
      image: "🕷️",
    },
    {
      id: "8",
      name: "Lightning Strike",
      weapon: "AWP",
      rarity: "Uncommon",
      condition: "Factory New",
      price: 65.0,
      image: "⚡",
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
        return "shadow-gray-500/50"
      case "uncommon":
        return "shadow-green-500/50"
      case "rare":
        return "shadow-blue-500/50"
      case "epic":
        return "shadow-purple-500/50"
      case "legendary":
        return "shadow-yellow-500/50"
      default:
        return ""
    }
  }

  const openCase = async () => {
    setIsOpening(true)
    setAnimationPhase("spinning")

    // Simulate opening animation
    setTimeout(() => {
      setAnimationPhase("slowing")
    }, 2000)

    setTimeout(() => {
      // Select random skin with weighted probabilities
      const random = Math.random() * 100
      let selectedSkin: Skin

      if (random < 0.26) {
        selectedSkin = possibleSkins.find((s) => s.rarity === "Legendary") || possibleSkins[1]
      } else if (random < 0.9) {
        selectedSkin = possibleSkins.find((s) => s.rarity === "Epic") || possibleSkins[2]
      } else if (random < 4.1) {
        selectedSkin = possibleSkins.find((s) => s.rarity === "Rare") || possibleSkins[0]
      } else if (random < 20.08) {
        selectedSkin = possibleSkins.find((s) => s.rarity === "Uncommon") || possibleSkins[7]
      } else {
        selectedSkin = possibleSkins.find((s) => s.rarity === "Common") || possibleSkins[5]
      }

      setRevealedSkin(selectedSkin)
      setAnimationPhase("revealed")
      setShowResult(true)
    }, 4000)
  }

  const keepSkin = () => {
    // Add to inventory logic here
    router.push("/inventory")
  }

  const sellSkin = () => {
    // Instant buyback logic here
    router.push("/history")
  }

  if (showResult && revealedSkin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/10">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">Congratulations!</h1>
            <p className="text-muted-foreground">You unboxed a rare skin!</p>
          </div>

          <Card
            className={`bg-card border-2 ${getRarityColor(revealedSkin.rarity)} ${getRarityGlow(revealedSkin.rarity)} shadow-2xl animate-glow`}
          >
            <CardContent className="p-8">
              <div className="text-8xl mb-6 animate-float">{revealedSkin.image}</div>
              <Badge className={`mb-4 ${getRarityColor(revealedSkin.rarity)}`}>{revealedSkin.rarity}</Badge>
              <h2 className="text-3xl font-bold text-foreground mb-2">
                {revealedSkin.weapon} | {revealedSkin.name}
              </h2>
              <p className="text-muted-foreground mb-4">{revealedSkin.condition}</p>
              <div className="text-4xl font-bold text-accent mb-8">${revealedSkin.price.toFixed(2)}</div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={keepSkin}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground flex-1 sm:flex-none"
                >
                  <Package className="w-4 h-4 mr-2" />
                  Keep as NFT
                </Button>
                <Button
                  onClick={sellSkin}
                  variant="outline"
                  className="border-accent text-accent hover:bg-accent/10 flex-1 sm:flex-none bg-transparent"
                >
                  <Coins className="w-4 h-4 mr-2" />
                  Sell via Buyback
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="mt-8">
            <Link href="/marketplace">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Marketplace
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/10">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <div className="mb-8">
          <Link href="/marketplace">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Marketplace
            </Button>
          </Link>
          <h1 className="text-4xl font-bold text-foreground mb-2">Open {lootBox.name}</h1>
          <p className="text-muted-foreground">
            Cost: {lootBox.price} {lootBox.currency}
          </p>
        </div>

        {!isOpening ? (
          <div className="space-y-8">
            <div className="relative">
              <div className="w-80 h-80 mx-auto bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl animate-float">
                <div className="absolute inset-4 bg-card rounded-2xl border border-accent/30 flex items-center justify-center animate-glow">
                  <div className="text-8xl">📦</div>
                </div>
              </div>
            </div>

            <Button
              onClick={openCase}
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground animate-glow px-12 py-6 text-xl"
            >
              <Package className="w-6 h-6 mr-3" />
              Open Case
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* CS:GO Style Roulette Animation */}
            <div className="relative overflow-hidden bg-card rounded-xl border border-accent/30 p-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-foreground mb-2">Opening Case...</h2>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-accent h-2 rounded-full transition-all duration-4000 ease-out"
                    style={{
                      width: animationPhase === "spinning" ? "30%" : animationPhase === "slowing" ? "80%" : "100%",
                    }}
                  ></div>
                </div>
              </div>

              {/* Roulette Strip */}
              <div className="relative h-32 overflow-hidden rounded-lg border border-border">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-accent/20 to-transparent z-10"></div>
                <div className="absolute left-1/2 top-0 w-0.5 h-full bg-accent z-20 transform -translate-x-0.5"></div>

                <div
                  className={`flex h-full transition-transform duration-4000 ease-out ${
                    animationPhase === "spinning"
                      ? "animate-spin-slow"
                      : animationPhase === "slowing"
                        ? "transform translate-x-[-200px]"
                        : "transform translate-x-[-400px]"
                  }`}
                >
                  {[...possibleSkins, ...possibleSkins, ...possibleSkins].map((skin, index) => (
                    <div
                      key={index}
                      className={`flex-shrink-0 w-24 h-full border-r border-border flex flex-col items-center justify-center ${getRarityColor(skin.rarity)}`}
                    >
                      <div className="text-2xl mb-1">{skin.image}</div>
                      <div className="text-xs text-center px-1">
                        <div className="font-semibold">{skin.weapon}</div>
                        <div className="text-xs opacity-75">{skin.name}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 text-center">
                <div className="text-accent font-semibold">
                  {animationPhase === "spinning" && "Spinning..."}
                  {animationPhase === "slowing" && "Slowing down..."}
                  {animationPhase === "revealed" && "Revealed!"}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
