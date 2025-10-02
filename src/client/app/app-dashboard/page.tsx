"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { ArrowRight, Loader2, DollarSign, Package, Backpack, Target } from "lucide-react";
import { socialService, leaderboardService } from "@/lib/services";
import { ActivityItem, LeaderboardEntry } from "@/lib/types/api";
import { formatCurrency } from "@/lib/utils";
import { motion } from "framer-motion";

export default function DashboardPage() {
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);

  useEffect(() => {
    loadRecentActivity();
    loadLeaderboard();
  }, []);

  const loadRecentActivity = async () => {
    try {
      setLoadingActivity(true);
      const data = await socialService.getRecentActivity(4);
      setRecentActivity(data);
    } catch (error) {
      console.error("Failed to load recent activity:", error);
    } finally {
      setLoadingActivity(false);
    }
  };

  const loadLeaderboard = async () => {
    try {
      setLoadingLeaderboard(true);
      const response = await leaderboardService.getLeaderboard({ limit: 5 });
      const data = Array.isArray(response) ? response : response.data;
      setLeaderboard(data);
    } catch (error) {
      console.error("Failed to load leaderboard:", error);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  const getActionText = (type: string) => {
    switch (type) {
      case "case_opening":
        return "opened";
      case "buyback":
        return "sold";
      default:
        return type;
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffInMinutes = Math.floor(
      (now.getTime() - then.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  return (
    <div className="min-h-screen bg-black p-8">
      <section className="mb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-gray-400">Welcome to Dust3</p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6 mb-12">
          <Card className="bg-[#111] border-[#333] hover:border-[#E99500] transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Total Value</p>
                  <p className="text-3xl font-bold text-white">$0.00</p>
                </div>
                <div className="w-12 h-12 bg-[#E99500]/10 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-[#E99500]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#111] border-[#333] hover:border-[#E99500] transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Cases Opened</p>
                  <p className="text-3xl font-bold text-white">0</p>
                </div>
                <div className="w-12 h-12 bg-[#E99500]/10 rounded-lg flex items-center justify-center">
                  <Package className="w-6 h-6 text-[#E99500]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#111] border-[#333] hover:border-[#E99500] transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Inventory Items</p>
                  <p className="text-3xl font-bold text-white">0</p>
                </div>
                <div className="w-12 h-12 bg-[#E99500]/10 rounded-lg flex items-center justify-center">
                  <Backpack className="w-6 h-6 text-[#E99500]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section>
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-white">Recent Pulls</h2>
          <Link href="/app-dashboard/packs">
            <Button
              className="bg-[#E99500] hover:bg-[#c77f00] text-black font-bold"
            >
              Open Now
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>

        {loadingActivity ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#E99500]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {recentActivity.slice(0, 4).map((activity, index) => {
              const skinName = activity.skin
                ? `${activity.skin.weapon} | ${activity.skin.skinName}`
                : activity.lootBox
                ? activity.lootBox.name
                : "Unknown";
              const rarity = activity.skin?.rarity || "Common";
              const value = activity.valueUsd
                ? parseFloat(activity.valueUsd)
                : 0;

              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                >
                  <Card className="bg-[#111] border-[#333] hover:border-[#E99500] transition-all duration-200 rounded-xl overflow-hidden">
                    <CardContent className="p-0">
                      <div className="aspect-square bg-gradient-to-br from-[#E99500]/10 to-[#0a0a0a] flex items-center justify-center border-b border-[#333]">
                        <Target className="w-12 h-12 text-[#E99500]" />
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-white text-sm mb-1 truncate">
                          {skinName}
                        </h3>
                        <p className="text-gray-500 text-xs mb-3">{rarity}</p>
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-[#E99500] text-sm">
                            {formatCurrency(value)}
                          </span>
                          <span className="text-gray-500 text-xs">
                            {getTimeAgo(activity.timestamp)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid lg:grid-cols-2 gap-12 mt-16">
        {/* Leaderboard Section */}
        <section>
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-white">Leaderboard</h2>
            <Link href="/app-dashboard/leaderboard">
              <Button
                variant="ghost"
                className="text-gray-400 hover:text-[#E99500] hover:bg-[#E99500]/10 border-0"
              >
                View All
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>

          <Card className="bg-[#111] border-[#333] rounded-xl overflow-hidden">
            <CardContent className="p-0">
              {loadingLeaderboard ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-[#E99500]" />
                </div>
              ) : leaderboard.length > 0 ? (
                leaderboard.map((player, index) => (
                  <motion.div
                    key={player.user?.id || index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-4 border-b border-[#333] last:border-b-0 hover:bg-[#E99500]/5 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#E99500] to-[#c77f00] rounded-full flex items-center justify-center text-black text-sm font-bold">
                        {player.rank || index + 1}
                      </div>
                      <div>
                        <p className="text-white font-medium">
                          {player.user?.username ||
                            player.user?.walletAddress?.slice(0, 8) + "..."}
                        </p>
                        <p className="text-gray-500 text-sm">
                          {player.casesOpened} cases opened
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[#E99500] font-bold">
                        {formatCurrency(
                          typeof player.inventoryValue === "number"
                            ? player.inventoryValue
                            : parseFloat(player.inventoryValue || "0")
                        )}
                      </p>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  No leaderboard data yet
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Recent Activity Section */}
        <section>
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-white">Live Activity</h2>
            <Link href="/app-dashboard/activity">
              <Button
                variant="ghost"
                className="text-gray-400 hover:text-[#E99500] hover:bg-[#E99500]/10 border-0"
              >
                View All
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>

          <Card className="bg-[#111] border-[#333] rounded-xl overflow-hidden">
            <CardContent className="p-0">
              {loadingActivity ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-[#E99500]" />
                </div>
              ) : recentActivity.length > 0 ? (
                recentActivity.slice(0, 5).map((activity, index) => {
                  const itemName = activity.skin
                    ? `${activity.skin.weapon} | ${activity.skin.skinName}`
                    : activity.lootBox?.name || "Unknown";
                  const value = activity.valueUsd
                    ? parseFloat(activity.valueUsd)
                    : 0;

                  return (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-4 border-b border-[#333] last:border-b-0 hover:bg-[#E99500]/5 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="text-white text-sm">
                          <span className="font-medium">
                            {activity.user.username ||
                              activity.user.walletAddress.slice(0, 8) + "..."}
                          </span>
                          <span className="text-gray-500 mx-1">
                            {getActionText(activity.type)}
                          </span>
                          <span className="font-medium truncate">
                            {itemName}
                          </span>
                        </p>
                        <p className="text-gray-500 text-xs mt-1">
                          {getTimeAgo(activity.timestamp)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[#E99500] font-bold text-sm">
                          {formatCurrency(value)}
                        </p>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-gray-500">
                  No recent activity
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
