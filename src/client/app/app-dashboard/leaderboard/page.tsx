"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect } from "react";
import { socialService } from "@/lib/services";
import { LeaderboardEntry, UserRank } from "@/lib/types/api";
import { useUser } from "@/lib/contexts/UserContext";
import { formatCurrency } from "@/lib/utils";
import { Loader2, TrendingUp } from "lucide-react";
import { toast } from "react-hot-toast";
import { apiClient } from "@/lib/services/api.service";

export default function LeaderboardPage() {
  const { user, isConnected } = useUser();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<UserRank | null>(null);
  const [loading, setLoading] = useState(true);
  const [useMock, setUseMock] = useState(false);
  const [metric, setMetric] = useState<
    "inventory-value" | "cases-opened" | "profit"
  >("inventory-value");
  const [period, setPeriod] = useState<"all-time" | "monthly" | "weekly">(
    "all-time"
  );
  const [mounted, setMounted] = useState(false);

  // Load leaderboard data whenever metric or period changes
  useEffect(() => {
    loadLeaderboard();
  }, [metric, period, useMock]);

  // Load user rank if connected
  useEffect(() => {
    if (isConnected && user) {
      // Add a small delay to ensure wallet address is set in API client
      const timer = setTimeout(() => {
        if (useMock || apiClient.getWalletAddress()) {
          loadUserRank();
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isConnected, user, metric, useMock]);

  // Trigger entrance animations after mount
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const getMockLeaderboard = (): LeaderboardEntry[] => {
    const usernames = [
      "CryptoKing",
      "SkinHunter",
      "LuckyDraw",
      "ProGamer",
      "DustMaster",
      "BoxOpener",
      "SkinCollector",
      "TopTrader",
      "ElitePlayer",
      "Champion",
      "Winner",
      "Ace",
      "Legend",
      "Master",
      "Expert",
      "Veteran",
      "Pro",
      "Elite",
      "Champion2",
      "Winner2",
      "Ace2",
      "Legend2",
      "Master2",
      "Expert2",
      "Veteran2",
      "Pro2",
      "Elite2",
      "Champion3",
      "Winner3",
      "Ace3",
      "Legend3",
      "Master3",
      "Expert3",
      "Veteran3",
      "Pro3",
      "Elite3",
      "Champion4",
      "Winner4",
      "Ace4",
      "Legend4",
      "Master4",
      "Expert4",
      "Veteran4",
      "Pro4",
      "Elite4",
      "Champion5",
      "Winner5",
      "Ace5",
      "Legend5",
      "Master5",
      "Expert5",
    ];

    const mockEntries: LeaderboardEntry[] = [];

    for (let i = 0; i < 50; i++) {
      const rank = i + 1;
      const baseInventoryValue = 10000 - rank * 150 + Math.random() * 200;
      const casesOpened = Math.floor(50 - rank * 0.5 + Math.random() * 10);
      const totalSpent = baseInventoryValue * 0.6 + Math.random() * 1000;
      const totalEarned = baseInventoryValue * 0.8 + Math.random() * 2000;
      const netProfit = totalEarned - totalSpent;

      mockEntries.push({
        rank,
        user: {
          id: `user-${i}`,
          username: usernames[i] || `Player${i + 1}`,
          walletAddress: `${Math.random()
            .toString(16)
            .substring(2, 10)}...${Math.random().toString(16).substring(2, 6)}`,
        },
        inventoryValue: Math.max(100, baseInventoryValue),
        casesOpened: Math.max(1, casesOpened),
        totalSpent: Math.max(0, totalSpent),
        totalEarned: Math.max(0, totalEarned),
        netProfit: netProfit,
      });
    }

    return mockEntries;
  };

  const getMockUserRank = (): UserRank => {
    return {
      rank: Math.floor(Math.random() * 100) + 1,
      totalUsers: 1000,
      percentile: Math.random() * 100,
      metric: metric,
      value:
        metric === "cases-opened"
          ? Math.floor(Math.random() * 50) + 1
          : Math.random() * 5000 + 100,
    };
  };

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      if (useMock) {
        const mockData = getMockLeaderboard();
        setLeaderboard(mockData);
      } else {
        const data = await socialService.getLeaderboard({
          metric,
          period,
          limit: 50,
        });
        setLeaderboard(data);
      }
    } catch (error) {
      toast.error("Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  };

  const loadUserRank = async () => {
    try {
      if (useMock) {
        const mockRank = getMockUserRank();
        setUserRank(mockRank);
      } else {
        const data = await socialService.getUserRank(metric);
        setUserRank(data);
      }
    } catch (error) {
      // silently ignore user rank errors to avoid noise
    }
  };

  const getMetricLabel = (metric: string) => {
    switch (metric) {
      case "inventory-value":
        return "Inventory Value";
      case "cases-opened":
        return "Cases Opened";
      case "profit":
        return "Net Profit";
      default:
        return "Inventory Value";
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) {
      return <span className="text-sm font-bold text-yellow-400">#{rank}</span>;
    } else if (rank === 2) {
      return <span className="text-sm font-bold text-orange-400">#{rank}</span>;
    } else if (rank === 3) {
      return <span className="text-sm font-bold text-amber-400">#{rank}</span>;
    } else if (rank <= 10) {
      return (
        <span className="text-sm font-bold text-orange-300/70">#{rank}</span>
      );
    }
    return <span className="text-sm font-bold text-gray-400">#{rank}</span>;
  };

  const getPodiumColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-500";
      case 2:
        return "bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600";
      case 3:
        return "bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500";
      default:
        return "bg-gradient-to-br from-yellow-500/30 to-orange-500/30";
    }
  };

  const getPodiumBorderColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "border-yellow-400";
      case 2:
        return "border-orange-400";
      case 3:
        return "border-amber-400";
      default:
        return "border-yellow-500/40";
    }
  };

  const getAvatarBorderColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "ring-2 ring-yellow-400";
      case 2:
        return "ring-2 ring-orange-400";
      case 3:
        return "ring-2 ring-amber-400";
      default:
        return "ring-1 ring-yellow-500/30";
    }
  };

  const getDisplayName = (entry: LeaderboardEntry) =>
    entry.user.username ||
    `${entry.user.walletAddress.slice(0, 4)}...${entry.user.walletAddress.slice(
      -4
    )}`;

  // Derive a large "points" number for design testing (inspired by screenshot)
  const getPoints = (entry: LeaderboardEntry) =>
    Math.max(0, Math.round(entry.inventoryValue * 1000));

  const podium = leaderboard.slice(0, 3);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] p-8 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Leaderboard
          </h1>
          <p className="text-muted-foreground">
            Top collectors and their achievements
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-4xl font-bold  mb-2">
            Leaderboard
          </h1>
          <p className="text-muted-foreground">
            Top collectors and their achievements
          </p>
        </div>

        {/* Podium */}
        {podium.length > 0 && (
          <div className="flex justify-center items-end gap-2 mb-6">
            {podium
              .slice()
              .sort((a, b) => a.rank - b.rank)
              .map((p) => {
                const isFirst = p.rank === 1;
                const orderClass = isFirst
                  ? "order-2"
                  : p.rank === 2
                  ? "order-1"
                  : "order-3";
                const height = isFirst ? "h-20" : "h-14";
                const width = isFirst ? "w-24" : "w-20";
                const avatarSize = isFirst ? "size-14" : "size-12";
                const delayMs = p.rank === 2 ? 0 : p.rank === 1 ? 90 : 180;
                return (
                  <div
                    key={p.user.id}
                    className={`flex flex-col items-center ${orderClass} transition-all duration-500 ease-out ${
                      mounted
                        ? "opacity-100 translate-y-0 scale-100"
                        : "opacity-0 translate-y-2 scale-95"
                    }`}
                    style={{ transitionDelay: `${delayMs}ms` }}
                  >
                    <Avatar
                      className={`${avatarSize} mb-2 ${getAvatarBorderColor(
                        p.rank
                      )}`}
                    >
                      <AvatarImage
                        alt={getDisplayName(p)}
                        src={`https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(
                          getDisplayName(p)
                        )}`}
                      />
                      <AvatarFallback className="bg-gradient-to-br from-yellow-500 to-orange-500 text-white text-xs">
                        {`#${p.rank}`}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-white font-semibold text-xs truncate max-w-[140px] text-center">
                      {getDisplayName(p)}
                    </p>
                    <p className="text-white font-bold text-base">
                      {getPoints(p).toLocaleString()}
                    </p>
                    <p className="text-[#666] text-[11px] mb-1">points</p>
                    <div
                      className={`${getPodiumColor(
                        p.rank
                      )} border-2 ${getPodiumBorderColor(
                        p.rank
                      )} ${height} ${width} rounded-lg origin-bottom transition-transform duration-500 ease-out ${
                        mounted ? "scale-y-100" : "scale-y-0"
                      } shadow-2xl ${
                        p.rank === 1
                          ? "shadow-yellow-500/50"
                          : p.rank === 2
                          ? "shadow-orange-500/50"
                          : "shadow-amber-500/50"
                      }`}
                      style={{ transitionDelay: `${delayMs}ms` }}
                    />
                  </div>
                );
              })}
          </div>
        )}

        {/* Tabs */}
        <Tabs
          value={period}
          onValueChange={(v: any) => setPeriod(v)}
          className="mb-4"
        >
          <TabsList className="bg-zinc-950 border border-orange-500/20">
            <TabsTrigger
              value="weekly"
              className="data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400"
            >
              Weekly
            </TabsTrigger>
            <TabsTrigger
              value="all-time"
              className="data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400"
            >
              All Time
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <Select
            value={metric}
            onValueChange={(value: any) => setMetric(value)}
          >
            <SelectTrigger className="w-48 bg-zinc-950 border-orange-500/30 text-foreground hover:border-orange-500/50 focus:border-orange-500/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-950 border border-orange-500/30">
              <SelectItem
                value="inventory-value"
                className="hover:bg-orange-500/10 focus:bg-orange-500/10"
              >
                Inventory Value
              </SelectItem>
              <SelectItem
                value="cases-opened"
                className="hover:bg-orange-500/10 focus:bg-orange-500/10"
              >
                Cases Opened
              </SelectItem>
              <SelectItem
                value="profit"
                className="hover:bg-orange-500/10 focus:bg-orange-500/10"
              >
                Net Profit
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* User Rank Card */}
        {userRank && (
          <Card className="bg-gradient-to-b from-zinc-950 to-zinc-900 border border-orange-500/30 rounded-xl mb-6 hover:border-orange-500/50 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-orange-500/30 to-yellow-500/20 rounded-lg border border-orange-500/40">
                    <TrendingUp className="w-6 h-6 text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-orange-400 font-bold text-lg">
                      Your Rank
                    </h3>
                    <p className="text-orange-300/70">
                      #{userRank.rank} of {userRank.totalUsers} users
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-yellow-400 font-bold text-xl">
                    {userRank.metric === "cases-opened"
                      ? userRank.value
                      : formatCurrency(userRank.value)}
                  </p>
                  <p className="text-orange-400/60 text-sm">
                    {getMetricLabel(userRank.metric)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Leaderboard Table */}
        <Card className="bg-gradient-to-b from-zinc-950 to-zinc-900 border border-orange-500/20 rounded-xl overflow-hidden">
          <CardContent className="p-0">
            <div
              className="grid p-4 border-b border-orange-500/20 bg-gradient-to-r from-zinc-900 to-orange-950/20"
              style={{
                gridTemplateColumns: "40px 1fr 1fr 1fr 1fr 1fr 1fr",
                columnGap: "24px",
              }}
            >
              <div className="text-orange-400/70 text-sm font-medium">#</div>
              <div className="text-orange-400/70 text-sm font-medium">Name</div>
              <div className="text-orange-400/70 text-sm font-medium">
                Inventory Value
              </div>
              <div className="text-orange-400/70 text-sm font-medium">
                Volume
              </div>
              <div className="text-orange-400/70 text-sm font-medium">
                Claw Pulls
              </div>
              <div className="text-orange-400/70 text-sm font-medium">
                Points
              </div>
              <div className="text-orange-400/70 text-sm font-medium">
                Net Profit
              </div>
            </div>
            {leaderboard.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-muted-foreground">
                  No leaderboard data available
                </p>
              </div>
            ) : (
              leaderboard.map((entry) => {
                const isTopThree = entry.rank <= 3;
                const isTopTen = entry.rank <= 10;
                const borderColor = isTopThree
                  ? entry.rank === 1
                    ? "border-l-2 border-l-yellow-500/40"
                    : entry.rank === 2
                    ? "border-l-2 border-l-orange-500/40"
                    : "border-l-2 border-l-amber-500/40"
                  : isTopTen
                  ? "border-l-2 border-l-orange-500/20"
                  : "";
                const bgColor = isTopThree
                  ? entry.rank === 1
                    ? "bg-gradient-to-r from-yellow-500/5 to-transparent"
                    : entry.rank === 2
                    ? "bg-gradient-to-r from-orange-500/5 to-transparent"
                    : "bg-gradient-to-r from-amber-500/5 to-transparent"
                  : isTopTen
                  ? "bg-gradient-to-r from-orange-500/3 to-transparent"
                  : "";

                return (
                  <div
                    key={entry.user.id}
                    className={`grid p-4 border-b border-orange-500/10 last:border-b-0 transition-all duration-150 hover:bg-orange-500/10 hover:scale-[1.005] ${bgColor} ${borderColor}`}
                    style={{
                      gridTemplateColumns: "40px 1fr 1fr 1fr 1fr 1fr 1fr",
                      columnGap: "24px",
                    }}
                  >
                    <div className="flex items-center">
                      {getRankIcon(entry.rank)}
                    </div>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage
                          alt={getDisplayName(entry)}
                          src={`https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(
                            getDisplayName(entry)
                          )}`}
                        />
                        <AvatarFallback className="bg-zinc-800 text-zinc-300">
                          {getDisplayName(entry).slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-foreground font-medium">
                        {getDisplayName(entry)}
                      </p>
                    </div>
                    <div className="flex items-center">
                      <p className="text-foreground font-bold">
                        {formatCurrency(entry.inventoryValue)}
                      </p>
                    </div>
                    <div className="flex items-center">
                      <p className="text-foreground font-bold">
                        {formatCurrency(
                          typeof entry.totalEarned === "string"
                            ? parseFloat(entry.totalEarned)
                            : entry.totalEarned
                        )}
                      </p>
                    </div>
                    <div className="flex items-center">
                      <p className="text-muted-foreground">
                        {entry.casesOpened}
                      </p>
                    </div>
                    <div className="flex items-center">
                      <p
                        className={`font-bold ${
                          entry.rank <= 3
                            ? "text-yellow-400"
                            : entry.rank <= 10
                            ? "text-orange-300"
                            : "text-foreground"
                        }`}
                      >
                        {getPoints(entry).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center">
                      <Badge
                        variant="secondary"
                        className={`${
                          entry.netProfit >= 0
                            ? "bg-orange-500/20 text-orange-300 border border-orange-500/40"
                            : "bg-zinc-900 text-zinc-300 border border-zinc-800"
                        }`}
                      >
                        {entry.netProfit >= 0 ? "+" : ""}
                        {formatCurrency(entry.netProfit)}
                      </Badge>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
