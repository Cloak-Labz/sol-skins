"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { adminService, type User, type UserSkin, type Pagination } from "@/lib/services/admin.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Shield, ArrowLeft, Loader2, Package, Search, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "react-hot-toast";
import Link from "next/link";

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;
  
  const [user, setUser] = useState<User | null>(null);
  const [skins, setSkins] = useState<UserSkin[]>([]);
  const [loading, setLoading] = useState(true);
  const [skinsLoading, setSkinsLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [filterBy, setFilterBy] = useState<string>("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    if (userId) {
      loadUser();
      loadInventory();
    }
  }, [userId, page, filterBy, search]);

  const loadUser = async () => {
    try {
      setLoading(true);
      const userData = await adminService.getUser(userId);
      setUser(userData);
      setIsAdmin(true);
    } catch (error: any) {
      if (error?.status === 403 || error?.response?.status === 403) {
        setIsAdmin(false);
        toast.error("Access denied: Admin wallet required");
      } else {
        toast.error("Failed to load user");
      }
    } finally {
      setLoading(false);
    }
  };

  const loadInventory = async () => {
    try {
      setSkinsLoading(true);
      const result = await adminService.getUserInventory(userId, {
        page,
        limit: 50,
        filterBy: filterBy as any,
        search: search || undefined,
      });
      console.log('User inventory result:', result);
      setSkins(result?.skins || []);
      setPagination(result?.pagination || {
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0,
      });
    } catch (error) {
      console.error('Error loading inventory:', error);
      toast.error("Failed to load inventory");
      setSkins([]);
      setPagination({
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0,
      });
    } finally {
      setSkinsLoading(false);
    }
  };

  const handleUpdateSkinStatus = async (skinId: string, updates: { isWaitingTransfer?: boolean }) => {
    try {
      await adminService.updateSkinStatus(skinId, updates);
      toast.success("Skin status updated");
      loadInventory();
    } catch (error) {
      toast.error("Failed to update skin status");
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] p-6">
        <Card className="p-8 text-center border-destructive">
          <Shield className="mx-auto h-12 w-12 text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">
            Admin wallet required to access this page.
          </p>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] p-6 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] p-6">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">User not found</h2>
          <Link href="/admin/users">
            <Button variant="outline">Back to Users</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/admin/users">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">
              {user.username || "Anonymous User"}
            </h1>
            <p className="text-muted-foreground font-mono text-sm">
              {user.walletAddress}
            </p>
          </div>
        </div>

        {/* User Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="group bg-gradient-to-b from-zinc-950 to-zinc-900 border border-zinc-800 transition-transform duration-200 hover:scale-[1.015] hover:border-zinc-700">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Spent</p>
              <p className="text-2xl font-bold text-foreground">${Number(user.totalSpent || 0).toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card className="group bg-gradient-to-b from-zinc-950 to-zinc-900 border border-zinc-800 transition-transform duration-200 hover:scale-[1.015] hover:border-zinc-700">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Earned</p>
              <p className="text-2xl font-bold text-foreground">${Number(user.totalEarned || 0).toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card className="group bg-gradient-to-b from-zinc-950 to-zinc-900 border border-zinc-800 transition-transform duration-200 hover:scale-[1.015] hover:border-zinc-700">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Inventory Value</p>
              <p className="text-2xl font-bold text-foreground">${Number(user.inventoryValue || 0).toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card className="group bg-gradient-to-b from-zinc-950 to-zinc-900 border border-zinc-800 transition-transform duration-200 hover:scale-[1.015] hover:border-zinc-700">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Cases Opened</p>
              <p className="text-2xl font-bold text-foreground">{user.casesOpened || 0}</p>
            </CardContent>
          </Card>
        </div>

        {/* Inventory Filters */}
        <Card className="group bg-gradient-to-b from-zinc-950 to-zinc-900 border border-zinc-800 transition-transform duration-200 hover:scale-[1.01] hover:border-zinc-700">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search skins..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={filterBy}
                onChange={(e) => {
                  setFilterBy(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 rounded-md bg-zinc-900 border border-zinc-700 text-white"
              >
                <option value="">All Skins</option>
                <option value="inventory">In Inventory</option>
                <option value="waiting-transfer">Waiting Transfer</option>
                <option value="sold">Sold</option>
                <option value="claimed">Claimed</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Inventory List */}
        <Card className="group bg-gradient-to-b from-zinc-950 to-zinc-900 border border-zinc-800 transition-transform duration-200 hover:scale-[1.01] hover:border-zinc-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Inventory ({pagination.total})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {skinsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : skins.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No skins found
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {skins.map((skin) => (
                  <div
                    key={skin.id}
                    className="p-3 bg-gradient-to-b from-zinc-950 to-zinc-900 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors"
                  >
                    <div className="h-50 bg-zinc-800 rounded-lg mb-2 overflow-hidden flex items-center justify-center">
                      {skin.imageUrl ? (
                        <img
                          src={skin.imageUrl}
                          alt={skin.name || "Skin"}
                          className="w-full h-full object-contain scale-80"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          No Image
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <div>
                        <h3 className="font-medium text-white text-sm line-clamp-1">
                          {skin.name || skin.skinTemplate?.skinName || "Unknown"}
                        </h3>
                        {skin.skinTemplate && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {skin.skinTemplate.weapon} • {skin.skinTemplate.rarity}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-wrap">
                        {skin.isInInventory && (
                          <Badge variant="default" className="text-[10px] px-1.5 py-0">
                            In Inventory
                          </Badge>
                        )}
                        {skin.isWaitingTransfer && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            Waiting Transfer
                          </Badge>
                        )}
                        {skin.soldViaBuyback && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                            Sold
                          </Badge>
                        )}
                      </div>
                        {skin.currentPriceUsd && (
                          <p className="text-xs text-muted-foreground">
                            ${Number(skin.currentPriceUsd).toFixed(2)}
                          </p>
                        )}
                      {skin.isWaitingTransfer && (
                        <Button
                          size="sm"
                          className="w-full text-xs h-7"
                          onClick={() =>
                            handleUpdateSkinStatus(skin.id, {
                              isWaitingTransfer: false,
                            })
                          }
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Mark as Sent
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-muted-foreground">
                  Page {pagination.page} of {pagination.totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={page === pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

