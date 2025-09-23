import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

export default function HomePage() {
  const recentPulls = [
    { skin: "AK-47 Redline", rarity: "Classified", price: "$45.20", time: "2m ago" },
    { skin: "AWP Dragon Lore", rarity: "Covert", price: "$2,450.00", time: "2m ago" },
    { skin: "Karambit Fade", rarity: "Covert", price: "$1,200.00", time: "2m ago" },
    { skin: "M4A4 Howl", rarity: "Contraband", price: "$3,500.00", time: "2m ago" },
  ]

  const leaderboard = [
    { rank: 1, user: "CryptoGamer", totalValue: "$12,450.00", pulls: 234 },
    { rank: 2, user: "SkinCollector", totalValue: "$8,920.00", pulls: 189 },
    { rank: 3, user: "NFTTrader", totalValue: "$7,340.00", pulls: 156 },
    { rank: 4, user: "BlockchainBoy", totalValue: "$6,780.00", pulls: 143 },
    { rank: 5, user: "SolanaKing", totalValue: "$5,890.00", pulls: 128 },
  ]

  const recentActivity = [
    { user: "CryptoGamer", action: "opened", item: "AK-47 Redline", value: "$45.20", time: "2m ago" },
    { user: "SkinCollector", action: "sold", item: "AWP Dragon Lore", value: "$2,450.00", time: "5m ago" },
    { user: "NFTTrader", action: "opened", item: "Karambit Fade", value: "$1,200.00", time: "8m ago" },
    { user: "BlockchainBoy", action: "opened", item: "M4A4 Howl", value: "$3,500.00", time: "12m ago" },
    { user: "SolanaKing", action: "sold", item: "Glock Fade", value: "$890.00", time: "15m ago" },
  ]

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-8">
      <section className="mb-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div>
              <h1 className="text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                Introducing
                <br />
                <span className="text-white">CS:GO Skin Drop</span>
              </h1>
              <p className="text-[#999] text-lg leading-relaxed mb-8">
                Open a digital pack to instantly reveal a real skin. Choose to hold, trade, redeem, or sell it back to
                us at 85% value!
              </p>
              <Button size="lg" className="bg-[#333] hover:bg-[#444] text-white border-0 rounded-lg px-8 py-3">
                View Drop
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="aspect-square bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] rounded-2xl border border-[#333] p-8 flex items-center justify-center">
              <div className="text-8xl">📦</div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-white">Recent Pulls</h2>
          <Link href="/marketplace">
            <Button variant="ghost" className="text-[#999] hover:text-white hover:bg-[#1a1a1a] border-0">
              Open Now
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {recentPulls.map((pull, index) => (
            <Card
              key={index}
              className="bg-[#111] border-[#333] hover:border-[#555] transition-all duration-200 rounded-xl overflow-hidden"
            >
              <CardContent className="p-0">
                <div className="aspect-square bg-[#1a1a1a] flex items-center justify-center border-b border-[#333]">
                  <div className="text-4xl">🔫</div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-white text-sm mb-1">{pull.skin}</h3>
                  <p className="text-[#666] text-xs mb-3">{pull.rarity}</p>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white text-sm">{pull.price}</span>
                    <span className="text-[#666] text-xs">{pull.time}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-12 mt-16">
        {/* Leaderboard Section */}
        <section>
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-white">Leaderboard</h2>
            <Link href="/leaderboard">
              <Button variant="ghost" className="text-[#999] hover:text-white hover:bg-[#1a1a1a] border-0">
                View All
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>

          <Card className="bg-[#111] border-[#333] rounded-xl overflow-hidden">
            <CardContent className="p-0">
              {leaderboard.map((player, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border-b border-[#333] last:border-b-0 hover:bg-[#1a1a1a] transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 bg-[#333] rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {player.rank}
                    </div>
                    <div>
                      <p className="text-white font-medium">{player.user}</p>
                      <p className="text-[#666] text-sm">{player.pulls} pulls</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">{player.totalValue}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        {/* Recent Activity Section */}
        <section>
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-white">Recent Activity</h2>
            <Link href="/activity">
              <Button variant="ghost" className="text-[#999] hover:text-white hover:bg-[#1a1a1a] border-0">
                View All
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>

          <Card className="bg-[#111] border-[#333] rounded-xl overflow-hidden">
            <CardContent className="p-0">
              {recentActivity.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border-b border-[#333] last:border-b-0 hover:bg-[#1a1a1a] transition-colors"
                >
                  <div className="flex-1">
                    <p className="text-white text-sm">
                      <span className="font-medium">{activity.user}</span>
                      <span className="text-[#666] mx-1">{activity.action}</span>
                      <span className="font-medium">{activity.item}</span>
                    </p>
                    <p className="text-[#666] text-xs mt-1">{activity.time}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold text-sm">{activity.value}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}
