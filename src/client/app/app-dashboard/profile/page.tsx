"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser } from "@/lib/contexts/UserContext";
import { authService, inventoryService, historyService, casesService } from "@/lib/services";
import { toast } from "react-hot-toast";
import {
  ArrowLeft,
  Loader2,
  User,
  Mail,
  Wallet,
  Calendar,
  TrendingUp,
  Package,
  Lock,
  DollarSign,
  Trophy,
  Activity,
  BarChart3,
  Clock,
  Eye,
  Star,
  Zap,
  Target,
  Award,
  TrendingDown,
  TrendingUp as TrendingUpIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import type { User as UserType, Transaction, InventorySummary, CaseOpening, TransactionSummary } from "@/lib/types/api";
import { useWallet } from "@solana/wallet-adapter-react";

export default function ProfilePage() {
  const router = useRouter();
  const {
    user,
    isConnected,
    walletAddress,
    isLoading,
    refreshUser,
    connectWallet,
  } = useUser();
  const { connected: adapterConnected, publicKey } = useWallet();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
  });

  // Dashboard data state
  const [inventorySummary, setInventorySummary] = useState<InventorySummary | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [recentCaseOpenings, setRecentCaseOpenings] = useState<CaseOpening[]>([]);
  const [transactionSummary, setTransactionSummary] = useState<TransactionSummary | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || "",
        email: user.email || "",
      });
    }
  }, [user]);

  // Load dashboard data when user is available
  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setIsLoadingData(true);
      
      // Load all dashboard data in parallel
      const [
        inventoryData,
        transactionsData,
        caseOpeningsData,
        transactionSummaryData
      ] = await Promise.allSettled([
        inventoryService.getInventoryValue(),
        historyService.getTransactions({ limit: 5, sortBy: 'date' }),
        casesService.getUserCaseOpenings(),
        historyService.getTransactionSummary()
      ]);

      // Set inventory summary
      if (inventoryData.status === 'fulfilled' && inventoryData.value) {
        setInventorySummary(inventoryData.value);
      }

      // Set recent transactions
      if (transactionsData.status === 'fulfilled') {
        setRecentTransactions(transactionsData.value.transactions || []);
      }

      // Set recent case openings
      if (caseOpeningsData.status === 'fulfilled') {
        setRecentCaseOpenings(caseOpeningsData.value.data || []);
      }

      // Set transaction summary
      if (transactionSummaryData.status === 'fulfilled') {
        setTransactionSummary(transactionSummaryData.value);
      }

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load some dashboard data');
    } finally {
      setIsLoadingData(false);
    }
  };

  // If wallet is connected in adapter but user not loaded yet, fetch profile
  useEffect(() => {
    if (walletAddress && !user) {
      refreshUser().catch(() => {});
    }
  }, [walletAddress, user, refreshUser]);

  const boundKeyRef = useRef<string | null>(null);

  // If adapter is connected but our app context isn't, bind it automatically (once per key)
  useEffect(() => {
    if (adapterConnected && publicKey && !isConnected && !user && !isLoading) {
      const keyStr = publicKey.toString();
      if (boundKeyRef.current === keyStr) return;
      boundKeyRef.current = keyStr;
      connectWallet(keyStr).catch(() => {});
    }
  }, [
    adapterConnected,
    publicKey,
    isConnected,
    user,
    isLoading,
    connectWallet,
  ]);

  const handleSave = async () => {
    try {
      setIsSaving(true);

      const updates: any = {};
      if (formData.username !== user?.username)
        updates.username = formData.username;
      if (formData.email !== user?.email) updates.email = formData.email;

      if (Object.keys(updates).length === 0) {
        toast.error("No changes to save");
        setIsEditing(false);
        return;
      }

      await authService.updateProfile(updates);
      await refreshUser();

      toast.success("Profile updated successfully!");
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to update profile:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to update profile"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      username: user?.username || "",
      email: user?.email || "",
    });
    setIsEditing(false);
  };

  // Show lock only when there's no wallet connection (adapter + context) and no user
  if (!adapterConnected && !isConnected && !user) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <Lock className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Wallet Not Connected
            </h3>
            <p className="text-muted-foreground">
              Please connect your wallet to view your profile
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Loading state when wallet is connected but user profile is still fetching
  if ((adapterConnected || isConnected) && !user) {
    return (
      <div className="min-h-screen py-8 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3" />
          <p>Loading your profile...</p>
        </div>
      </div>
    );
  }

  // With the guards above, we should have a user here
  const currentUser = user as UserType;
  const totalSpentNum =
    typeof currentUser.totalSpent === "string"
      ? parseFloat(currentUser.totalSpent)
      : currentUser.totalSpent || 0;
  const totalEarnedNum =
    typeof currentUser.totalEarned === "string"
      ? parseFloat(currentUser.totalEarned)
      : currentUser.totalEarned || 0;

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/app-dashboard">
            <Button
              variant="ghost"
              className="text-muted-foreground hover:text-foreground mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Profile Dashboard
          </h1>
          <p className="text-muted-foreground text-lg">
            Your complete gaming profile and statistics
          </p>
        </div>

        {/* Dashboard Grid */}
        <div className="grid gap-6">
          {/* Top Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Portfolio Value */}
            <Card className="group bg-gradient-to-b from-zinc-950 to-zinc-900 border border-zinc-800 transition-transform duration-200 hover:scale-[1.015] hover:border-zinc-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Portfolio Value</p>
                    <p className="text-2xl font-bold text-foreground">
                      {isLoadingData ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        formatCurrency(inventorySummary?.totalValue || 0)
                      )}
                    </p>
                  </div>
                  <div className="p-3 rounded-md bg-zinc-800">
                    <DollarSign className="w-6 h-6 text-zinc-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cases Opened */}
            <Card className="group bg-gradient-to-b from-zinc-950 to-zinc-900 border border-zinc-800 transition-transform duration-200 hover:scale-[1.015] hover:border-zinc-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Cases Opened</p>
                    <p className="text-2xl font-bold text-foreground">
                      {currentUser.casesOpened || 0}
                    </p>
                  </div>
                  <div className="p-3 rounded-md bg-zinc-800">
                    <Package className="w-6 h-6 text-zinc-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Net Profit */}
            <Card className="group bg-gradient-to-b from-zinc-950 to-zinc-900 border border-zinc-800 transition-transform duration-200 hover:scale-[1.015] hover:border-zinc-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Net Profit</p>
                    <p className={`text-2xl font-bold text-foreground`}>
                      {totalEarnedNum - totalSpentNum >= 0 ? "+" : ""}
                      {formatCurrency(totalEarnedNum - totalSpentNum)}
                    </p>
                  </div>
                  <div className={`p-3 rounded-md bg-zinc-800`}>
                    {totalEarnedNum - totalSpentNum >= 0 ? (
                      <TrendingUpIcon className="w-6 h-6 text-zinc-400" />
                    ) : (
                      <TrendingDown className="w-6 h-6 text-zinc-400" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Member Since */}
            <Card className="group bg-gradient-to-b from-zinc-950 to-zinc-900 border border-zinc-800 transition-transform duration-200 hover:scale-[1.015] hover:border-zinc-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Member Since</p>
                    <p className="text-lg font-bold text-foreground">
                      {new Date(currentUser.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="p-3 rounded-md bg-zinc-800">
                    <Calendar className="w-6 h-6 text-zinc-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Profile & Settings */}
            <div className="lg:col-span-1 space-y-6">
              {/* Profile Information */}
              <Card className="group bg-gradient-to-b from-zinc-950 to-zinc-900 border border-zinc-800 transition-transform duration-200 hover:scale-[1.01] hover:border-zinc-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Profile Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) =>
                        setFormData({ ...formData, username: e.target.value })
                      }
                      disabled={!isEditing}
                      placeholder="Enter your username"
                      className="bg-zinc-950 border-zinc-800"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email (Optional)</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      disabled={!isEditing}
                      placeholder="your.email@example.com"
                      className="bg-zinc-950 border-zinc-800"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="wallet">Wallet Address</Label>
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-zinc-400" />
                      <Input
                        id="wallet"
                        value={currentUser.walletAddress}
                        disabled
                        className="bg-zinc-950 border-zinc-800 font-mono text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    {!isEditing ? (
                      <Button
                        onClick={() => setIsEditing(true)}
                        className="bg-zinc-100 text-black hover:bg-white w-full"
                      >
                        Edit Profile
                      </Button>
                    ) : (
                      <>
                        <Button
                          onClick={handleSave}
                          disabled={isSaving}
                          className="bg-zinc-100 text-black hover:bg-white flex-1"
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            "Save"
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleCancel}
                          disabled={isSaving}
                          className="border-zinc-800 hover:bg-zinc-900 flex-1"
                        >
                          Cancel
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="group bg-gradient-to-b from-zinc-950 to-zinc-900 border border-zinc-800 transition-transform duration-200 hover:scale-[1.01] hover:border-zinc-700">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link href="/app-dashboard/inventory" className="block">
                    <Button variant="outline" className="w-full justify-start border-zinc-800 hover:bg-zinc-900">
                      <Eye className="w-4 h-4 mr-2 text-zinc-400" />
                      View Inventory
                    </Button>
                  </Link>
                  <Link href="/app-dashboard/history" className="block">
                    <Button variant="outline" className="w-full justify-start border-zinc-800 hover:bg-zinc-900">
                      <Activity className="w-4 h-4 mr-2 text-zinc-400" />
                      Transaction History
                    </Button>
                  </Link>
                  <Link href="/app-dashboard/leaderboard" className="block">
                    <Button variant="outline" className="w-full justify-start border-zinc-800 hover:bg-zinc-900">
                      <Trophy className="w-4 h-4 mr-2 text-zinc-400" />
                      Leaderboard
                    </Button>
                  </Link>
                  <Link href="/app-dashboard/packs" className="block">
                    <Button variant="outline" className="w-full justify-start border-zinc-800 hover:bg-zinc-900">
                      <Package className="w-4 h-4 mr-2 text-zinc-400" />
                      Open Packs
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Statistics & Activity */}
            <div className="lg:col-span-2 space-y-6">
              {/* Inventory Summary */}
              <Card className="group bg-gradient-to-b from-zinc-950 to-zinc-900 border border-zinc-800 transition-transform duration-200 hover:scale-[1.01] hover:border-zinc-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Inventory Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingData ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : inventorySummary ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-foreground">
                          {inventorySummary.totalItems || 0}
                        </p>
                        <p className="text-sm text-muted-foreground">Total Items</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-foreground">
                          {inventorySummary.rarityBreakdown?.common || 0}
                        </p>
                        <p className="text-sm text-muted-foreground">Common</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-foreground">
                          {inventorySummary.rarityBreakdown?.rare || 0}
                        </p>
                        <p className="text-sm text-muted-foreground">Rare</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-foreground">
                          {inventorySummary.rarityBreakdown?.legendary || 0}
                        </p>
                        <p className="text-sm text-muted-foreground">Legendary</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      No inventory data available
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Recent Transactions */}
              <Card className="group bg-gradient-to-b from-zinc-950 to-zinc-900 border border-zinc-800 transition-transform duration-200 hover:scale-[1.01] hover:border-zinc-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingData ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : recentTransactions.length > 0 ? (
                    <div className="space-y-3">
                      {recentTransactions.slice(0, 5).map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between p-3 rounded-lg border border-zinc-800 bg-gradient-to-b from-zinc-950 to-zinc-900">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-md bg-zinc-800`}>
                              {transaction.type === 'open_case' ? (
                                <Package className="w-4 h-4 text-zinc-400" />
                              ) : transaction.type === 'buyback' ? (
                                <DollarSign className="w-4 h-4 text-zinc-400" />
                              ) : (
                                <Activity className="w-4 h-4 text-zinc-400" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">
                                {transaction.type === 'open_case' ? 'Case Opened' :
                                 transaction.type === 'buyback' ? 'Skin Sold' :
                                 'Transaction'}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {transaction.resultSkin ? 
                                  `${transaction.resultSkin.weapon} ${transaction.resultSkin.skinName}` :
                                  transaction.lootBoxType?.name || 'Unknown'
                                }
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold text-foreground`}>
                              {transaction.type === 'buyback' ? '+' : '-'}
                              {formatCurrency(transaction.amountUsd)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(transaction.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      No recent activity
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Performance Overview */}
              <Card className="group bg-gradient-to-b from-zinc-950 to-zinc-900 border border-zinc-800 transition-transform duration-200 hover:scale-[1.01] hover:border-zinc-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Performance Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 rounded-lg border border-zinc-800 bg-gradient-to-b from-zinc-950 to-zinc-900">
                      <p className="text-2xl font-bold text-foreground">
                        {formatCurrency(totalSpentNum)}
                      </p>
                      <p className="text-sm text-muted-foreground">Total Spent</p>
                    </div>
                    <div className="text-center p-4 rounded-lg border border-zinc-800 bg-gradient-to-b from-zinc-950 to-zinc-900">
                      <p className="text-2xl font-bold text-foreground">
                        {formatCurrency(totalEarnedNum)}
                      </p>
                      <p className="text-sm text-muted-foreground">Total Earned</p>
                    </div>
                    <div className="text-center p-4 rounded-lg border border-zinc-800 bg-gradient-to-b from-zinc-950 to-zinc-900">
                      <p className={`text-2xl font-bold text-foreground`}>
                        {totalEarnedNum - totalSpentNum >= 0 ? '+' : ''}
                        {formatCurrency(totalEarnedNum - totalSpentNum)}
                      </p>
                      <p className="text-sm text-muted-foreground">Net Profit</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
