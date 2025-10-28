"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Box, Coins, Sparkles, CheckCircle, DollarSign } from "lucide-react";
import { socialService } from "@/lib/services";
import { ActivityItem } from "@/lib/types/api";
import { formatCurrency } from "@/lib/utils";
import { toast } from "react-hot-toast";

export default function ActivityPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

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
      console.error("Failed to load activity:", err);
      toast.error("Failed to load activity feed");
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
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

      <Card className="bg-gradient-to-b from-zinc-950 to-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <CardContent className="p-4">
          {activities.length > 0 ? (
            activities.map((activity) => (
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
                No recent activity
              </h3>
              <p className="text-muted-foreground">Be the first to open a case!</p>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
