"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Search,
  ExternalLink,
  Package,
  Coins,
  ShoppingBag,
  TrendingUp,
  TrendingDown,
  Loader2,
  Lock,
  BarChart3,
} from "lucide-react";
import { historyService } from "@/lib/services";
import { Transaction } from "@/lib/types/api";
import { useUser } from "@/lib/contexts/UserContext";
import { toast } from "react-hot-toast";
import { formatCurrency, formatSOL } from "@/lib/utils";

export default function HistoryPage() {
  const { isConnected } = useUser();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBy, setFilterBy] = useState("all");
  const [sortBy, setSortBy] = useState("date");
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState({
    totalSpent: 0,
    totalEarned: 0,
    netProfit: 0,
  });

  // Load transactions from backend
  useEffect(() => {
    if (isConnected) {
      loadTransactions();
      loadSummary();
    } else {
      // Not connected - clear data and stop loading
      setLoading(false);
      setTransactions([]);
      setSummary({ totalSpent: 0, totalEarned: 0, netProfit: 0 });
    }
  }, [isConnected]); // Only depend on isConnected

  // Reload when filters change (only if connected)
  useEffect(() => {
    if (isConnected) {
      loadTransactions();
    }
  }, [filterBy, sortBy]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const response = await historyService.getTransactions({
        type: filterBy === "all" ? undefined : (filterBy as any),
        sortBy: sortBy as any,
        limit: 100,
      });

      if (response.success) {
        setTransactions(response.data);
      }
    } catch (err) {
      console.error("Failed to load transactions:", err);
      toast.error("Failed to load transaction history");
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      const response = await historyService.getTransactionSummary();

      if (response.success) {
        const data = response.data;
        setSummary({
          totalSpent: data.totalCost || 0,
          totalEarned: data.totalPayout || 0,
          netProfit: data.netProfit || 0,
        });
      }
    } catch (err) {
      console.error("Failed to load transaction summary:", err);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "case_opening":
        return Package;
      case "buyback":
        return Coins;
      default:
        return ShoppingBag;
    }
  };

  const getTransactionColor = (type: string, amount: number) => {
    if (amount > 0) return "text-green-400";
    if (amount < 0) return "text-red-400";
    return "text-muted-foreground";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/20 text-green-400";
      case "pending":
        return "bg-yellow-500/20 text-yellow-400";
      case "failed":
        return "bg-red-500/20 text-red-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getRarityColor = (rarity?: string) => {
    if (!rarity) return "";
    switch (rarity.toLowerCase()) {
      case "common":
        return "text-gray-400";
      case "uncommon":
        return "text-green-400";
      case "rare":
        return "text-blue-400";
      case "epic":
        return "text-purple-400";
      case "legendary":
        return "text-yellow-400";
      default:
        return "text-muted-foreground";
    }
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      tx.skinName?.toLowerCase().includes(searchLower) ||
      tx.lootBoxName?.toLowerCase().includes(searchLower)
    );
  });

  // Show not connected state
  if (!isConnected) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <Lock className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Wallet Not Connected
            </h3>
            <p className="text-muted-foreground">
              Please connect your wallet to view your transaction history
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-white mx-auto mb-4" />
            <p className="text-white">Loading transaction history...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Transaction History
          </h1>
          <p className="text-muted-foreground text-lg">
            Track all your SolSkins activity
          </p>
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
              <div className="text-2xl font-bold text-red-400">
                {formatCurrency(summary.totalSpent)}
              </div>
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
              <div className="text-2xl font-bold text-green-400">
                {formatCurrency(summary.totalEarned)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground">
                Net Profit/Loss
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div
                className={`text-2xl font-bold ${
                  summary.netProfit >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {summary.netProfit >= 0 ? "+" : ""}
                {formatCurrency(summary.netProfit)}
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
              <SelectItem value="case_opening">Case Openings</SelectItem>
              <SelectItem value="buyback">Buybacks</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Transactions List */}
        <div className="space-y-4">
          {filteredTransactions.map((tx) => {
            const Icon = getTransactionIcon(tx.type);
            const isDebit = tx.type === "case_opening";
            const amount = isDebit
              ? -parseFloat(tx.amountSol)
              : parseFloat(tx.amountUsdc || tx.amountSol);

            return (
              <Card
                key={tx.id}
                className="bg-card border-border hover:border-accent/50 transition-colors"
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                        <Icon className="w-6 h-6 text-accent" />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-foreground">
                            {tx.type === "case_opening" && "Case Opening"}
                            {tx.type === "buyback" && "Instant Buyback"}
                          </h3>
                          <Badge className={getStatusColor(tx.status)}>
                            {tx.status.charAt(0).toUpperCase() +
                              tx.status.slice(1)}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{new Date(tx.timestamp).toLocaleString()}</span>
                          {tx.lootBoxName && <span>• {tx.lootBoxName}</span>}
                        </div>

                        {tx.skinName && (
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-2xl">🔫</span>
                            <div>
                              <span className="text-foreground font-medium">
                                {tx.skinName}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div
                        className={`text-xl font-bold ${getTransactionColor(
                          tx.type,
                          amount
                        )}`}
                      >
                        {amount > 0 ? "+" : ""}
                        {formatCurrency(Math.abs(amount))}
                      </div>
                      {tx.txHash && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-accent hover:text-accent/80 p-0 h-auto"
                          onClick={() =>
                            window.open(
                              `https://explorer.solana.com/tx/${tx.txHash}`,
                              "_blank"
                            )
                          }
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          View on Explorer
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredTransactions.length === 0 && (
          <div className="text-center py-12">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              No transactions found
            </h3>
            <p className="text-muted-foreground">
              {searchTerm || filterBy !== "all"
                ? "Try adjusting your search or filters"
                : "Start opening loot boxes to see your transaction history"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
