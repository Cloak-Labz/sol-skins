import { LeaderboardEntry, LeaderboardFilters, UserRank } from "../types/api";

export function getMockLeaderboard(_filters?: LeaderboardFilters): {
  success: boolean;
  data: LeaderboardEntry[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
} {
  const entries: LeaderboardEntry[] = Array.from({ length: 50 }).map((_, i) => {
    const rank = i + 1;
    const inventoryValue = Math.round(50000 - i * 700 + Math.random() * 5000);
    const totalSpent = Math.round(inventoryValue * (0.7 + Math.random() * 0.4));
    const totalEarned = Math.round(
      inventoryValue * (0.8 + Math.random() * 0.5)
    );
    const netProfit = totalEarned - totalSpent;
    const casesOpened = Math.floor(100 + Math.random() * 900);
    const wallet = `SoL${(100000 + i).toString()}...${(9000 + i).toString()}`;

    return {
      rank,
      user: {
        id: `user-${rank}`,
        username: rank <= 10 ? `TopUser${rank}` : undefined,
        walletAddress: wallet,
      },
      inventoryValue,
      casesOpened,
      totalSpent,
      totalEarned,
      netProfit,
    };
  });

  return { success: true, data: entries };
}

export function getMockUserRank(metric: string = "inventory-value"): UserRank {
  const valueByMetric =
    metric === "cases-opened"
      ? Math.floor(300 + Math.random() * 500)
      : metric === "profit"
      ? Math.round(1000 + Math.random() * 10000)
      : Math.round(20000 + Math.random() * 50000);

  return {
    rank: Math.floor(1 + Math.random() * 1000),
    totalUsers: 5000,
    percentile: Math.round(Math.random() * 1000) / 10,
    metric,
    value: valueByMetric,
  };
}
