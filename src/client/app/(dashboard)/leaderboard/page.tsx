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
import {
  Loader2,
  TrendingUp,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { apiClient } from "@/lib/services/api.service";

export default function LeaderboardPage() {
  const { user, isConnected } = useUser();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<UserRank | null>(null);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<
    "inventory-value" | "cases-opened"
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
          loadUserRank();
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
      const data = await socialService.getLeaderboard({
        metric,
        period,
        limit: 50,
      });

      setLeaderboard(data);
    } catch (error) {
      toast.error("Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  };

  const loadUserRank = async () => {
    try {
      const data = await socialService.getUserRank(metric);
      setUserRank(data);
    } catch (error) {
      // silently ignore user rank errors to avoid noise
    }
  };

  const getMetricLabel = (metric: string) => {
    switch (metric) {
      case "inventory-value":
        return "Inventory Value";
      case "cases-opened":
        return "Claw Pulled";
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
        return "bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-500";
      case 2:
        return "bg-gradient-to-br from-blue-400 via-blue-500 to-purple-500";
      case 3:
        return "bg-gradient-to-br from-pink-400 via-pink-500 to-purple-500";
      default:
        return "bg-gradient-to-br from-cyan-500 to-blue-600";
    }
  };

  const getPodiumBorderColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "border-yellow-400";
      case 2:
        return "border-blue-400";
      case 3:
        return "border-pink-400";
      default:
        return "border-cyan-400";
    }
  };

  const getAvatarBorderColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "ring-2 ring-yellow-400";
      case 2:
        return "ring-2 ring-blue-400";
      case 3:
        return "ring-2 ring-pink-400";
      default:
        return "ring-1 ring-gray-600";
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
      <div className="min-h-screen bg-[#0a0a0a] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Skeleton */}
          <div className="mb-6">
            <div className="h-10 bg-zinc-800 rounded w-48 animate-pulse mb-2" />
            <div className="h-5 bg-zinc-800 rounded w-64 animate-pulse" />
          </div>

          {/* Podium Skeleton */}
          <div className="flex justify-center items-end gap-2 mb-6">
            {[2, 1, 3].map((i, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <div className="w-12 h-12 bg-zinc-800 rounded-full mb-2 animate-pulse" />
                <div className="h-4 bg-zinc-800 rounded w-24 mb-1 animate-pulse" />
                <div className="h-6 bg-zinc-800 rounded w-16 mb-1 animate-pulse" />
                <div className="h-3 bg-zinc-800 rounded w-12 mb-2 animate-pulse" />
                <div className={`${i === 1 ? 'h-20 w-24' : 'h-14 w-20'} bg-zinc-800 rounded-lg animate-pulse`} />
              </div>
            ))}
          </div>

          {/* Tabs & Filters Skeleton */}
          <div className="flex gap-4 mb-6">
            <div className="h-10 bg-zinc-800 rounded w-32 animate-pulse" />
            <div className="h-10 bg-zinc-800 rounded w-48 animate-pulse" />
          </div>

          {/* User Rank Card Skeleton */}
          <div className="rounded-xl border border-zinc-800 bg-gradient-to-b from-zinc-950 to-zinc-900 p-6 mb-6 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-zinc-800 rounded-lg" />
                <div className="space-y-2">
                  <div className="h-5 bg-zinc-800 rounded w-24" />
                  <div className="h-4 bg-zinc-800 rounded w-32" />
                </div>
              </div>
              <div className="text-right space-y-2">
                <div className="h-6 bg-zinc-800 rounded w-20" />
                <div className="h-4 bg-zinc-800 rounded w-24" />
              </div>
            </div>
          </div>

          {/* Leaderboard Table Skeleton */}
          <div className="rounded-xl border border-zinc-800 bg-gradient-to-b from-zinc-950 to-zinc-900 overflow-hidden">
            {/* Header */}
            <div className="grid p-4 border-b border-zinc-800 bg-zinc-900" style={{gridTemplateColumns: '40px 1fr 1fr 1fr 1fr 1fr', columnGap: '24px'}}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-4 bg-zinc-800 rounded animate-pulse" />
              ))}
            </div>
            {/* Rows */}
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="grid p-4 border-b border-zinc-800" style={{gridTemplateColumns: '40px 1fr 1fr 1fr 1fr 1fr', columnGap: '24px'}}>
                <div className="h-4 bg-zinc-800 rounded w-8 animate-pulse" />
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-zinc-800 rounded-full animate-pulse" />
                  <div className="h-4 bg-zinc-800 rounded w-24 animate-pulse" />
                </div>
                {[1, 2, 3, 4, 5].map((j) => (
                  <div key={j} className="h-4 bg-zinc-800 rounded w-20 animate-pulse" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h1 className="text-4xl font-bold text-foreground mb-2">Leaderboard</h1>
            <p className="text-muted-foreground">Top collectors and their achievements</p>
          </div>

      {/* Podium */}
      {podium.length > 0 && (
        <div className="flex justify-center items-end gap-2 sm:gap-4 mb-6 px-2">
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
              const height = isFirst ? "h-16 sm:h-20" : "h-12 sm:h-14";
              const avatarSize = isFirst ? "size-10 sm:size-14" : "size-8 sm:size-12";
              const delayMs = p.rank === 2 ? 0 : p.rank === 1 ? 90 : 180;
              return (
                <div
                  key={p.user.id}
                  className={`flex flex-col items-center ${orderClass} transition-all duration-500 ease-out flex-1 max-w-[33%] ${
                    mounted
                      ? "opacity-100 translate-y-0 scale-100"
                      : "opacity-0 translate-y-2 scale-95"
                  }`}
                  style={{ transitionDelay: `${delayMs}ms` }}
                >
                  <Avatar
                    className={`${avatarSize} mb-1 sm:mb-2 ${getAvatarBorderColor(p.rank)}`}
                  >
                    <AvatarImage
                      alt={getDisplayName(p)}
                      src={`https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(
                        getDisplayName(p)
                      )}`}
                    />
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs">
                      {`#${p.rank}`}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-white font-semibold text-[10px] sm:text-xs truncate max-w-full text-center px-1">
                    {getDisplayName(p)}
                  </p>
                  <p className="text-white font-bold text-sm sm:text-base">
                    {getPoints(p).toLocaleString()}
                  </p>
                  <p className="text-[#666] text-[10px] sm:text-[11px] mb-1">points</p>
                  <div
                    className={`${getPodiumColor(
                      p.rank
                    )} border-2 ${getPodiumBorderColor(
                      p.rank
                    )} ${height} w-full rounded-lg origin-bottom transition-transform duration-500 ease-out ${
                      mounted ? "scale-y-100" : "scale-y-0"
                    } shadow-2xl ${
                      p.rank === 1
                        ? "shadow-yellow-500/50"
                        : p.rank === 2
                        ? "shadow-blue-500/50"
                        : "shadow-pink-500/50"
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
        <TabsList>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="all-time">All Time</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <Select value={metric} onValueChange={(value: any) => setMetric(value)}>
          <SelectTrigger className="w-48 bg-zinc-950 border-zinc-800 text-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-950 border border-zinc-800">
            <SelectItem value="inventory-value">Inventory Value</SelectItem>
            <SelectItem value="cases-opened">Claw Pulled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* User Rank Card */}
      {userRank && (
        <Card className="bg-gradient-to-b from-zinc-950 to-zinc-900 border border-zinc-800 rounded-xl mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-zinc-800 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-zinc-400" />
                </div>
                <div>
                  <h3 className="text-foreground font-bold text-lg">Your Rank</h3>
                  <p className="text-muted-foreground">
                    #{userRank.rank} of {userRank.totalUsers} users
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-foreground font-bold text-xl">
                  {userRank.metric === 'cases-opened' 
                    ? userRank.value 
                    : formatCurrency(userRank.value)}
                </p>
                <p className="text-muted-foreground text-sm">
                  {getMetricLabel(userRank.metric)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leaderboard Table */}
      <Card className="bg-gradient-to-b from-zinc-950 to-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <CardContent className="p-0">
          {/* Desktop Table - Hidden on mobile */}
          <div className="hidden md:block overflow-x-auto">
            <div className="min-w-[800px]">
              <div className="grid p-4 border-b border-zinc-800 bg-zinc-900" style={{gridTemplateColumns: '40px 1fr 1fr 1fr 1fr 1fr', columnGap: '24px'}}>
                <div className="text-muted-foreground text-sm font-medium">#</div>
                <div className="text-muted-foreground text-sm font-medium">Name</div>
                <div className="text-muted-foreground text-sm font-medium">Inventory Value</div>
                <div className="text-muted-foreground text-sm font-medium">Volume</div>
                <div className="text-muted-foreground text-sm font-medium">Claw Pulls</div>
                <div className="text-muted-foreground text-sm font-medium">Points</div>
              </div>
              <div className="max-h-[600px] overflow-y-auto">
                {leaderboard.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-muted-foreground">No leaderboard data available</p>
                  </div>
                ) : (
                  leaderboard.map((entry) => (
                      <div
                        key={entry.user.id}
                        className={`grid p-4 border-b border-zinc-800 last:border-b-0 transition-all duration-150 hover:bg-zinc-900 ${
                          entry.rank <= 3 ? 'bg-zinc-900/50' : ''
                        }`}
                        style={{gridTemplateColumns: '40px 1fr 1fr 1fr 1fr 1fr', columnGap: '24px'}}
                      >
                        <div className="flex items-center">
                          {getRankIcon(entry.rank)}
                        </div>
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="flex-shrink-0">
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
                          <p className="text-foreground font-medium truncate">
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
                          <p className="text-muted-foreground">{entry.casesOpened}</p>
                        </div>
                        <div className="flex items-center">
                          <p className="text-foreground font-bold">
                            {getPoints(entry).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>

          {/* Mobile List - Shown on mobile only */}
          <div className="md:hidden max-h-[600px] overflow-y-auto">
            {leaderboard.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-muted-foreground">No leaderboard data available</p>
              </div>
            ) : (
              leaderboard.map((entry) => (
                <div
                  key={entry.user.id}
                  className={`p-4 border-b border-zinc-800 last:border-b-0 ${
                    entry.rank <= 3 ? 'bg-zinc-900/50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-bold text-gray-400">#{entry.rank}</span>
                    <Avatar className="w-8 h-8">
                      <AvatarImage
                        alt={getDisplayName(entry)}
                        src={`https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(
                          getDisplayName(entry)
                        )}`}
                      />
                      <AvatarFallback className="bg-zinc-800 text-zinc-300 text-xs">
                        {getDisplayName(entry).slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-foreground font-medium truncate flex-1">
                      {getDisplayName(entry)}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm ml-11">
                    <div>
                      <span className="text-muted-foreground text-xs">Points:</span>
                      <p className="text-foreground font-bold">{getPoints(entry).toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Value:</span>
                      <p className="text-foreground font-bold">{formatCurrency(entry.inventoryValue)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
