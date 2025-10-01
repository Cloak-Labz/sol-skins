"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { ArrowRight, Loader2 } from "lucide-react"
import { socialService, leaderboardService } from "@/lib/services"
import { ActivityItem, LeaderboardEntry } from "@/lib/types/api"
import { formatCurrency } from "@/lib/utils"

export default function HomePage() {
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loadingActivity, setLoadingActivity] = useState(true)
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true)

  useEffect(() => {
    loadRecentActivity()
    loadLeaderboard()
  }, [])

  const loadRecentActivity = async () => {
    try {
      setLoadingActivity(true)
      const data = await socialService.getRecentActivity(4) // Get only 4 for home page
      setRecentActivity(data)
    } catch (error) {
      console.error('Failed to load recent activity:', error)
    } finally {
      setLoadingActivity(false)
    }
  }

  const loadLeaderboard = async () => {
    try {
      setLoadingLeaderboard(true)
      const response = await leaderboardService.getLeaderboard({ limit: 5 })
      // The response is either an array or {success: true, data: [...]}
      const data = Array.isArray(response) ? response : response.data
      setLeaderboard(data)
    } catch (error) {
      console.error('Failed to load leaderboard:', error)
    } finally {
      setLoadingLeaderboard(false)
    }
  }

  const getActionText = (type: string) => {
    switch (type) {
      case 'case_opening': return 'opened'
      case 'buyback': return 'sold'
      default: return type
    }
  }

  const getTimeAgo = (timestamp: string) => {
    const now = new Date()
    const then = new Date(timestamp)
    const diffInMinutes = Math.floor((now.getTime() - then.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}d ago`
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-8">
      <section className="mb-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div>
              <h1 className="text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                Introducing
                <br />
                <span className="text-white">CS:GO Skin Drop</span>
              </h1>
              <p className="text-[#999] text-lg leading-relaxed mb-8">
                Open a digital pack to instantly reveal a real skin. Choose to hold, trade, redeem, or sell it back to
                us at 85% value!
              </p>
              <Button size="lg" className="bg-[#333] hover:bg-[#444] text-white border-0 rounded-lg px-8 py-3">
                View Drop
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="aspect-square bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] rounded-2xl border border-[#333] p-8 flex items-center justify-center">
              <div className="text-8xl">📦</div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-white">Recent Pulls</h2>
          <Link href="/packs">
            <Button variant="ghost" className="text-[#999] hover:text-white hover:bg-[#1a1a1a] border-0">
              Open Now
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>

        {loadingActivity ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {recentActivity.slice(0, 4).map((activity, index) => {
              const skinName = activity.skin ? `${activity.skin.weapon} | ${activity.skin.skinName}` : 
                              activity.lootBox ? activity.lootBox.name : 'Unknown'
              const rarity = activity.skin?.rarity || 'Common'
              const value = activity.valueUsd ? parseFloat(activity.valueUsd) : 0
              
              return (
                <Card
                  key={activity.id}
                  className="bg-[#111] border-[#333] hover:border-[#555] transition-all duration-200 rounded-xl overflow-hidden"
                >
                  <CardContent className="p-0">
                    <div className="aspect-square bg-[#1a1a1a] flex items-center justify-center border-b border-[#333]">
                      <div className="text-4xl">🔫</div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-white text-sm mb-1 truncate">{skinName}</h3>
                      <p className="text-[#666] text-xs mb-3">{rarity}</p>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-white text-sm">{formatCurrency(value)}</span>
                        <span className="text-[#666] text-xs">{getTimeAgo(activity.timestamp)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </section>

      <div className="grid lg:grid-cols-2 gap-12 mt-16">
        {/* Leaderboard Section */}
        <section>
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-white">Leaderboard</h2>
            <Link href="/leaderboard">
              <Button variant="ghost" className="text-[#999] hover:text-white hover:bg-[#1a1a1a] border-0">
                View All
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>

          <Card className="bg-[#111] border-[#333] rounded-xl overflow-hidden">
            <CardContent className="p-0">
              {loadingLeaderboard ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-white" />
                </div>
              ) : leaderboard.length > 0 ? (
                leaderboard.map((player, index) => (
                  <div
                    key={player.user?.id || index}
                    className="flex items-center justify-between p-4 border-b border-[#333] last:border-b-0 hover:bg-[#1a1a1a] transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-8 h-8 bg-[#333] rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {player.rank || index + 1}
                      </div>
                      <div>
                        <p className="text-white font-medium">
                          {player.user?.username || player.user?.walletAddress?.slice(0, 8) + '...'}
                        </p>
                        <p className="text-[#666] text-sm">{player.casesOpened} cases opened</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold">
                        {formatCurrency(typeof player.inventoryValue === 'number' 
                          ? player.inventoryValue 
                          : parseFloat(player.inventoryValue || '0'))}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-[#666]">
                  No leaderboard data yet
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Recent Activity Section */}
        <section>
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-white">Recent Activity</h2>
            <Link href="/activity">
              <Button variant="ghost" className="text-[#999] hover:text-white hover:bg-[#1a1a1a] border-0">
                View All
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>

          <Card className="bg-[#111] border-[#333] rounded-xl overflow-hidden">
            <CardContent className="p-0">
              {loadingActivity ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-white" />
                </div>
              ) : recentActivity.length > 0 ? (
                recentActivity.slice(0, 5).map((activity) => {
                  const itemName = activity.skin 
                    ? `${activity.skin.weapon} | ${activity.skin.skinName}`
                    : activity.lootBox?.name || 'Unknown'
                  const value = activity.valueUsd ? parseFloat(activity.valueUsd) : 0
                  
                  return (
                    <div
                      key={activity.id}
                      className="flex items-center justify-between p-4 border-b border-[#333] last:border-b-0 hover:bg-[#1a1a1a] transition-colors"
                    >
                      <div className="flex-1">
                        <p className="text-white text-sm">
                          <span className="font-medium">
                            {activity.user.username || activity.user.walletAddress.slice(0, 8) + '...'}
                          </span>
                          <span className="text-[#666] mx-1">{getActionText(activity.type)}</span>
                          <span className="font-medium truncate">{itemName}</span>
                        </p>
                        <p className="text-[#666] text-xs mt-1">{getTimeAgo(activity.timestamp)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-bold text-sm">{formatCurrency(value)}</p>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="p-8 text-center text-[#666]">
                  No recent activity
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}
