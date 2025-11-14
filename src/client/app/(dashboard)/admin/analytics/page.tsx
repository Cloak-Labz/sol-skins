"use client";

import { useEffect, useState } from "react";
import { adminService, type AnalyticsData, type TimeSeriesData, type BuybackTimeSeriesData } from "@/lib/services/admin.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Loader2, TrendingUp, TrendingDown, Users, DollarSign, Package, ArrowUpRight, ArrowDownRight, CalendarIcon } from "lucide-react";
import { toast } from "react-hot-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [days, setDays] = useState(30);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });

  useEffect(() => {
    loadAnalytics();
  }, [days, dateRange.from, dateRange.to]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const data = await adminService.getAnalytics(
        days,
        dateRange.from ? dateRange.from.toISOString().split('T')[0] : undefined,
        dateRange.to ? dateRange.to.toISOString().split('T')[0] : undefined
      );
      setAnalytics(data);
      setIsAdmin(true);
    } catch (error: any) {
      if (error?.status === 403 || error?.response?.status === 403) {
        setIsAdmin(false);
        toast.error("Access denied: Admin wallet required");
      } else {
        toast.error("Failed to load analytics");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (range) {
      setDateRange({ from: range.from, to: range.to });
      // Clear days filter when date range is selected
      if (range.from || range.to) {
        setDays(0);
      }
    } else {
      setDateRange({ from: undefined, to: undefined });
    }
  };

  const clearDateRange = () => {
    setDateRange({ from: undefined, to: undefined });
    setDays(30);
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

  if (!analytics) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] p-6">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">No data available</h2>
        </Card>
      </div>
    );
  }

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Prepare chart data
  const caseOpeningsData = analytics.timeSeries.caseOpenings.map(item => ({
    date: formatDate(item.date),
    count: item.count,
  }));

  const buybacksData = analytics.timeSeries.buybacks.map(item => ({
    date: formatDate(item.date),
    count: item.count,
    totalAmount: Number(item.totalAmount),
  }));

  const transfersData = analytics.timeSeries.transfers.map(item => ({
    date: formatDate(item.date),
    count: item.count,
  }));

  // Combined chart data
  const combinedData = analytics.timeSeries.caseOpenings.map((item, index) => ({
    date: formatDate(item.date),
    caseOpenings: item.count,
    buybacks: analytics.timeSeries.buybacks[index]?.count || 0,
    transfers: analytics.timeSeries.transfers[index]?.count || 0,
  }));

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-4 sm:p-6 overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-white">Analytics Dashboard</h1>
              <p className="text-muted-foreground">
                Comprehensive analytics and insights
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-[280px] justify-start text-left font-normal bg-zinc-950 border-zinc-800 hover:bg-zinc-900"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} -{" "}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-zinc-950 border-zinc-800" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange.from}
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={handleDateRangeSelect}
                  numberOfMonths={2}
                />
                {(dateRange.from || dateRange.to) && (
                  <div className="p-3 border-t border-zinc-800">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearDateRange}
                      className="w-full text-xs"
                    >
                      Clear date range
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
            <Select 
              value={days.toString()} 
              onValueChange={(value) => {
                setDays(parseInt(value));
                // Clear date range when days filter is selected
                if (parseInt(value) > 0) {
                  setDateRange({ from: undefined, to: undefined });
                }
              }}
            >
              <SelectTrigger className="w-32 bg-zinc-950 border-zinc-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="180">Last 180 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* First Row: Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="group bg-gradient-to-b from-zinc-950 to-zinc-900 border border-zinc-800 transition-transform duration-200 hover:scale-[1.015] hover:border-zinc-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold text-foreground">{analytics.overview.users.total}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Users className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {analytics.overview.users.active30d} active (30d)
                    </span>
                  </div>
                </div>
                <div className="p-3 rounded-md bg-zinc-800">
                  <Users className="w-6 h-6 text-zinc-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group bg-gradient-to-b from-zinc-950 to-zinc-900 border border-zinc-800 transition-transform duration-200 hover:scale-[1.015] hover:border-zinc-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Net Revenue</p>
                  <p className="text-2xl font-bold text-foreground">
                    ${(Number(analytics.overview.revenue.totalUsd) || 0).toFixed(2)}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="h-3 w-3 text-green-400" />
                    <span className="text-xs text-green-400">
                      ${(Number(analytics.overview.revenue.last30dUsd) || 0).toFixed(2)} (30d)
                    </span>
                  </div>
                </div>
                <div className="p-3 rounded-md bg-zinc-800">
                  <DollarSign className="w-6 h-6 text-zinc-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group bg-gradient-to-b from-zinc-950 to-zinc-900 border border-zinc-800 transition-transform duration-200 hover:scale-[1.015] hover:border-zinc-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Gross Revenue</p>
                  <p className="text-2xl font-bold text-foreground">
                    ${(Number(analytics.transactions.grossRevenueUsd) || 0).toFixed(2)}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="h-3 w-3 text-blue-400" />
                    <span className="text-xs text-muted-foreground">
                      Before buybacks
                    </span>
                  </div>
                </div>
                <div className="p-3 rounded-md bg-zinc-800">
                  <TrendingUp className="w-6 h-6 text-zinc-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group bg-gradient-to-b from-zinc-950 to-zinc-900 border border-zinc-800 transition-transform duration-200 hover:scale-[1.015] hover:border-zinc-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Buybacks Sold</p>
                  <p className="text-2xl font-bold text-foreground">{analytics.overview.inventory.buybacksSold}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingDown className="h-3 w-3 text-red-400" />
                    <span className="text-xs text-red-400">
                      ${(Number(analytics.transactions.buybackCostUsd) || 0).toFixed(2)} paid
                    </span>
                  </div>
                </div>
                <div className="p-3 rounded-md bg-zinc-800">
                  <TrendingDown className="w-6 h-6 text-zinc-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Second Row: Activity Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="group bg-gradient-to-b from-zinc-950 to-zinc-900 border border-zinc-800 transition-transform duration-200 hover:scale-[1.015] hover:border-zinc-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Cases Opened</p>
                  <p className="text-2xl font-bold text-foreground">{analytics.overview.cases.totalOpened}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Package className="h-3 w-3 text-green-400" />
                    <span className="text-xs text-green-400">
                      {analytics.caseOpenings.successfulOpenings} successful
                    </span>
                    {analytics.caseOpenings.pendingOpenings > 0 && (
                      <>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-yellow-400">
                          {analytics.caseOpenings.pendingOpenings} pending
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="p-3 rounded-md bg-zinc-800">
                  <Package className="w-6 h-6 text-zinc-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group bg-gradient-to-b from-zinc-950 to-zinc-900 border border-zinc-800 transition-transform duration-200 hover:scale-[1.015] hover:border-zinc-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total NFTs</p>
                  <p className="text-2xl font-bold text-foreground">{analytics.overview.inventory.totalNfts}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs text-muted-foreground">
                      ${(Number(analytics.overview.inventory.totalValueUsd) || 0).toFixed(2)} value
                    </span>
                  </div>
                </div>
                <div className="p-3 rounded-md bg-zinc-800">
                  <Package className="w-6 h-6 text-zinc-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group bg-gradient-to-b from-zinc-950 to-zinc-900 border border-zinc-800 transition-transform duration-200 hover:scale-[1.015] hover:border-zinc-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Transactions</p>
                  <p className="text-2xl font-bold text-foreground">{analytics.transactions.transactionCount}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs text-muted-foreground">
                      All confirmed
                    </span>
                  </div>
                </div>
                <div className="p-3 rounded-md bg-zinc-800">
                  <ArrowUpRight className="w-6 h-6 text-zinc-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group bg-gradient-to-b from-zinc-950 to-zinc-900 border border-zinc-800 transition-transform duration-200 hover:scale-[1.015] hover:border-zinc-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Transfers</p>
                  <p className="text-2xl font-bold text-foreground">{analytics.overview.inventory.totalTransfers || 0}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <ArrowUpRight className="h-3 w-3 text-green-400" />
                    <span className="text-xs text-green-400">
                      Completed
                    </span>
                    {(analytics.overview.inventory.pendingTransfers || 0) > 0 && (
                      <>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-yellow-400">
                          {analytics.overview.inventory.pendingTransfers} pending
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="p-3 rounded-md bg-zinc-800">
                  <ArrowUpRight className="w-6 h-6 text-zinc-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>


        {/* Time Series Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
          {/* Case Openings Chart */}
          <Card className="group bg-gradient-to-b from-zinc-950 to-zinc-900 border border-zinc-800 transition-transform duration-200 hover:scale-[1.01] hover:border-zinc-700 overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                Case Openings Over Time
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-hidden">
              <div className="w-full overflow-x-auto">
                <ResponsiveContainer width="100%" height={300} minWidth={300}>
                <AreaChart data={caseOpeningsData}>
                  <defs>
                    <linearGradient id="colorCaseOpenings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#9ca3af"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    stroke="#9ca3af"
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#18181b', 
                      border: '1px solid #3f3f46',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#8b5cf6" 
                    fillOpacity={1} 
                    fill="url(#colorCaseOpenings)" 
                  />
                </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Buybacks Chart */}
          <Card className="group bg-gradient-to-b from-zinc-950 to-zinc-900 border border-zinc-800 transition-transform duration-200 hover:scale-[1.01] hover:border-zinc-700 overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5" />
                Buybacks Over Time
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-hidden">
              <div className="w-full overflow-x-auto">
                <ResponsiveContainer width="100%" height={300} minWidth={300}>
                <BarChart data={buybacksData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#9ca3af"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    yAxisId="left"
                    stroke="#9ca3af"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right"
                    stroke="#9ca3af"
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#18181b', 
                      border: '1px solid #3f3f46',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="count" fill="#ef4444" name="Count" />
                  <Bar yAxisId="right" dataKey="totalAmount" fill="#f59e0b" name="Total SOL" />
                </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transfers Chart */}
        <Card className="group bg-gradient-to-b from-zinc-950 to-zinc-900 border border-zinc-800 transition-transform duration-200 hover:scale-[1.01] hover:border-zinc-700 overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5" />
              Transfers Over Time
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-hidden">
            <div className="w-full overflow-x-auto">
              <ResponsiveContainer width="100%" height={300} minWidth={300}>
              <LineChart data={transfersData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="date" 
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#18181b', 
                    border: '1px solid #3f3f46',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={{ fill: '#10b981', r: 4 }}
                />
              </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Combined Chart */}
        <Card className="group bg-gradient-to-b from-zinc-950 to-zinc-900 border border-zinc-800 transition-transform duration-200 hover:scale-[1.01] hover:border-zinc-700 overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
              Combined Activity Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-hidden">
            <div className="w-full overflow-x-auto">
              <ResponsiveContainer width="100%" height={400} minWidth={300}>
              <LineChart data={combinedData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="date" 
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#18181b', 
                    border: '1px solid #3f3f46',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="caseOpenings" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  name="Case Openings"
                  dot={{ fill: '#8b5cf6', r: 3 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="buybacks" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  name="Buybacks"
                  dot={{ fill: '#ef4444', r: 3 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="transfers" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Transfers"
                  dot={{ fill: '#10b981', r: 3 }}
                />
              </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

