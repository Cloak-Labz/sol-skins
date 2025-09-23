import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function ActivityPage() {
  const activities = [
    { user: "CryptoGamer", action: "opened", item: "AK-47 Redline", value: "$45.20", time: "2m ago", type: "open" },
    {
      user: "SkinCollector",
      action: "sold",
      item: "AWP Dragon Lore",
      value: "$2,450.00",
      time: "5m ago",
      type: "sell",
    },
    { user: "NFTTrader", action: "opened", item: "Karambit Fade", value: "$1,200.00", time: "8m ago", type: "open" },
    { user: "BlockchainBoy", action: "opened", item: "M4A4 Howl", value: "$3,500.00", time: "12m ago", type: "open" },
    { user: "SolanaKing", action: "sold", item: "Glock Fade", value: "$890.00", time: "15m ago", type: "sell" },
    {
      user: "CryptoWhale",
      action: "opened",
      item: "Butterfly Knife",
      value: "$1,890.00",
      time: "18m ago",
      type: "open",
    },
    {
      user: "SkinHunter",
      action: "sold",
      item: "AK-47 Fire Serpent",
      value: "$1,234.00",
      time: "22m ago",
      type: "sell",
    },
    { user: "NFTMaster", action: "opened", item: "AWP Medusa", value: "$2,100.00", time: "25m ago", type: "open" },
    {
      user: "BlockchainPro",
      action: "opened",
      item: "Karambit Doppler",
      value: "$980.00",
      time: "28m ago",
      type: "open",
    },
    { user: "CryptoLord", action: "sold", item: "M4A1-S Knight", value: "$567.00", time: "32m ago", type: "sell" },
  ]

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-4">Activity Feed</h1>
        <p className="text-[#999] text-lg">Real-time activity from the SolSkins community</p>
      </div>

      <Card className="bg-[#111] border-[#333] rounded-xl overflow-hidden">
        <CardContent className="p-0">
          {activities.map((activity, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-6 border-b border-[#333] last:border-b-0 hover:bg-[#1a1a1a] transition-colors"
            >
              <div className="flex items-center space-x-4">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm ${
                    activity.type === "open" ? "bg-blue-500/20 text-blue-400" : "bg-green-500/20 text-green-400"
                  }`}
                >
                  {activity.type === "open" ? "📦" : "💰"}
                </div>
                <div>
                  <p className="text-white">
                    <span className="font-medium">{activity.user}</span>
                    <span className="text-[#666] mx-2">{activity.action}</span>
                    <span className="font-medium">{activity.item}</span>
                  </p>
                  <p className="text-[#666] text-sm">{activity.time}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white font-bold">{activity.value}</p>
                <Badge
                  variant="secondary"
                  className={`text-xs ${
                    activity.type === "open" ? "bg-blue-500/20 text-blue-400" : "bg-green-500/20 text-green-400"
                  } border-0`}
                >
                  {activity.type}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
