"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Box,
  Coins,
  CheckCircle,
  DollarSign,
  Search,
  Filter,
  X,
} from "lucide-react";
import { socialService } from "@/lib/services";
import { ActivityItem } from "@/lib/types/api";
import { formatCurrency } from "@/lib/utils";
import { toast } from "react-hot-toast";

export default function ActivityPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [useMock, setUseMock] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  useEffect(() => {
    loadActivity();
    // Refresh activity every 30 seconds
    const interval = setInterval(loadActivity, 30000);
    return () => clearInterval(interval);
  }, [useMock]);

  const getMockActivities = (): ActivityItem[] => {
    const now = Date.now();
    const usernames = [
      "Player1",
      "CryptoKing",
      "SkinHunter",
      "LuckyDraw",
      "ProGamer",
      "DustMaster",
      "BoxOpener",
      "SkinCollector",
    ];
    const weapons = [
      "AK-47",
      "AWP",
      "M4A4",
      "Desert Eagle",
      "Glock-18",
      "USP-S",
      "P250",
      "Five-SeveN",
    ];
    const skinNames = [
      "Redline",
      "Asiimov",
      "Dragon Lore",
      "Fire Serpent",
      "Howl",
      "Medusa",
      "Poseidon",
      "Emerald",
    ];
    const rarities = ["Common", "Uncommon", "Rare", "Epic", "Legendary"];
    const conditions = [
      "Factory New",
      "Minimal Wear",
      "Field-Tested",
      "Well-Worn",
      "Battle-Scarred",
    ];
    const lootBoxNames = [
      "Dust3 Promo Pack",
      "Elite Pack",
      "Premium Pack",
      "Starter Pack",
    ];

    const mockActivities: ActivityItem[] = [];

    for (let i = 0; i < 50; i++) {
      const timestamp = new Date(
        now - i * 60000 - Math.random() * 300000
      ).toISOString();
      const username = usernames[Math.floor(Math.random() * usernames.length)];
      const weapon = weapons[Math.floor(Math.random() * weapons.length)];
      const skinName = skinNames[Math.floor(Math.random() * skinNames.length)];
      const rarity = rarities[Math.floor(Math.random() * rarities.length)];
      const condition =
        conditions[Math.floor(Math.random() * conditions.length)];
      const valueUsd = (Math.random() * 500 + 10).toFixed(2);
      const solAmount = (Math.random() * 2 + 0.1).toFixed(4);

      const types: ActivityItem["type"][] = [
        "case_opened",
        "skin_claimed",
        "payout",
      ];
      const type = types[Math.floor(Math.random() * types.length)];

      if (type === "case_opened") {
        mockActivities.push({
          id: `mock-${i}`,
          type: "case_opened",
          user: {
            id: `user-${i}`,
            username,
            walletAddress: `${Math.random()
              .toString(16)
              .substring(2, 10)}...${Math.random()
              .toString(16)
              .substring(2, 6)}`,
          },
          lootBox: {
            id: `box-${i}`,
            name: lootBoxNames[Math.floor(Math.random() * lootBoxNames.length)],
            rarity: rarity,
          },
          amount: {
            sol: parseFloat(solAmount),
            usd: parseFloat(valueUsd) * 0.15,
          },
          timestamp,
        });
      } else if (type === "skin_claimed") {
        mockActivities.push({
          id: `mock-${i}`,
          type: "skin_claimed",
          user: {
            id: `user-${i}`,
            username,
            walletAddress: `${Math.random()
              .toString(16)
              .substring(2, 10)}...${Math.random()
              .toString(16)
              .substring(2, 6)}`,
          },
          skin: {
            id: `skin-${i}`,
            weapon,
            skinName,
            rarity,
            condition,
            valueUsd,
          },
          timestamp,
        });
      } else if (type === "payout") {
        mockActivities.push({
          id: `mock-${i}`,
          type: "payout",
          user: {
            id: `user-${i}`,
            username,
            walletAddress: `${Math.random()
              .toString(16)
              .substring(2, 10)}...${Math.random()
              .toString(16)
              .substring(2, 6)}`,
          },
          skin: {
            id: `skin-${i}`,
            weapon,
            skinName,
            rarity,
            condition,
            valueUsd,
          },
          amount: {
            sol: parseFloat(solAmount),
            usd: parseFloat(valueUsd) * 0.85,
          },
          timestamp,
        });
      }
    }

    return mockActivities.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  };

  const loadActivity = async () => {
    try {
      setLoading(true);
      if (useMock) {
        const mockActivities = getMockActivities();
        setActivities(mockActivities);
      } else {
        const activities = await socialService.getRecentActivity(50);
        setActivities(activities);
      }
    } catch (err) {
      toast.error("Failed to load activity feed");
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort activities
  const filteredActivities = useMemo(() => {
    let filtered = [...activities];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (activity) =>
          activity.skin?.skinName
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          activity.skin?.weapon
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          activity.user.username
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          activity.lootBox?.name
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
      );
    }

    // Type filter
    if (selectedTypes.length > 0) {
      filtered = filtered.filter((activity) =>
        selectedTypes.includes(activity.type)
      );
    }

    // Sort by date
    filtered.sort((a, b) => {
      let dateA = new Date(a.timestamp).getTime();
      let dateB = new Date(b.timestamp).getTime();
      return sortBy === "newest" ?
        dateB - dateA :
        dateA - dateB;
    });

    return filtered;
  }, [activities, searchTerm, selectedTypes, sortBy]);

  // Detect server timezone offset from the most recent activity
  const serverTimeOffset = useMemo(() => {
    if (activities.length === 0) return 0;
    
    // Get the most recent activity (should be first after sorting)
    const mostRecent = activities[0];
    if (!mostRecent?.timestamp) return 0;
    
    const now = Date.now();
    const then = new Date(mostRecent.timestamp).getTime();
    const diff = then - now; // How far in the future the timestamp is
    
    // If the timestamp is in the future, we have a timezone offset
    // Return positive value = how much to subtract from timestamps
    if (diff > 0) {
      return diff;
    }
    
    return 0;
  }, [activities]);

  const getTimeAgo = (timestamp: string) => {
    try {
      const now = Date.now();
      let then = new Date(timestamp).getTime();
      
      // If timestamp is invalid, return error indicator
      if (isNaN(then)) {
        console.error('Invalid timestamp:', timestamp);
        return "Invalid date";
      }
      
      // Correct for server timezone offset
      // If serverTimeOffset is 9000000 (server is 2.5h ahead),
      // subtract it to move the timestamp back to real time
      then = then - serverTimeOffset;
      
      const diffMs = now - then;

      // If still in the future (shouldn't happen), treat as "Just now"
      if (diffMs < 0) {
        return "Just now";
      }

      const seconds = Math.floor(diffMs / 1000);
      const minutes = Math.floor(diffMs / (1000 * 60));
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      // Check from largest to smallest unit
      if (days > 0) return `${days}d ago`;
      if (hours > 0) return `${hours}h ago`;
      if (minutes > 0) return `${minutes}m ago`;
      if (seconds >= 10) return `${seconds}s ago`;
      return "Just now";
    } catch (error) {
      console.error('Error calculating time ago:', error, timestamp);
      return "Unknown";
    }
  };

  const handleTypeToggle = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedTypes([]);
    setSortBy("newest");
  };

  const getActivityStyles = (type: ActivityItem["type"]) => {
    switch (type) {
      case "case_opened":
        return {
          borderColor: "border-yellow-500/20",
          hoverBorderColor: "hover:border-yellow-500/40",
          iconBg: "bg-yellow-500/10",
          iconColor: "text-yellow-400",
          badgeBg: "bg-yellow-500/10",
          badgeText: "text-yellow-300",
          badgeBorder: "border-yellow-500/30",
          leftBorder: "border-l-2 border-l-yellow-500/30",
        };
      case "skin_claimed":
        return {
          borderColor: "border-orange-500/20",
          hoverBorderColor: "hover:border-orange-500/40",
          iconBg: "bg-orange-500/10",
          iconColor: "text-orange-400",
          badgeBg: "bg-orange-500/10",
          badgeText: "text-orange-300",
          badgeBorder: "border-orange-500/30",
          leftBorder: "border-l-2 border-l-orange-500/30",
        };
      case "payout":
        return {
          borderColor: "border-green-500/20",
          hoverBorderColor: "hover:border-green-500/40",
          iconBg: "bg-green-500/10",
          iconColor: "text-green-400",
          badgeBg: "bg-green-500/10",
          badgeText: "text-green-300",
          badgeBorder: "border-green-500/30",
          leftBorder: "border-l-2 border-l-green-500/30",
        };
      default:
        return {
          borderColor: "border-zinc-800",
          hoverBorderColor: "hover:border-zinc-700",
          iconBg: "bg-zinc-800",
          iconColor: "text-zinc-400",
          badgeBg: "bg-zinc-900",
          badgeText: "text-zinc-300",
          badgeBorder: "border-zinc-800",
          leftBorder: "",
        };
    }
  };

  if (loading && activities.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Skeleton */}
          <div className="mb-8">
            <div className="h-10 bg-zinc-800 rounded w-48 animate-pulse mb-2" />
            <div className="h-6 bg-zinc-800 rounded w-64 animate-pulse" />
          </div>

          {/* Filters Skeleton */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="flex-1 h-10 bg-zinc-800 rounded animate-pulse" />
            <div className="w-full md:w-48 h-10 bg-zinc-800 rounded animate-pulse" />
            <div className="w-full md:w-48 h-10 bg-zinc-800 rounded animate-pulse" />
          </div>

          {/* Results Count Skeleton */}
          <div className="h-5 bg-zinc-800 rounded w-48 mb-4 animate-pulse" />

          {/* Activity List Skeleton */}
          <div className="rounded-xl border border-zinc-800 bg-gradient-to-b from-zinc-950 to-zinc-900 overflow-hidden">
            <div className="p-4 space-y-2">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-lg border border-zinc-800 bg-gradient-to-b from-zinc-950 to-zinc-900 animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-zinc-800 rounded-md" />
                    <div className="space-y-2">
                      <div className="h-4 bg-zinc-800 rounded w-64" />
                      <div className="h-3 bg-zinc-800 rounded w-24" />
                    </div>
                  </div>
                  <div className="text-right space-y-2">
                    <div className="h-5 bg-zinc-800 rounded w-20" />
                    <div className="h-4 bg-zinc-800 rounded w-16" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Activity Feed
          </h1>
          <p className="text-muted-foreground text-lg">
            Real-time activity from the Dust3 community
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search by skin name, weapon, or username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-zinc-950 border-zinc-800"
            />
          </div>
          <Select
            value={sortBy}
            onValueChange={(value: "newest" | "oldest") => setSortBy(value)}
          >
            <SelectTrigger className="w-full md:w-48 bg-zinc-950 border-zinc-800">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={selectedTypes.length === 0 ? "all" : selectedTypes[0]}
            onValueChange={(value) => {
              if (value === "all") {
                setSelectedTypes([]);
              } else {
                setSelectedTypes([value]);
              }
            }}
          >
            <SelectTrigger className="w-full md:w-48 bg-zinc-950 border-zinc-800">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="case_opened">Case Opened</SelectItem>
              <SelectItem value="skin_claimed">Skin Claimed</SelectItem>
              <SelectItem value="payout">Payout</SelectItem>
            </SelectContent>
          </Select>
          {(searchTerm || selectedTypes.length > 0 || sortBy !== "newest") && (
            <Button
              variant="outline"
              onClick={clearFilters}
              className="bg-zinc-950 border-zinc-800 hover:bg-zinc-900"
            >
              <X className="w-4 h-4 mr-2" />
              Clear
            </Button>
          )}
        </div>

        {/* Results Count */}
        <div className="text-sm text-muted-foreground mb-4">
          Showing {filteredActivities.length} of {activities.length} activities
        </div>

        {/* Activity List */}
        <Card className="bg-gradient-to-b from-zinc-950 to-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <CardContent className="custom-scrollbar p-3 sm:p-6 space-y-3 sm:space-y-4 max-h-[800px] overflow-y-auto">
            {filteredActivities.length > 0 ? (
              filteredActivities.map((activity) => {
                const styles = getActivityStyles(activity.type);
                return (
                  <div
                    key={activity.id}
                    className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 sm:p-5 rounded-lg border ${styles.borderColor} ${styles.leftBorder} bg-gradient-to-b from-zinc-950 to-zinc-900 transition-all duration-150 hover:scale-[1.005] ${styles.hoverBorderColor} gap-3 sm:gap-4`}
                  >
                    <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
                      <div
                        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-md flex items-center justify-center flex-shrink-0 ${styles.iconBg} ${styles.iconColor}`}
                      >
                        {activity.type === "case_opened" ? (
                          <Box className="w-4 h-4 sm:w-5 sm:h-5" />
                        ) : activity.type === "skin_claimed" ? (
                          <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                        ) : activity.type === "payout" ? (
                          <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
                        ) : (
                          <Coins className="w-4 h-4 sm:w-5 sm:h-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground text-sm sm:text-base mb-1">
                          <span className="font-semibold">
                            {activity.user.username ||
                              `${activity.user.walletAddress.slice(
                                0,
                                4
                              )}...${activity.user.walletAddress.slice(-4)}`}
                          </span>
                          <span className="text-muted-foreground mx-1.5 sm:mx-2">
                            {activity.type === "case_opened"
                              ? "opened"
                              : activity.type === "skin_claimed"
                              ? "claimed"
                              : activity.type === "payout"
                              ? "received payout for"
                              : "sold"}
                          </span>
                          <span className="font-semibold break-words">
                            {activity.skin
                              ? activity.skin.skinName
                              : activity.lootBox?.name ||
                                (activity.type === "payout"
                                  ? "sold skin"
                                  : "skin")}
                          </span>
                        </p>
                        <p className="text-muted-foreground text-xs sm:text-sm">
                          {getTimeAgo(activity.timestamp)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 sm:gap-1.5 sm:text-right flex-shrink-0">
                      <Badge
                        variant="secondary"
                        className={`text-xs sm:order-2 ${styles.badgeBg} ${styles.badgeText} border ${styles.badgeBorder}`}
                      >
                        {activity.type === "case_opened"
                          ? "open"
                          : activity.type === "skin_claimed"
                          ? "claim"
                          : activity.type === "payout"
                          ? "payout"
                          : "buyback"}
                      </Badge>
                      <p className="text-foreground font-bold text-sm sm:text-base sm:order-1">
                        {activity.type === "case_opened"
                          ? `-${
                              activity.amount?.usd
                                ? Math.floor(parseFloat(
                                    activity.amount.usd.toString()
                                  ))
                                : activity.amount?.sol
                                ? Math.floor(parseFloat(
                                    activity.amount.sol.toString()
                                  ))
                                : "0"
                            } USDC`
                          : activity.type === "payout"
                          ? `+${formatCurrency(activity.amount?.usd || 0)}`
                          : activity.amount
                          ? `${Math.floor(parseFloat(
                              (activity.amount.usd || activity.amount.sol || 0).toString()
                            ))} USDC`
                          : formatCurrency(
                              parseFloat(activity.skin?.valueUsd || "0")
                            )}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-12 text-center">
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {activities.length === 0
                    ? "No recent activity"
                    : "No activities match your filters"}
                </h3>
                <p className="text-muted-foreground">
                  {activities.length === 0
                    ? "Be the first to open a case!"
                    : "Try adjusting your search or filter criteria"}
                </p>
                {activities.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={clearFilters}
                    className="mt-4 bg-zinc-800 border-zinc-700 hover:bg-zinc-700"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
