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
import { leaderboardService } from "@/lib/services";
import { LeaderboardEntry, UserRank } from "@/lib/types/api";
import { useUser } from "@/lib/contexts/UserContext";
import { formatCurrency } from "@/lib/utils";
import {
  Loader2,
  TrendingUp,
  Info,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { apiClient } from "@/lib/services/api";

export default function LeaderboardPage() {
  const { user, isConnected } = useUser();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<UserRank | null>(null);
  const [loading, setLoading] = useState(true);
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
  }, [metric, period]);

  // Load user rank if connected
  useEffect(() => {
    if (isConnected && user) {
      // Add a small delay to ensure wallet address is set in API client
      const timer = setTimeout(() => {
        if (apiClient.getWalletAddress()) {
          console.log("Loading user rank - wallet connected and user loaded");
          loadUserRank();
        } else {
          console.log(
            "Wallet connected but API client wallet address not set yet"
          );
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isConnected, user, metric]);

  // Trigger entrance animations after mount
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      console.log("Loading leaderboard with filters:", { metric, period });
      const data = await leaderboardService.getLeaderboard({
        metric,
        period,
        limit: 50,
      });

      console.log("Leaderboard data:", data);

      // Handle both unwrapped array and wrapped response
      const leaderboardData = Array.isArray(data) ? data : data.data;
      console.log("Setting leaderboard data:", leaderboardData);
      setLeaderboard(leaderboardData);
    } catch (error) {
      console.error("Error loading leaderboard:", error);
      toast.error("Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  };

  const loadUserRank = async () => {
    try {
      console.log("Loading user rank with metric:", metric);
      const data = await leaderboardService.getUserRank(metric);
      console.log("User rank data:", data);
      setUserRank(data);
    } catch (error) {
      console.error("Error loading user rank:", error);
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
    return <span className="text-sm font-bold text-gray-400">#{rank}</span>;
  };

  const getPodiumColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-br from-yellow-500 to-orange-500";
      case 2:
        return "bg-gradient-to-br from-gray-400 to-gray-600";
      case 3:
        return "bg-gradient-to-br from-amber-600 to-yellow-600";
      default:
        return "bg-gradient-to-br from-gray-500 to-gray-700";
    }
  };

  const getPodiumBorderColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "border-yellow-400";
      case 2:
        return "border-gray-400";
      case 3:
        return "border-amber-400";
      default:
        return "border-gray-400";
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
          <Loader2 className="w-8 h-8 animate-spin text-white mx-auto mb-4" />
          <p className="text-white">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  console.log("Rendering leaderboard with data:", leaderboard);
  console.log("Leaderboard length:", leaderboard.length);

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-8">
      <div className="mb-6">
        <h1 className="text-4xl font-bold text-white mb-2">Leaderboard</h1>
        <p className="text-[#999]">Top collectors and their achievements</p>
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
                    className={`${avatarSize} mb-2 bg-[#141414] border border-[#333]`}
                  >
                    <AvatarFallback className="bg-gradient-to-br from-[#222] to-[#111] text-[#aaa] text-xs">
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
                    } shadow-xl`}
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
        <TabsList>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="all-time">All Time</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <Select value={metric} onValueChange={(value: any) => setMetric(value)}>
          <SelectTrigger className="w-48 bg-[#111] border-[#333] text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#111] border-[#333]">
            <SelectItem value="inventory-value">Inventory Value</SelectItem>
            <SelectItem value="cases-opened">Cases Opened</SelectItem>
            <SelectItem value="profit">Net Profit</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* User Rank Card */}
      {userRank && (
        <Card className="bg-[#111] border-[#333] rounded-xl mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/20 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">Your Rank</h3>
                  <p className="text-gray-400">
                    #{userRank.rank} of {userRank.totalUsers} users
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white font-bold text-xl">
                  {userRank.metric === 'cases-opened' 
                    ? userRank.value 
                    : formatCurrency(userRank.value)}
                </p>
                <p className="text-gray-400 text-sm">
                  {getMetricLabel(userRank.metric)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leaderboard Table */}
      <Card className="bg-[#111] border-[#333] rounded-xl overflow-hidden">
        <CardContent className="p-0">
          <div className="grid p-4 border-b border-[#333] bg-[#1a1a1a]" style={{gridTemplateColumns: '40px 1fr 1fr 1fr 1fr 1fr 1fr', columnGap: '24px'}}>
            <div className="text-[#666] text-sm font-medium">#</div>
            <div className="text-[#666] text-sm font-medium">Name</div>
            <div className="text-[#666] text-sm font-medium">Inventory Value</div>
            <div className="text-[#666] text-sm font-medium">Volume</div>
            <div className="text-[#666] text-sm font-medium">Claw Pulls</div>
            <div className="text-[#666] text-sm font-medium">Points</div>
            <div className="text-[#666] text-sm font-medium">Net Profit</div>
          </div>
          {leaderboard.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-400">No leaderboard data available</p>
            </div>
          ) : (
            leaderboard.map((entry) => (
                <div
                  key={entry.user.id}
                  className={`grid p-4 border-b border-[#333] last:border-b-0 hover:bg-[#1a1a1a] transition-colors ${
                    entry.rank <= 3 ? 'bg-[#1a1a1a]/50' : ''
                  }`}
                  style={{gridTemplateColumns: '40px 1fr 1fr 1fr 1fr 1fr 1fr', columnGap: '24px'}}
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
                      <AvatarFallback>
                        {getDisplayName(entry).slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-white font-medium">
                      {getDisplayName(entry)}
                    </p>
                  </div>
                  <div className="flex items-center">
                    <p className="text-white font-bold">
                      {formatCurrency(entry.inventoryValue)}
                    </p>
                  </div>
                  <div className="flex items-center">
                    <p className="text-white font-bold">
                      {formatCurrency(
                        typeof entry.totalEarned === "string"
                          ? parseFloat(entry.totalEarned)
                          : entry.totalEarned
                      )}
                    </p>
                  </div>
                  <div className="flex items-center">
                    <p className="text-[#999]">{entry.casesOpened}</p>
                  </div>
                  <div className="flex items-center">
                    <p className="text-white font-bold">
                      {getPoints(entry).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center">
                    <Badge
                      variant="secondary"
                      className={`${
                        entry.netProfit >= 0
                          ? "bg-green-500/20 text-green-400 border-green-500/30"
                          : "bg-red-500/20 text-red-400 border-red-500/30"
                      }`}
                    >
                      {entry.netProfit >= 0 ? "+" : ""}
                      {formatCurrency(entry.netProfit)}
                    </Badge>
                  </div>
                </div>
              ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
