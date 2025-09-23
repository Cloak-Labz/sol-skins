"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Search, ExternalLink, Package, Coins, ShoppingBag, TrendingUp, TrendingDown } from "lucide-react"

interface Transaction {
  id: string
  type: "open_case" | "buyback" | "payout"
  timestamp: string
  amount: number
  currency: "SOL" | "USDC"
  status: "completed" | "pending" | "failed"
  txHash: string
  details: {
    caseName?: string
    skinName?: string
    skinWeapon?: string
    skinRarity?: string
    skinImage?: string
  }
}

export default function HistoryPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterBy, setFilterBy] = useState("all")
  const [sortBy, setSortBy] = useState("date")

  const transactions: Transaction[] = [
    {
      id: "1",
      type: "open_case",
      timestamp: "2024-01-15T14:30:00Z",
      amount: -2.5,
      currency: "SOL",
      status: "completed",
      txHash: "5fHJvEy2CcqzqYw7VtNjRqMfHgXrz5UrGSREKWUDgzq8Pw3x6BtaRJqHFfVtaRcGgXrz5UrGSRE",
      details: {
        caseName: "Weapon Case",
        skinName: "Redline",
        skinWeapon: "AK-47",
        skinRarity: "Rare",
        skinImage: "🔫",
      },
    },
    {
      id: "2",
      type: "buyback",
      timestamp: "2024-01-14T16:45:00Z",
      amount: 106.93,
      currency: "USDC",
      status: "completed",
      txHash: "3dGCvDx9BbqzqYw7VtNjRqMfHgXrz5UrGSREKWUDgzq8Pw3x6BtaRJqHFfVtaRcGgXrz5UrGSRE",
      details: {
        skinName: "Asiimov",
        skinWeapon: "M4A4",
        skinRarity: "Epic",
        skinImage: "⚡",
      },
    },
    {
      id: "3",
      type: "open_case",
      timestamp: "2024-01-12T10:15:00Z",
      amount: -15.0,
      currency: "SOL",
      status: "completed",
      txHash: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsUPw3x6BtaRJqHFfVtaRcGgXrz5UrGSRE",
      details: {
        caseName: "Knife Case",
        skinName: "Fade",
        skinWeapon: "Karambit",
        skinRarity: "Legendary",
        skinImage: "🗡️",
      },
    },
    {
      id: "4",
      type: "payout",
      timestamp: "2024-01-10T09:20:00Z",
      amount: 2082.5,
      currency: "USDC",
      status: "completed",
      txHash: "9yQNfKWUDgzq8Pw3x6BtaRJqHFfVtaRcGgXrz5UrGSREKWUDgzq8Pw3x6BtaRJqHFfVtaRcGg",
      details: {
        skinName: "Dragon Lore",
        skinWeapon: "AWP",
        skinRarity: "Legendary",
        skinImage: "🐉",
      },
    },
    {
      id: "5",
      type: "open_case",
      timestamp: "2024-01-08T20:30:00Z",
      amount: -5.0,
      currency: "SOL",
      status: "completed",
      txHash: "8kMNtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsUPw3x6BtaRJqHFfVtaRcGgXrz5UrGSRE",
      details: {
        caseName: "Operation Case",
        skinName: "Blue Steel",
        skinWeapon: "Glock-18",
        skinRarity: "Common",
        skinImage: "🔵",
      },
    },
    {
      id: "6",
      type: "open_case",
      timestamp: "2024-01-05T11:45:00Z",
      amount: -1.2,
      currency: "SOL",
      status: "pending",
      txHash: "4bFGtE1BaqzqYw7VtNjRqMfHgXrz5UrGSREKWUDgzq8Pw3x6BtaRJqHFfVtaRcGgXrz5UrGSRE",
      details: {
        caseName: "Sticker Capsule",
      },
    },
  ]

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "open_case":
        return Package
      case "buyback":
        return Coins
      case "payout":
        return TrendingUp
      default:
        return ShoppingBag
    }
  }

  const getTransactionColor = (type: string, amount: number) => {
    if (amount > 0) return "text-green-400"
    if (amount < 0) return "text-red-400"
    return "text-muted-foreground"
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/20 text-green-400"
      case "pending":
        return "bg-yellow-500/20 text-yellow-400"
      case "failed":
        return "bg-red-500/20 text-red-400"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getRarityColor = (rarity?: string) => {
    if (!rarity) return ""
    switch (rarity.toLowerCase()) {
      case "common":
        return "text-gray-400"
      case "uncommon":
        return "text-green-400"
      case "rare":
        return "text-blue-400"
      case "epic":
        return "text-purple-400"
      case "legendary":
        return "text-yellow-400"
      default:
        return "text-muted-foreground"
    }
  }

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch =
      tx.details.skinName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.details.skinWeapon?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.details.caseName?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterBy === "all" || tx.type === filterBy
    return matchesSearch && matchesFilter
  })

  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    switch (sortBy) {
      case "amount-high":
        return Math.abs(b.amount) - Math.abs(a.amount)
      case "amount-low":
        return Math.abs(a.amount) - Math.abs(b.amount)
      case "date":
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      default:
        return 0
    }
  })

  const totalSpent = transactions
    .filter((tx) => tx.amount < 0 && tx.status === "completed")
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0)

  const totalEarned = transactions
    .filter((tx) => tx.amount > 0 && tx.status === "completed")
    .reduce((sum, tx) => sum + tx.amount, 0)

  const netProfit = totalEarned - totalSpent

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Transaction History</h1>
          <p className="text-muted-foreground text-lg">Track all your SolSkins activity</p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <TrendingDown className="w-4 h-4" />
                Total Spent
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold text-red-400">${totalSpent.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Total Earned
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold text-green-400">${totalEarned.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground">Net Profit/Loss</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className={`text-2xl font-bold ${netProfit >= 0 ? "text-green-400" : "text-red-400"}`}>
                {netProfit >= 0 ? "+" : ""}${netProfit.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-input border-border"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full md:w-48 bg-input border-border">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Most Recent</SelectItem>
              <SelectItem value="amount-high">Amount: High to Low</SelectItem>
              <SelectItem value="amount-low">Amount: Low to High</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterBy} onValueChange={setFilterBy}>
            <SelectTrigger className="w-full md:w-48 bg-input border-border">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Transactions</SelectItem>
              <SelectItem value="open_case">Case Openings</SelectItem>
              <SelectItem value="buyback">Buybacks</SelectItem>
              <SelectItem value="payout">Payouts</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Transactions List */}
        <div className="space-y-4">
          {sortedTransactions.map((tx) => {
            const Icon = getTransactionIcon(tx.type)
            return (
              <Card key={tx.id} className="bg-card border-border hover:border-accent/50 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                        <Icon className="w-6 h-6 text-accent" />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-foreground">
                            {tx.type === "open_case" && "Case Opening"}
                            {tx.type === "buyback" && "Instant Buyback"}
                            {tx.type === "payout" && "Payout"}
                          </h3>
                          <Badge className={getStatusColor(tx.status)}>
                            {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{new Date(tx.timestamp).toLocaleString()}</span>
                          {tx.details.caseName && <span>• {tx.details.caseName}</span>}
                        </div>

                        {tx.details.skinName && (
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-2xl">{tx.details.skinImage}</span>
                            <div>
                              <span className="text-foreground font-medium">
                                {tx.details.skinWeapon} | {tx.details.skinName}
                              </span>
                              {tx.details.skinRarity && (
                                <span className={`ml-2 text-sm ${getRarityColor(tx.details.skinRarity)}`}>
                                  {tx.details.skinRarity}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`text-xl font-bold ${getTransactionColor(tx.type, tx.amount)}`}>
                        {tx.amount > 0 ? "+" : ""}${Math.abs(tx.amount).toFixed(2)} {tx.currency}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-accent hover:text-accent/80 p-0 h-auto"
                        onClick={() => window.open(`https://explorer.solana.com/tx/${tx.txHash}`, "_blank")}
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        View on Explorer
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {sortedTransactions.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No transactions found</h3>
            <p className="text-muted-foreground">
              {searchTerm || filterBy !== "all"
                ? "Try adjusting your search or filters"
                : "Start opening loot boxes to see your transaction history"}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
