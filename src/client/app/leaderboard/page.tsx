import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function LeaderboardPage() {
  const leaderboard = [
    { rank: 1, user: "CryptoGamer", totalValue: "$12,450.00", pulls: 234, winRate: "78%" },
    { rank: 2, user: "SkinCollector", totalValue: "$8,920.00", pulls: 189, winRate: "72%" },
    { rank: 3, user: "NFTTrader", totalValue: "$7,340.00", pulls: 156, winRate: "69%" },
    { rank: 4, user: "BlockchainBoy", totalValue: "$6,780.00", pulls: 143, winRate: "65%" },
    { rank: 5, user: "SolanaKing", totalValue: "$5,890.00", pulls: 128, winRate: "71%" },
    { rank: 6, user: "CryptoWhale", totalValue: "$5,450.00", pulls: 112, winRate: "68%" },
    { rank: 7, user: "SkinHunter", totalValue: "$4,890.00", pulls: 98, winRate: "64%" },
    { rank: 8, user: "NFTMaster", totalValue: "$4,320.00", pulls: 87, winRate: "66%" },
    { rank: 9, user: "BlockchainPro", totalValue: "$3,980.00", pulls: 76, winRate: "62%" },
    { rank: 10, user: "CryptoLord", totalValue: "$3,650.00", pulls: 69, winRate: "67%" },
  ]

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-4">Leaderboard</h1>
        <p className="text-[#999] text-lg">Top collectors and their achievements</p>
      </div>

      <Card className="bg-[#111] border-[#333] rounded-xl overflow-hidden">
        <CardContent className="p-0">
          <div className="grid grid-cols-5 gap-4 p-4 border-b border-[#333] bg-[#1a1a1a]">
            <div className="text-[#666] text-sm font-medium">Rank</div>
            <div className="text-[#666] text-sm font-medium">User</div>
            <div className="text-[#666] text-sm font-medium">Total Value</div>
            <div className="text-[#666] text-sm font-medium">Pulls</div>
            <div className="text-[#666] text-sm font-medium">Win Rate</div>
          </div>
          {leaderboard.map((player, index) => (
            <div
              key={index}
              className="grid grid-cols-5 gap-4 p-4 border-b border-[#333] last:border-b-0 hover:bg-[#1a1a1a] transition-colors"
            >
              <div className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    player.rank <= 3 ? "bg-yellow-500 text-black" : "bg-[#333] text-white"
                  }`}
                >
                  {player.rank}
                </div>
              </div>
              <div className="flex items-center">
                <p className="text-white font-medium">{player.user}</p>
              </div>
              <div className="flex items-center">
                <p className="text-white font-bold">{player.totalValue}</p>
              </div>
              <div className="flex items-center">
                <p className="text-[#999]">{player.pulls}</p>
              </div>
              <div className="flex items-center">
                <Badge variant="secondary" className="bg-[#333] text-[#999] border-0">
                  {player.winRate}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
