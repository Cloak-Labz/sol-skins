"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Package, Loader2, ExternalLink, Box } from "lucide-react";
import Link from "next/link";
import { marketplaceService } from "@/lib/services";
import { LootBoxDetails, SkinTemplate } from "@/lib/types/api";
import { formatCurrency, getRarityColor, getRarityBgColor } from "@/lib/utils";

export default function LootBoxDetailsPage() {
  const params = useParams();
  const [lootBox, setLootBox] = useState<LootBoxDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) {
      loadLootBoxDetails(params.id as string);
    }
  }, [params.id]);

  const loadLootBoxDetails = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const details = await marketplaceService.getLootBoxById(id);
      setLootBox(details);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load loot box details"
      );
    } finally {
      setLoading(false);
    }
  };

  const getRarityColorClass = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case "common":
        return "bg-gray-100 text-gray-800";
      case "uncommon":
        return "bg-green-100 text-green-800";
      case "rare":
        return "bg-blue-100 text-blue-800";
      case "epic":
        return "bg-purple-100 text-purple-800";
      case "legendary":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] p-8 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-white mx-auto mb-4" />
          <p className="text-white">Loading loot box details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h3 className="text-xl font-semibold text-white mb-2">
            Error loading loot box
          </h3>
          <p className="text-[#999] mb-4">{error}</p>
          <Button
            onClick={() => loadLootBoxDetails(params.id as string)}
            className="bg-[#333] hover:bg-[#444] text-white border-0"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!lootBox) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] p-8 flex items-center justify-center">
        <div className="text-center">
          <Box className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold text-white mb-2">
            Loot box not found
          </h3>
          <p className="text-[#999]">
            The loot box you're looking for doesn't exist
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-8">
      <div className="mb-8">
        <Link
          href="/marketplace"
          className="inline-flex items-center text-[#999] hover:text-white mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Marketplace
        </Link>
        <h1 className="text-4xl font-bold text-white mb-2">{lootBox.name}</h1>
        <p className="text-[#999] text-lg">{lootBox.description}</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Loot Box Info */}
        <div className="space-y-6">
          <Card className="bg-[#111] border-[#333]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">{lootBox.name}</CardTitle>
                <Badge className={getRarityColorClass(lootBox.rarity)}>
                  {lootBox.rarity}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="aspect-square bg-[#1a1a1a] rounded-lg flex items-center justify-center mb-4 border border-[#333] overflow-hidden">
                {lootBox.imageUrl ? (
                  <img
                    src={lootBox.imageUrl}
                    alt={lootBox.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Box className="w-16 h-16 text-muted-foreground" />
                )}
              </div>

              <div className="text-3xl font-bold text-white mb-4">
                {formatCurrency(lootBox.priceSol)} SOL
              </div>

              <div className="mb-6">
                <h4 className="text-lg font-semibold text-white mb-3">
                  Drop Chances:
                </h4>
                <div className="space-y-2">
                  {lootBox.chances.legendary > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-white">Legendary</span>
                      <span className="text-[#ccc] font-mono">
                        {lootBox.chances.legendary}%
                      </span>
                    </div>
                  )}
                  {lootBox.chances.epic > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-white">Epic</span>
                      <span className="text-[#aaa] font-mono">
                        {lootBox.chances.epic}%
                      </span>
                    </div>
                  )}
                  {lootBox.chances.rare > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-white">Rare</span>
                      <span className="text-[#999] font-mono">
                        {lootBox.chances.rare}%
                      </span>
                    </div>
                  )}
                  {lootBox.chances.uncommon > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-white">Uncommon</span>
                      <span className="text-[#777] font-mono">
                        {lootBox.chances.uncommon}%
                      </span>
                    </div>
                  )}
                  {lootBox.chances.common > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-white">Common</span>
                      <span className="text-[#666] font-mono">
                        {lootBox.chances.common}%
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <Link href={`/open/${lootBox.id}`}>
                <Button className="w-full bg-[#333] hover:bg-[#444] text-white border-0 text-lg py-6">
                  <Package className="w-5 h-5 mr-2" />
                  Open Case
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Possible Skins */}
        <div className="space-y-6">
          <Card className="bg-[#111] border-[#333]">
            <CardHeader>
              <CardTitle className="text-white">Possible Skins</CardTitle>
              <p className="text-[#999] text-sm">
                {lootBox.possibleSkins.length} different skins can be obtained
                from this case
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 max-h-96 overflow-y-auto">
                {lootBox.possibleSkins.map((skin) => (
                  <div
                    key={skin.id}
                    className="flex items-center gap-3 p-3 bg-[#1a1a1a] rounded-lg border border-[#333] hover:border-[#555] transition-colors"
                  >
                    <div className="w-12 h-12 bg-[#2a2a2a] rounded flex items-center justify-center overflow-hidden">
                      {skin.imageUrl ? (
                        <img
                          src={skin.imageUrl}
                          alt={`${skin.weapon} ${skin.skinName}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-lg">🔫</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-medium truncate">
                          {skin.weapon} {skin.skinName}
                        </span>
                        <Badge className={getRarityColorClass(skin.rarity)}>
                          {skin.rarity}
                        </Badge>
                      </div>
                      <div className="text-[#999] text-sm">
                        {skin.condition} • {formatCurrency(skin.basePriceUsd)}
                      </div>
                    </div>
                    {skin.weight && (
                      <div className="text-[#666] text-xs">
                        Weight: {skin.weight}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
