"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useEffect } from "react"
import { leaderboardService } from "@/lib/services"
import { LeaderboardEntry, UserRank } from "@/lib/types/api"
import { useUser } from "@/lib/contexts/UserContext"
import { formatCurrency, formatSOL } from "@/lib/utils"
import { Loader2, Trophy, TrendingUp, Users } from "lucide-react"
import { toast } from "react-hot-toast"
import { apiClient } from "@/lib/services/api"

export default function LeaderboardPage() {
  const { user, isConnected } = useUser()
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [userRank, setUserRank] = useState<UserRank | null>(null)
  const [loading, setLoading] = useState(true)
  const [metric, setMetric] = useState<'inventory-value' | 'cases-opened' | 'profit'>('inventory-value')
  const [period, setPeriod] = useState<'all-time' | 'monthly' | 'weekly'>('all-time')

  // Load leaderboard data whenever metric or period changes
  useEffect(() => {
    loadLeaderboard()
  }, [metric, period])

  // Load user rank if connected
  useEffect(() => {
    if (isConnected && user) {
      // Add a small delay to ensure wallet address is set in API client
      const timer = setTimeout(() => {
        if (apiClient.getWalletAddress()) {
          console.log('Loading user rank - wallet connected and user loaded')
          loadUserRank()
        } else {
          console.log('Wallet connected but API client wallet address not set yet')
        }
      }, 100)
      
      return () => clearTimeout(timer)
    }
  }, [isConnected, user, metric])

  const loadLeaderboard = async () => {
    try {
      setLoading(true)
      console.log('Loading leaderboard with filters:', { metric, period })
      const data = await leaderboardService.getLeaderboard({
        metric,
        period,
        limit: 50
      })
      
      console.log('Leaderboard data:', data)
      
      // Handle both unwrapped array and wrapped response
      const leaderboardData = Array.isArray(data) ? data : data.data
      console.log('Setting leaderboard data:', leaderboardData)
      setLeaderboard(leaderboardData)
    } catch (error) {
      console.error('Error loading leaderboard:', error)
      toast.error('Failed to load leaderboard')
    } finally {
      setLoading(false)
    }
  }

  const loadUserRank = async () => {
    try {
      console.log('Loading user rank with metric:', metric)
      const data = await leaderboardService.getUserRank(metric)
      console.log('User rank data:', data)
      setUserRank(data)
    } catch (error) {
      console.error('Error loading user rank:', error)
    }
  }

  const getMetricLabel = (metric: string) => {
    switch (metric) {
      case 'inventory-value': return 'Inventory Value'
      case 'cases-opened': return 'Cases Opened'
      case 'profit': return 'Net Profit'
      default: return 'Inventory Value'
    }
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />
    if (rank === 2) return <Trophy className="w-5 h-5 text-gray-400" />
    if (rank === 3) return <Trophy className="w-5 h-5 text-amber-600" />
    return <span className="text-sm font-bold text-gray-400">#{rank}</span>
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] p-8 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-white mx-auto mb-4" />
          <p className="text-white">Loading leaderboard...</p>
        </div>
      </div>
    )
  }

  console.log('Rendering leaderboard with data:', leaderboard)
  console.log('Leaderboard length:', leaderboard.length)

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-4">Leaderboard</h1>
        <p className="text-[#999] text-lg">Top collectors and their achievements</p>
      </div>

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

        <Select value={period} onValueChange={(value: any) => setPeriod(value)}>
          <SelectTrigger className="w-48 bg-[#111] border-[#333] text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#111] border-[#333]">
            <SelectItem value="all-time">All Time</SelectItem>
            <SelectItem value="monthly">This Month</SelectItem>
            <SelectItem value="weekly">This Week</SelectItem>
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
                  {formatCurrency(userRank.value)}
                </p>
                <p className="text-gray-400 text-sm">
                  {getMetricLabel(userRank.metric)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leaderboard */}
      <Card className="bg-[#111] border-[#333] rounded-xl overflow-hidden">
        <CardContent className="p-0">
          <div className="grid grid-cols-6 gap-4 p-4 border-b border-[#333] bg-[#1a1a1a]">
            <div className="text-[#666] text-sm font-medium">Rank</div>
            <div className="text-[#666] text-sm font-medium">User</div>
            <div className="text-[#666] text-sm font-medium">Inventory Value</div>
            <div className="text-[#666] text-sm font-medium">Cases Opened</div>
            <div className="text-[#666] text-sm font-medium">Total Spent</div>
            <div className="text-[#666] text-sm font-medium">Net Profit</div>
          </div>
          {leaderboard.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-400">No leaderboard data available</p>
            </div>
          ) : (
            leaderboard.map((entry, index) => (
            <div
              key={entry.user.id}
              className="grid grid-cols-6 gap-4 p-4 border-b border-[#333] last:border-b-0 hover:bg-[#1a1a1a] transition-colors"
            >
              <div className="flex items-center">
                <div className="flex items-center gap-2">
                  {getRankIcon(entry.rank)}
                </div>
              </div>
              <div className="flex items-center">
                <p className="text-white font-medium">
                  {entry.user.username || `${entry.user.walletAddress.slice(0, 4)}...${entry.user.walletAddress.slice(-4)}`}
                </p>
              </div>
              <div className="flex items-center">
                <p className="text-white font-bold">
                  {formatCurrency(entry.inventoryValue)}
                </p>
              </div>
              <div className="flex items-center">
                <p className="text-[#999]">{entry.casesOpened}</p>
              </div>
              <div className="flex items-center">
                <p className="text-red-400 font-bold">
                  -{formatCurrency(typeof entry.totalSpent === 'string' ? parseFloat(entry.totalSpent) : entry.totalSpent)}
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
                  {entry.netProfit >= 0 ? '+' : ''}{formatCurrency(entry.netProfit)}
                </Badge>
              </div>
            </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

