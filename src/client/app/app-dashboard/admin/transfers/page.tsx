"use client";

import { useEffect, useState } from "react";
import { adminService, type UserSkin, type Pagination } from "@/lib/services/admin.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Package, Loader2, CheckCircle2, User } from "lucide-react";
import { toast } from "react-hot-toast";
import Link from "next/link";

export default function TransfersPage() {
  const [skins, setSkins] = useState<UserSkin[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    loadSkins();
  }, [page]);

  const loadSkins = async () => {
    try {
      setLoading(true);
      const result = await adminService.getSkinsWaitingTransfer({
        page,
        limit: 50,
      });
      console.log('Skins waiting transfer result:', result);
      setSkins(result?.skins || []);
      setPagination(result?.pagination || {
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0,
      });
      setIsAdmin(true);
    } catch (error: any) {
      console.error('Error loading skins:', error);
      if (error?.status === 403 || error?.response?.status === 403) {
        setIsAdmin(false);
        toast.error("Access denied: Admin wallet required");
      } else {
        toast.error("Failed to load skins");
      }
      setSkins([]);
      setPagination({
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsSent = async (skinId: string) => {
    try {
      await adminService.updateSkinStatus(skinId, {
        isWaitingTransfer: false,
      });
      toast.success("Skin marked as sent");
      loadSkins();
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

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-white">Skins Waiting Transfer</h1>
            <p className="text-muted-foreground">
              Manage skins waiting to be sent to Steam
            </p>
          </div>
        </div>

        {/* Stats */}
        <Card className="group bg-gradient-to-b from-zinc-950 to-zinc-900 border border-zinc-800 transition-transform duration-200 hover:border-zinc-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Waiting</p>
                <p className="text-2xl font-bold text-foreground">{pagination.total}</p>
              </div>
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        {/* Skins List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <Card className="group bg-gradient-to-b from-zinc-950 to-zinc-900 border border-zinc-800 transition-transform duration-200 hover:border-zinc-700">
            <CardHeader>
              <CardTitle>Skins ({skins.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {skins.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No skins waiting for transfer
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
                        {skin.user && (
                          <div className="flex items-center gap-1.5 text-xs">
                            <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-white truncate">
                                {skin.user.username || "Anonymous"}
                              </p>
                              <p className="text-muted-foreground font-mono text-[10px] truncate">
                                {skin.user.walletAddress.slice(0, 8)}...
                              </p>
                              {skin.user.tradeUrl && (
                                <a
                                  href={skin.user.tradeUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-primary hover:underline truncate block"
                                >
                                  View Trade URL
                                </a>
                              )}
                            </div>
                          </div>
                        )}
                        {skin.currentPriceUsd && (
                          <p className="text-xs text-muted-foreground">
                            ${Number(skin.currentPriceUsd).toFixed(2)}
                          </p>
                        )}
                        <Button
                          size="sm"
                          className="w-full text-xs h-7"
                          onClick={() => handleMarkAsSent(skin.id)}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Mark as Sent
                        </Button>
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
        )}
      </div>
    </div>
  );
}

