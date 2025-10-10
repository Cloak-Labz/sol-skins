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

  // No more polling needed! Results are immediate with off-chain randomization
  // useEffect(() => {
  //   if (caseOpening && caseOpening.status === "pending") {
  //     const interval = setInterval(() => {
  //       checkOpeningStatus();
  //     }, 2000);
  //     return () => clearInterval(interval);
  //   }
  // }, [caseOpening]);

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

      // ═══════════════════════════════════════════════════════════
      //  OFF-CHAIN: Immediate results (no polling!)
      // ═══════════════════════════════════════════════════════════

      const response = await casesService.openCase({
        lootBoxTypeId: lootBox.id,
        paymentMethod: "SOL", // Default to SOL for now
      });

      console.log("🎉 [FRONTEND] Case opened with immediate result:", response.data);

      // Backend returns complete result immediately!
      const skinResult = response.data.skinResult;
      const randomization = response.data.randomization;

      // Store case opening for decision
      const newOpening: CaseOpening = {
        id: response.data.caseOpeningId,
        status: "completed", // Already completed!
        nftMintAddress: response.data.nftMintAddress,
        skinResult: skinResult,
        randomSeed: randomization.seed,
        randomValue: randomization.value,
        randomHash: randomization.hash,
        openedAt: new Date().toISOString(),
      } as any;

      setCaseOpening(newOpening);
      toast.success("Case opened successfully!");

      // Show reveal animation (purely visual, result already determined)
      setTimeout(() => {
        setAnimationPhase("slowing");
      }, 1500);

      setTimeout(() => {
        setRevealedSkin(skinResult);
        setAnimationPhase("revealed");
        setShowResult(true);
        setIsOpening(false);
      }, 3500);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open case");
      setIsOpening(false);
      setAnimationPhase("idle");
      toast.error(err instanceof Error ? err.message : "Failed to open case");
    }
  };

  // simulateResult() removed - backend now returns immediate results!

  const keepSkin = async () => {
    if (!caseOpening) return;

    try {
      toast.loading("Adding skin to inventory...", { id: "decision" });
      const result = await casesService.makeDecision(caseOpening.id, { decision: "keep" });

      console.log("✅ [KEEP] Skin added to inventory:", result);

      toast.success("Skin added to your inventory!", { id: "decision" });

      setTimeout(() => {
        router.push("/app-dashboard/inventory");
      }, 1000);
    } catch (err) {
      toast.error("Failed to keep skin", { id: "decision" });
      console.error("Error keeping skin:", err);
    }
  };

  const sellSkin = async () => {
    if (!caseOpening) return;

    try {
      toast.loading("Executing buyback...", { id: "decision" });
      const result = await casesService.makeDecision(caseOpening.id, { decision: "buyback" });

      console.log("💰 [BUYBACK] Skin sold:", result);

      const buybackPrice = result.data?.buybackPrice || 0;
      toast.success(
        `Skin sold for $${buybackPrice.toFixed(2)} (85% buyback)!`,
        { id: "decision", duration: 4000 }
      );

      setTimeout(() => {
        router.push("/app-dashboard/history");
      }, 1000);
    } catch (err) {
      toast.error("Failed to sell skin", { id: "decision" });
      console.error("Error selling skin:", err);
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
