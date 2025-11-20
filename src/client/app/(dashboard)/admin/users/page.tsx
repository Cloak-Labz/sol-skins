"use client";

import { useEffect, useState } from "react";
import { adminService, type User, type Pagination } from "@/lib/services/admin.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Users, Search, Loader2, Eye, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [sortBy, setSortBy] = useState<"createdAt" | "totalSpent" | "totalEarned" | "casesOpened">("createdAt");
  const [order, setOrder] = useState<"ASC" | "DESC">("DESC");

  useEffect(() => {
    loadUsers();
  }, [page, sortBy, order]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const result = await adminService.getUsers({
        page,
        limit: 50,
        sortBy,
        order,
      });
      console.log('Users result:', result);
      setUsers(result?.users || []);
      setPagination(result?.pagination || {
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0,
      });
      setIsAdmin(true);
    } catch (error: any) {
      console.error('Error loading users:', error);
      if (error?.status === 403 || error?.response?.status === 403) {
        setIsAdmin(false);
        toast.error("Access denied: Admin wallet required");
      } else {
        toast.error("Failed to load users");
      }
      setUsers([]);
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

  const filteredUsers = users.filter((user) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      user.walletAddress?.toLowerCase().includes(searchLower) ||
      user.username?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower)
    );
  });

  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] bg-[#0a0a0a] px-4 sm:px-6 lg:px-8 py-10">
        <div className="max-w-7xl mx-auto flex justify-center">
          <Card className="w-full max-w-md bg-gradient-to-b from-black to-[#0b0b0b] border border-red-500/20 text-center p-6 sm:p-8">
            <div className="flex flex-col items-center gap-4">
              <Shield className="h-12 w-12 text-red-500" />
              <h2 className="text-2xl font-semibold text-white">Access Denied</h2>
              <p className="text-sm text-white/70 max-w-sm">
                This user management area is restricted to admin wallets. Switch to an authorized wallet to continue.
              </p>
              <p className="text-xs text-white/50">
                If this is unexpected, contact the Dust3 team to request access.
              </p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-white">User Management</h1>
              <p className="text-muted-foreground">
                View and manage all users in the system
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="group bg-gradient-to-b from-zinc-950 to-zinc-900 border border-zinc-800 transition-transform duration-200 hover:border-zinc-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold text-foreground">{pagination.total}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search by wallet, username, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-zinc-950 border-zinc-800"
            />
          </div>
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-full md:w-48 bg-zinc-950 border-zinc-800">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt">Created At</SelectItem>
              <SelectItem value="totalSpent">Total Spent</SelectItem>
              <SelectItem value="totalEarned">Total Earned</SelectItem>
              <SelectItem value="casesOpened">Cases Opened</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => setOrder(order === "ASC" ? "DESC" : "ASC")}
            className="bg-zinc-950 border-zinc-800"
          >
            {order === "ASC" ? "↑" : "↓"}
          </Button>
        </div>

        {/* Users List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <Card className="group bg-gradient-to-b from-zinc-950 to-zinc-900 border border-zinc-800 transition-transform duration-200 hover:border-zinc-700">
            <CardHeader>
              <CardTitle>Users ({filteredUsers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 sm:space-y-4 max-h-[600px] overflow-y-auto">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No users found
                  </div>
                ) : (
                  filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 sm:p-5 bg-gradient-to-b from-zinc-950 to-zinc-900 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <h3 className="font-semibold text-white text-base">
                                {user.username || "Anonymous"}
                              </h3>
                              {user.isActive ? (
                                <Badge variant="default" className="text-xs">
                                  Active
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">
                                  Inactive
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground font-mono truncate">
                              {user.walletAddress}
                            </p>
                            {user.email && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {user.email}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 sm:flex sm:items-center gap-3 sm:gap-4 text-xs sm:text-sm">
                          <div>
                            <span className="text-muted-foreground block sm:inline">Spent: </span>
                            <span className="font-medium">${Number(user.totalSpent || 0).toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block sm:inline">Earned: </span>
                            <span className="font-medium">${Number(user.totalEarned || 0).toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block sm:inline">Cases: </span>
                            <span className="font-medium">{user.casesOpened || 0}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block sm:inline">Inventory: </span>
                            <span className="font-medium">${Number(user.inventoryValue || 0).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:flex-shrink-0">
                        <Link href={`/admin/users/${user.id}`} className="flex-1 sm:flex-initial">
                          <Button variant="outline" size="sm" className="w-full sm:w-auto">
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>

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
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                      disabled={page === pagination.totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
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

