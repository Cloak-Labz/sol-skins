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
import { authService } from "@/lib/services";
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
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import type { User as UserType } from "@/lib/types/api";
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

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || "",
        email: user.email || "",
      });
    }
  }, [user]);

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
            <div className="text-6xl mb-4">🔒</div>
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/">
            <Button
              variant="ghost"
              className="text-muted-foreground hover:text-foreground mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Profile Settings
          </h1>
          <p className="text-muted-foreground text-lg">
            Manage your account information
          </p>
        </div>

        <div className="grid gap-6">
          {/* Profile Information Card */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Update your account details and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
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
                    className="bg-input border-border"
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
                    className="bg-input border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wallet">Wallet Address</Label>
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-muted-foreground" />
                    <Input
                      id="wallet"
                      value={currentUser.walletAddress}
                      disabled
                      className="bg-muted border-border font-mono text-sm"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your wallet address cannot be changed
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                {!isEditing ? (
                  <Button
                    onClick={() => setIsEditing(true)}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    Edit Profile
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCancel}
                      disabled={isSaving}
                      className="border-border"
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Account Stats Card */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Account Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Spent</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(totalSpentNum)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Earned</p>
                  <p className="text-2xl font-bold text-green-400">
                    {formatCurrency(totalEarnedNum)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Package className="w-3 h-3" />
                    Cases Opened
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {currentUser.casesOpened || 0}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Member Since
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {new Date(currentUser.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Net Profit/Loss
                  </span>
                  <span
                    className={`text-xl font-bold ${
                      totalEarnedNum - totalSpentNum >= 0
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {totalEarnedNum - totalSpentNum >= 0 ? "+" : ""}
                    {formatCurrency(totalEarnedNum - totalSpentNum)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Link href="/inventory">
                <Button variant="outline" className="border-border">
                  View Inventory
                </Button>
              </Link>
              <Link href="/history">
                <Button variant="outline" className="border-border">
                  Transaction History
                </Button>
              </Link>
              <Link href="/leaderboard">
                <Button variant="outline" className="border-border">
                  Leaderboard
                </Button>
              </Link>
              <Link href="/marketplace">
                <Button variant="outline" className="border-border">
                  Browse Cases
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
