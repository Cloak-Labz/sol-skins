"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Package, Coins, Loader2, Box } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { casesService, marketplaceService } from "@/lib/services";
import { apiClient } from "@/lib/services/api";
import { LootBoxTypeDetails, CaseOpening } from "@/lib/types/api";
import { formatSOL, getRarityColor, getRarityBgColor } from "@/lib/utils";
import { toast } from "react-hot-toast";
import { useUser } from "@/lib/contexts/UserContext";

export default function OpenCasePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [lootBox, setLootBox] = useState<LootBoxTypeDetails | null>(null);
  const [caseOpening, setCaseOpening] = useState<CaseOpening | null>(null);
  const [isOpening, setIsOpening] = useState(false);
  const [revealedSkin, setRevealedSkin] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<
    "idle" | "spinning" | "slowing" | "revealed"
  >("idle");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isConnected } = useUser();

  // Load loot box details
  useEffect(() => {
    if (!params.id) return;
    loadLootBoxDetails();
  }, [params.id]);

  // Poll for case opening status if we have an opening in progress
  useEffect(() => {
    if (caseOpening && caseOpening.status === "pending") {
      const interval = setInterval(() => {
        checkOpeningStatus();
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [caseOpening]);

  const loadLootBoxDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // params.id is the loot box ID, not the case opening ID
      const lootBoxResponse = await marketplaceService.getLootBoxById(
        params.id!
      );
      setLootBox(lootBoxResponse.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load loot box details"
      );
      toast.error("Failed to load loot box details");
    } finally {
      setLoading(false);
    }
  };

  const checkOpeningStatus = async () => {
    if (!caseOpening) return;

    try {
      const updatedOpening = await casesService.getOpeningStatus(
        caseOpening.id
      );
      setCaseOpening(updatedOpening);

      if (updatedOpening.status === "completed" && updatedOpening.skinResult) {
        setRevealedSkin(updatedOpening.skinResult);
        setAnimationPhase("revealed");
        setShowResult(true);
        setIsOpening(false);
      } else if (updatedOpening.status === "failed") {
        setError("Case opening failed");
        setIsOpening(false);
        toast.error("Case opening failed");
      }
    } catch (err) {
      console.error("Failed to check opening status:", err);
    }
  };

  const openCase = async () => {
    if (!lootBox) return;
    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }

    try {
      setIsOpening(true);
      setAnimationPhase("spinning");
      setError(null);

      const response = await casesService.openCase({
        lootBoxTypeId: lootBox.id,
        paymentMethod: "SOL", // Default to SOL for now
      });

      // Create a case opening object for the UI
      const newOpening: CaseOpening = {
        id: response.data.caseOpeningId,
        status: "pending",
        vrfRequestId: response.data.vrfRequestId,
        openedAt: new Date().toISOString(),
        estimatedCompletionTime: response.data.estimatedCompletionTime,
      };

      setCaseOpening(newOpening);
      toast.success("Case opening initiated!");

      // Animation sequence
      setTimeout(() => {
        setAnimationPhase("slowing");
      }, 2000);

      // Since we're simulating, we need to get the result
      // In production, this would be VRF callback
      setTimeout(async () => {
        // Simulate result
        simulateResult();
      }, 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open case");
      setIsOpening(false);
      setAnimationPhase("idle");
      toast.error(err instanceof Error ? err.message : "Failed to open case");
    }
  };

  const simulateResult = () => {
    if (!lootBox?.possibleSkins || lootBox.possibleSkins.length === 0) {
      // Fallback if no skins available
      toast.error("No skins available in this loot box");
      setIsOpening(false);
      setAnimationPhase("idle");
      return;
    }

    // Select random skin with weighted probabilities based on loot box chances
    const random = Math.random() * 100;
    let selectedSkin: any;

    const chances = lootBox.chances;
    const legendaryThreshold = parseFloat(chances.legendary);
    const epicThreshold = legendaryThreshold + parseFloat(chances.epic);
    const rareThreshold = epicThreshold + parseFloat(chances.rare);
    const uncommonThreshold = rareThreshold + parseFloat(chances.uncommon);

    if (random < legendaryThreshold) {
      selectedSkin = lootBox.possibleSkins.find(
        (s) => s.rarity === "Legendary"
      );
    } else if (random < epicThreshold) {
      selectedSkin = lootBox.possibleSkins.find((s) => s.rarity === "Epic");
    } else if (random < rareThreshold) {
      selectedSkin = lootBox.possibleSkins.find((s) => s.rarity === "Rare");
    } else if (random < uncommonThreshold) {
      selectedSkin = lootBox.possibleSkins.find((s) => s.rarity === "Uncommon");
    } else {
      selectedSkin = lootBox.possibleSkins.find((s) => s.rarity === "Common");
    }

    // Fallback to random skin if no skin found for rarity
    if (!selectedSkin) {
      selectedSkin =
        lootBox.possibleSkins[
          Math.floor(Math.random() * lootBox.possibleSkins.length)
        ];
    }

    console.log("Simulated result:", selectedSkin);
    setRevealedSkin(selectedSkin);
    setAnimationPhase("revealed");
    setShowResult(true);
    setIsOpening(false);
  };

  const keepSkin = async () => {
    if (!caseOpening) return;

    try {
      await casesService.makeDecision(caseOpening.id, { decision: "keep" });
      toast.success("Skin added to your inventory!");
      router.push("/inventory");
    } catch (err) {
      toast.error("Failed to keep skin");
    }
  };

  const sellSkin = async () => {
    if (!caseOpening) return;

    try {
      await casesService.makeDecision(caseOpening.id, { decision: "buyback" });
      toast.success("Skin sold via buyback!");
      router.push("/history");
    } catch (err) {
      toast.error("Failed to sell skin");
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

  const getRarityGlow = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case "common":
        return "shadow-gray-500/50";
      case "uncommon":
        return "shadow-green-500/50";
      case "rare":
        return "shadow-blue-500/50";
      case "epic":
        return "shadow-purple-500/50";
      case "legendary":
        return "shadow-yellow-500/50";
      default:
        return "";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/10">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-white mx-auto mb-4" />
          <p className="text-white">Loading loot box...</p>
        </div>
      </div>
    );
  }

  if (error && !lootBox) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/10">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h3 className="text-xl font-semibold text-white mb-2">
            Error loading loot box
          </h3>
          <p className="text-[#999] mb-4">{error}</p>
          <Button
            onClick={loadLootBoxDetails}
            className="bg-[#333] hover:bg-[#444] text-white border-0"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (showResult && revealedSkin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/10">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Congratulations!
            </h1>
            <p className="text-muted-foreground">You unboxed a rare skin!</p>
          </div>

          <Card
            className={`bg-card border-2 ${getRarityColor(
              revealedSkin.rarity
            )} ${getRarityGlow(revealedSkin.rarity)} shadow-2xl animate-glow`}
          >
            <CardContent className="p-8">
              <div className="text-8xl mb-6 animate-float">🔫</div>
              <Badge className={`mb-4 ${getRarityColor(revealedSkin.rarity)}`}>
                {revealedSkin.rarity}
              </Badge>
              <h2 className="text-3xl font-bold text-foreground mb-2">
                {revealedSkin.weapon} | {revealedSkin.skinName}
              </h2>
              <p className="text-muted-foreground mb-4">
                {revealedSkin.condition}
              </p>
              <div className="text-4xl font-bold text-accent mb-8">
                $
                {typeof revealedSkin.basePriceUsd === "number"
                  ? revealedSkin.basePriceUsd.toFixed(2)
                  : parseFloat(revealedSkin.basePriceUsd || "0").toFixed(2)}
              </div>

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
              <Button
                variant="ghost"
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Marketplace
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!lootBox) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/10">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <div className="mb-8">
          <Link href="/marketplace">
            <Button
              variant="ghost"
              className="text-muted-foreground hover:text-foreground mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Marketplace
            </Button>
          </Link>
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Open {lootBox.name}
          </h1>
          <p className="text-muted-foreground">
            Cost: {formatSOL(parseFloat(lootBox.priceSol))}
          </p>
        </div>

        {!isOpening ? (
          <div className="space-y-8">
            <div className="relative">
              <div className="w-80 h-80 mx-auto bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl animate-float">
                <div className="absolute inset-4 bg-card rounded-2xl border border-accent/30 flex items-center justify-center animate-glow">
                  <Box className="w-20 h-20 mx-auto text-muted-foreground" />
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
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Opening Case...
                </h2>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-accent h-2 rounded-full transition-all ease-out"
                    style={{
                      width:
                        animationPhase === "spinning"
                          ? "30%"
                          : animationPhase === "slowing"
                          ? "95%"
                          : "100%",
                      transitionDuration:
                        animationPhase === "spinning"
                          ? "1s"
                          : animationPhase === "slowing"
                          ? "3s"
                          : "0.5s",
                    }}
                  ></div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {animationPhase === "spinning" && "Randomizing..."}
                  {animationPhase === "slowing" && "Almost there..."}
                  {animationPhase === "revealed" && "Complete!"}
                </p>
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
                  {lootBox.possibleSkins &&
                    [
                      ...lootBox.possibleSkins,
                      ...lootBox.possibleSkins,
                      ...lootBox.possibleSkins,
                    ].map((skin, index) => (
                      <div
                        key={index}
                        className={`flex-shrink-0 w-24 h-full border-r border-border flex flex-col items-center justify-center ${getRarityColor(
                          skin.rarity
                        )}`}
                      >
                        <div className="text-2xl mb-1">🔫</div>
                        <div className="text-xs text-center px-1">
                          <div className="font-semibold">{skin.weapon}</div>
                          <div className="text-xs opacity-75">
                            {skin.skinName}
                          </div>
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
  );
}
