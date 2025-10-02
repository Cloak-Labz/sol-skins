"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Box, Coins, Sparkles } from "lucide-react";
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
      <div className="min-h-screen bg-[#0a0a0a] p-8 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-white mx-auto mb-4" />
          <p className="text-white">Loading activity feed...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-4">Activity Feed</h1>
        <p className="text-[#999] text-lg">
          Real-time activity from the SolSkins community
        </p>
      </div>

      <Card className="bg-[#111] border-[#333] rounded-xl overflow-hidden">
        <CardContent className="p-0">
          {activities.length > 0 ? (
            activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between p-6 border-b border-[#333] last:border-b-0 hover:bg-[#1a1a1a] transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm ${
                      activity.type === "case_opened"
                        ? "bg-blue-500/20 text-blue-400"
                        : "bg-green-500/20 text-green-400"
                    }`}
                  >
                    {activity.type === "case_opened" ? (
                      <Box className="w-4 h-4" />
                    ) : (
                      <Coins className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-white">
                      <span className="font-medium">
                        {activity.user.username ||
                          `${activity.user.walletAddress.slice(
                            0,
                            4
                          )}...${activity.user.walletAddress.slice(-4)}`}
                      </span>
                      <span className="text-[#666] mx-2">
                        {activity.type === "case_opened" ? "opened" : "sold"}
                      </span>
                      <span className="font-medium">
                        {activity.skin
                          ? `${activity.skin.weapon} | ${activity.skin.skinName}`
                          : activity.lootBox?.name}
                      </span>
                    </p>
                    <p className="text-[#666] text-sm">
                      {getTimeAgo(activity.timestamp)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-bold">
                    {formatCurrency(parseFloat(activity.skin?.valueUsd || "0"))}
                  </p>
                  <Badge
                    variant="secondary"
                    className={`text-xs ${
                      activity.type === "case_opened"
                        ? "bg-blue-500/20 text-blue-400"
                        : "bg-green-500/20 text-green-400"
                    } border-0`}
                  >
                    {activity.type === "case_opened" ? "open" : "buyback"}
                  </Badge>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center">
              <Sparkles className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold text-white mb-2">
                No recent activity
              </h3>
              <p className="text-[#999]">Be the first to open a case!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
