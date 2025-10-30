"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Box, Coins, CheckCircle, DollarSign, Search, Filter, X } from "lucide-react";
import { socialService } from "@/lib/services";
import { ActivityItem } from "@/lib/types/api";
import { formatCurrency } from "@/lib/utils";
import { toast } from "react-hot-toast";

export default function ActivityPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  useEffect(() => {
    loadActivity();
    // Refresh activity every 30 seconds
    const interval = setInterval(loadActivity, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadActivity = async () => {
    try {
      setLoading(true);
      const activities = await socialService.getRecentActivity(50);
      setActivities(activities);
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
      filtered = filtered.filter(activity => 
        activity.skin?.skinName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.skin?.weapon.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.lootBox?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Type filter
    if (selectedTypes.length > 0) {
      filtered = filtered.filter(activity => selectedTypes.includes(activity.type));
    }

    // Sort by date
    filtered.sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return sortBy === "newest" ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [activities, searchTerm, selectedTypes, sortBy]);

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const handleTypeToggle = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedTypes([]);
    setSortBy("newest");
  };

  if (loading && activities.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-200 mx-auto mb-4" />
            <p className="text-zinc-200">Loading activity feed...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Activity Feed</h1>
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
          <Select value={sortBy} onValueChange={(value: "newest" | "oldest") => setSortBy(value)}>
            <SelectTrigger className="w-full md:w-48 bg-zinc-950 border-zinc-800">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedTypes.length === 0 ? "all" : selectedTypes[0]} onValueChange={(value) => {
            if (value === "all") {
              setSelectedTypes([]);
            } else {
              setSelectedTypes([value]);
            }
          }}>
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
          <CardContent className="p-4">
            {filteredActivities.length > 0 ? (
              filteredActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between p-4 mb-2 last:mb-0 rounded-lg border border-zinc-800 bg-gradient-to-b from-zinc-950 to-zinc-900 transition-transform duration-150 hover:scale-[1.01] hover:border-zinc-700"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-md flex items-center justify-center text-sm bg-zinc-800 text-zinc-400">
                    {activity.type === "case_opened" ? (
                      <Box className="w-4 h-4" />
                    ) : activity.type === "skin_claimed" ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : activity.type === "payout" ? (
                      <DollarSign className="w-4 h-4" />
                    ) : (
                      <Coins className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-foreground">
                      <span className="font-medium">
                        {activity.user.username ||
                          `${activity.user.walletAddress.slice(0, 4)}...${activity.user.walletAddress.slice(-4)}`}
                      </span>
                      <span className="text-muted-foreground mx-2">
                        {activity.type === "case_opened" ? "opened" : 
                         activity.type === "skin_claimed" ? "claimed" :
                         activity.type === "payout" ? "received payout for" : "sold"}
                      </span>
                      <span className="font-medium">
                        {activity.skin
                          ? activity.skin.skinName
                          : activity.lootBox?.name || (activity.type === "payout" ? "sold skin" : "skin")}
                      </span>
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {getTimeAgo(activity.timestamp)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-foreground font-bold">
                    {activity.type === "case_opened" ? 
                      `-${activity.amount?.sol ? parseFloat(activity.amount.sol.toString()).toFixed(2) : '0'} SOL` :
                      activity.type === "payout" ? 
                        `+${formatCurrency(activity.amount?.usd || 0)}` :
                        activity.amount ? 
                          `${parseFloat(activity.amount.sol.toString()).toFixed(2)} SOL` :
                          formatCurrency(parseFloat(activity.skin?.valueUsd || "0"))
                    }
                  </p>
                  <Badge
                    variant="secondary"
                    className="text-xs bg-zinc-900 text-zinc-300 border border-zinc-800"
                  >
                    {activity.type === "case_opened" ? "open" : 
                     activity.type === "skin_claimed" ? "claim" :
                     activity.type === "payout" ? "payout" : "buyback"}
                  </Badge>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center">
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {activities.length === 0 ? 'No recent activity' : 'No activities match your filters'}
              </h3>
              <p className="text-muted-foreground">
                {activities.length === 0 
                  ? 'Be the first to open a case!' 
                  : 'Try adjusting your search or filter criteria'
                }
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
