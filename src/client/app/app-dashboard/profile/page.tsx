"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser } from "@/lib/contexts/UserContext";
import { authService, inventoryService, historyService, casesService, socialService } from "@/lib/services";
import { ActivityItem } from "@/lib/types/api";
import { toast } from "react-hot-toast";
import {
  Loader2,
  User,
  Calendar,
  Package,
  Lock,
  DollarSign,
  Activity,
  BarChart3,
  Clock,
  TrendingDown,
  TrendingUp as TrendingUpIcon,
  AlertCircle,
  Copy,
  CheckCircle,
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
  const { connected: adapterConnected, publicKey, signMessage } = useWallet();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    tradeUrl: "",
  });
  const [memberSince, setMemberSince] = useState<string>('N/A');

  // Error modal state
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [errorDetails, setErrorDetails] = useState("");
  const [copiedError, setCopiedError] = useState(false);

  // Trade URL validation state
  const [tradeUrlValidationError, setTradeUrlValidationError] = useState<string>("");

  // Dashboard data state
  const [inventorySummary, setInventorySummary] = useState<InventorySummary | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<ActivityItem[]>([]);
  const [recentCaseOpenings, setRecentCaseOpenings] = useState<CaseOpening[]>([]);
  const [transactionSummary, setTransactionSummary] = useState<TransactionSummary | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || "",
        email: user.email || "",
        tradeUrl: (user as any).tradeUrl || "",
      });
      // Compute Member Since from user or fetch profile fallback
      const raw = (user as any)?.createdAt || (user as any)?.created_at;
      const setFromDate = (val: any) => {
        const d = val ? new Date(val) : null;
        if (d && !isNaN(d.getTime())) {
          const dd = String(d.getDate()).padStart(2, '0');
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const yyyy = d.getFullYear();
          setMemberSince(`${dd}/${mm}/${yyyy}`);
        } else {
          setMemberSince('N/A');
        }
      };
      if (raw) {
        setFromDate(raw);
      } else {
        authService.getProfile().then((p: any) => setFromDate((p as any)?.createdAt || (p as any)?.created_at)).catch(() => {});
      }
    }
  }, [user]);

  // Load dashboard data when user and wallet are available
  useEffect(() => {
    if (user && walletAddress) {
      loadDashboardData();
    }
  }, [user, walletAddress]);

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
        socialService.getRecentActivity(5),
        casesService.getUserCaseOpenings(),
        historyService.getTransactionSummary()
      ]);

      // Set inventory summary
      if (inventoryData.status === 'fulfilled' && inventoryData.value) {
        const v: any = inventoryData.value as any;
        const rb: any = (v && v.rarityBreakdown) || {};
        
        setInventorySummary({
          totalValue: v.totalValue || 0,
          totalItems: v.totalItems || 0,
          rarityBreakdown: {
            common: rb.common || rb.Common || 0,
            uncommon: rb.uncommon || rb.Uncommon || 0,
            rare: rb.rare || rb.Rare || 0,
            epic: rb.epic || rb.Epic || 0,
            legendary: rb.legendary || rb.Legendary || 0,
          },
        });
      } else {
        // ignore
      }

      // Set recent transactions (now using activity data)
      if (transactionsData.status === 'fulfilled') {
        setRecentTransactions(transactionsData.value || []);
      } else {
        // ignore
      }

      // Set recent case openings
      if (caseOpeningsData.status === 'fulfilled') {
        setRecentCaseOpenings(caseOpeningsData.value.data || []);
      } else {
        // ignore
      }

      // Set transaction summary
      if (transactionSummaryData.status === 'fulfilled') {
        setTransactionSummary(transactionSummaryData.value);
      }

    } catch (error) {
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

  const validateTradeUrl = (url: string): string => {
    if (!url.trim()) {
      return "";
    }

    if (!url.includes("steamcommunity.com/tradeoffer/new")) {
      return "Invalid format - URL must contain 'steamcommunity.com/tradeoffer/new'";
    }

    if (!url.includes("partner=") || !url.includes("token=")) {
      return "Missing required parameters - URL must include 'partner=' and 'token='";
    }

    try {
      const urlObj = new URL(url);
      const partner = urlObj.searchParams.get("partner");
      const token = urlObj.searchParams.get("token");

      if (!partner || !token) {
        return "Invalid parameters - 'partner' and 'token' are required";
      }

      if (!/^\d+$/.test(partner)) {
        return "Invalid partner ID - must be numeric";
      }

      if (token.length < 8) {
        return "Invalid token - must be at least 8 characters";
      }
    } catch {
      return "Invalid URL format";
    }

    return "";
  };

  const handleTradeUrlChange = (newUrl: string) => {
    setFormData({ ...formData, tradeUrl: newUrl });
    setTradeUrlValidationError(validateTradeUrl(newUrl));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      const updates: any = {};
      if (formData.username !== user?.username)
        updates.username = formData.username;
      if (formData.email !== user?.email) updates.email = formData.email;
      if ((formData as any).tradeUrl !== (user as any)?.tradeUrl) {
        // Validate trade URL before saving
        const tradeUrlError = validateTradeUrl((formData as any).tradeUrl);
        if (tradeUrlError) {
          setTradeUrlValidationError(tradeUrlError);
          setIsSaving(false);
          return;
        }
        (updates as any).tradeUrl = (formData as any).tradeUrl;
      }

      if (Object.keys(updates).length === 0) {
        toast.error("No changes to save");
        setIsEditing(false);
        return;
      }

      // Get wallet adapter for signing
      const walletAdapter = signMessage ? { signMessage } : null;
      await authService.updateProfile(updates, walletAdapter as any);
      await refreshUser();

      toast.success("Profile updated successfully!");
      setIsEditing(false);
    } catch (err) {
      // Show error modal with detailed information
      let errorMsg = "Failed to update profile";
      let errorDetail = "";

      if (err instanceof Error) {
        errorMsg = err.message;

        // Extract more detailed error info
        if (err.message.includes("signature")) {
          errorMsg = "Signature verification failed";
          errorDetail = "Your wallet signature could not be verified. Please make sure your wallet is unlocked and try again.";
        } else if (err.message.includes("CSRF")) {
          errorMsg = "Security token expired";
          errorDetail = "Your session token has expired. Please refresh the page and try again.";
        } else if (err.message.includes("Network") || err.message.includes("timeout")) {
          errorMsg = "Network error";
          errorDetail = "Could not connect to the server. Please check your internet connection and try again.";
        } else if (err.message.includes("Unauthorized") || err.message.includes("401")) {
          errorMsg = "Authentication failed";
          errorDetail = "Your session has expired. Please disconnect and reconnect your wallet.";
        } else if (err.message.includes("tradeUrl") || err.message.includes("Trade URL")) {
          errorMsg = "Invalid Steam Trade URL";
          errorDetail = "The Steam Trade URL you provided is not valid. Please check the format and try again.";
        } else if (err.message.includes("username")) {
          errorMsg = "Invalid username";
          errorDetail = "The username you provided is not valid or already taken. Please try a different one.";
        } else if (err.message.includes("email")) {
          errorMsg = "Invalid email";
          errorDetail = "The email address you provided is not valid. Please check the format and try again.";
        } else {
          errorDetail = err.stack ? err.stack.split('\n').slice(0, 2).join('\n') : err.message;
        }
      }

      setErrorMessage(errorMsg);
      setErrorDetails(errorDetail);
      setShowErrorModal(true);

      // Also show toast for immediate feedback
      toast.error("Failed to update profile - see error details");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      username: user?.username || "",
      email: user?.email || "",
      tradeUrl: (user as any)?.tradeUrl || "",
    });
    setTradeUrlValidationError("");
    setIsEditing(false);
  };

  const copyErrorToClipboard = () => {
    const errorText = `Error: ${errorMessage}\nDetails: ${errorDetails}\nTimestamp: ${new Date().toISOString()}`;
    navigator.clipboard.writeText(errorText).then(() => {
      setCopiedError(true);
      toast.success("Error details copied to clipboard");
      setTimeout(() => setCopiedError(false), 2000);
    }).catch(() => {
      toast.error("Failed to copy error details");
    });
  };

  // Show lock only when there's no wallet connection (adapter + context) and no user
  if (!adapterConnected && !isConnected && !user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] py-8">
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
      <div className="min-h-screen bg-[#0a0a0a] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Skeleton */}
          <div className="mb-8">
            <div className="h-10 bg-zinc-800 rounded w-64 animate-pulse mb-2" />
            <div className="h-6 bg-zinc-800 rounded w-96 animate-pulse" />
          </div>

          {/* Dashboard Grid Skeleton */}
          <div className="grid gap-6">
            {/* Top Stats Row Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-xl border border-zinc-800 bg-gradient-to-b from-zinc-950 to-zinc-900 p-6 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="h-4 bg-zinc-800 rounded w-32" />
                      <div className="h-8 bg-zinc-800 rounded w-24" />
                    </div>
                    <div className="w-12 h-12 bg-zinc-800 rounded-md" />
                  </div>
                </div>
              ))}
            </div>

            {/* Main Content Grid Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Profile Skeleton */}
              <div className="lg:col-span-1">
                <div className="rounded-xl border border-zinc-800 bg-gradient-to-b from-zinc-950 to-zinc-900 p-6 animate-pulse">
                  <div className="h-6 bg-zinc-800 rounded w-40 mb-4" />
                  <div className="space-y-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="space-y-2">
                        <div className="h-4 bg-zinc-800 rounded w-24" />
                        <div className="h-10 bg-zinc-800 rounded w-full" />
                      </div>
                    ))}
                    <div className="h-10 bg-zinc-800 rounded w-full mt-4" />
                  </div>
                </div>
              </div>

              {/* Right Column - Statistics Skeleton */}
              <div className="lg:col-span-2 space-y-6">
                {/* Inventory Summary Skeleton */}
                <div className="rounded-xl border border-zinc-800 bg-gradient-to-b from-zinc-950 to-zinc-900 p-6 animate-pulse">
                  <div className="h-6 bg-zinc-800 rounded w-40 mb-4" />
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="text-center space-y-2">
                        <div className="h-8 bg-zinc-800 rounded w-12 mx-auto" />
                        <div className="h-4 bg-zinc-800 rounded w-16 mx-auto" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Activity Skeleton */}
                <div className="rounded-xl border border-zinc-800 bg-gradient-to-b from-zinc-950 to-zinc-900 p-6 animate-pulse">
                  <div className="h-6 bg-zinc-800 rounded w-32 mb-4" />
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-zinc-800 bg-gradient-to-b from-zinc-950 to-zinc-900">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-zinc-800 rounded-md" />
                          <div className="space-y-2">
                            <div className="h-4 bg-zinc-800 rounded w-32" />
                            <div className="h-3 bg-zinc-800 rounded w-24" />
                          </div>
                        </div>
                        <div className="text-right space-y-2">
                          <div className="h-5 bg-zinc-800 rounded w-20" />
                          <div className="h-3 bg-zinc-800 rounded w-16" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
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
    <div className="min-h-screen bg-[#0a0a0a] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Total Intentory Value */}
            <Card className="group bg-gradient-to-b from-zinc-950 to-zinc-900 border border-zinc-800 transition-transform duration-200 hover:scale-[1.015] hover:border-zinc-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Intentory Value</p>
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

            

            {/* Member Since */}
            <Card className="group bg-gradient-to-b from-zinc-950 to-zinc-900 border border-zinc-800 transition-transform duration-200 hover:scale-[1.015] hover:border-zinc-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Member Since</p>
                    <p className="text-lg font-bold text-foreground">{memberSince}</p>
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
                    <div className="flex items-center justify-between">
                      <Label htmlFor="tradeUrl">Steam Trade Offer URL</Label>
                      <Link
                        href="https://steamcommunity.com/id/me/tradeoffers/privacy#trade_offer_access_url"
                        target="_blank"
                        className="text-xs text-zinc-400 hover:text-zinc-200"
                      >
                        Find Trade URL
                      </Link>
                    </div>
                    <Input
                      id="tradeUrl"
                      value={(formData as any).tradeUrl}
                      onChange={(e) => handleTradeUrlChange(e.target.value)}
                      disabled={!isEditing}
                      placeholder="https://steamcommunity.com/tradeoffer/new/?partner=...&token=..."
                      className={`bg-zinc-950 ${
                        tradeUrlValidationError && isEditing
                          ? "border-red-500 focus-visible:ring-red-500"
                          : "border-zinc-800"
                      }`}
                    />
                    {tradeUrlValidationError && isEditing && (
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                        <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-red-400">{tradeUrlValidationError}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="wallet">Wallet Address</Label>
                    <div className="flex items-center gap-2">
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
                          disabled={isSaving || !!tradeUrlValidationError}
                          className="bg-zinc-100 text-black hover:bg-white flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
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
                          {inventorySummary.rarityBreakdown?.uncommon || 0}
                        </p>
                        <p className="text-sm text-muted-foreground">Uncommon</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-foreground">
                          {inventorySummary.rarityBreakdown?.rare || 0}
                        </p>
                        <p className="text-sm text-muted-foreground">Rare</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-foreground">
                          {inventorySummary.rarityBreakdown?.epic || 0}
                        </p>
                        <p className="text-sm text-muted-foreground">Epic</p>
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
                      {recentTransactions
                        .slice(0, 5)
                        .map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border border-zinc-800 bg-gradient-to-b from-zinc-950 to-zinc-900">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-md bg-zinc-800`}>
                              {item.type === 'case_opened' ? (
                                <Package className="w-4 h-4 text-zinc-400" />
                              ) : item.type === 'payout' ? (
                                <DollarSign className="w-4 h-4 text-zinc-400" />
                              ) : item.type === 'skin_claimed' ? (
                                <Package className="w-4 h-4 text-zinc-400" />
                              ) : (
                                <Activity className="w-4 h-4 text-zinc-400" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">
                                {item.type === 'case_opened' ? 'Case Opened' :
                                 item.type === 'payout' ? 'Skin Sold' :
                                 item.type === 'skin_claimed' ? 'Skin Claimed' :
                                 'Activity'}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {item.skin ? 
                                  (item.skin.skinName.includes(item.skin.weapon) ? 
                                    item.skin.skinName : 
                                    `${item.skin.weapon} | ${item.skin.skinName}`) :
                                  item.lootBox?.name || 'Unknown'
                                }
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold text-foreground`}>
                              {(() => {
                                if (item.type === 'payout') {
                                  return '+' + formatCurrency(item.amount?.usd || 0);
                                } else if (item.type === 'case_opened') {
                                  return '-' + (item.amount?.sol ? `${parseFloat(item.amount.sol.toString()).toFixed(2)} SOL` : '0 SOL');
                                } else if (item.type === 'skin_claimed') {
                                  return '0 SOL'; // Show 0 SOL for skin claims
                                } else {
                                  return '';
                                }
                              })()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(item.timestamp).toLocaleDateString()}
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
            </div>
          </div>
        </div>

        {/* Error Modal */}
        <Dialog open={showErrorModal} onOpenChange={setShowErrorModal}>
          <DialogContent className="bg-gradient-to-b from-zinc-950 to-zinc-900 border-[#E99500]/50 pt-10">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-full bg-[#E99500]/10">
                  <AlertCircle className="w-6 h-6 text-[#E99500]" />
                </div>
                <DialogTitle className="text-xl text-[#E99500]">
                  Profile Update Failed
                </DialogTitle>
              </div>
              <DialogDescription className="text-zinc-400 text-left mt-2">
                We encountered an error while trying to update your profile. Please review the details below:
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-4">
              {/* Error Message */}
              <div className="p-4 rounded-lg bg-[#E99500]/5 border border-[#E99500]/20">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#E99500] mb-1">Error Message:</p>
                    <p className="text-sm text-zinc-300">{errorMessage}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyErrorToClipboard}
                    className="h-8 w-8 p-0 hover:bg-[#E99500]/10"
                    title="Copy error details"
                  >
                    {copiedError ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-zinc-400" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Error Details (if available) */}
              {errorDetails && (
                <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                  <p className="text-sm font-semibold text-zinc-400 mb-1">Technical Details:</p>
                  <p className="text-xs text-zinc-500 font-mono break-all whitespace-pre-wrap">{errorDetails}</p>
                </div>
              )}

              {/* Common Solutions */}
              <div className="p-4 rounded-lg bg-[#E99500]/5 border border-[#E99500]/20">
                <p className="text-sm font-semibold text-[#E99500] mb-2">Common Solutions:</p>
                <ul className="text-sm text-zinc-300 space-y-1.5 list-none">
                  <li className="flex items-start gap-2">
                    <span className="text-[#E99500] mt-0.5">•</span>
                    <span>Make sure your wallet is unlocked and connected</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#E99500] mt-0.5">•</span>
                    <span>Check if your Steam Trade URL is valid (if updating)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#E99500] mt-0.5">•</span>
                    <span>Try refreshing the page and connecting your wallet again</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#E99500] mt-0.5">•</span>
                    <span>If the issue persists, contact support with the error details</span>
                  </li>
                </ul>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                onClick={() => {
                  setShowErrorModal(false);
                  // Keep editing mode so user can try again
                }}
                className="bg-[#E99500] hover:bg-[#ff9500] text-black font-bold w-full"
              >
                Try Again
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
