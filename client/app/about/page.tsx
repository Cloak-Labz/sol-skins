import { Card, CardContent } from "@/components/ui/card"

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">About SolSkins</h1>
          <p className="text-[#999] text-lg">The future of CS:GO skin collecting on Solana blockchain</p>
        </div>

        <div className="space-y-8">
          <Card className="bg-[#111] border-[#333] rounded-xl">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-white mb-4">What is SolSkins?</h2>
              <p className="text-[#999] leading-relaxed">
                SolSkins is a revolutionary platform that bridges the gap between traditional CS:GO skin trading and
                blockchain technology. Every digital skin you unbox is backed by real CS:GO skins in our secure
                inventory, giving you true ownership and value.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[#111] border-[#333] rounded-xl">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-white mb-4">How It Works</h2>
              <div className="space-y-4">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-[#333] rounded-full flex items-center justify-center text-white font-bold text-sm">
                    1
                  </div>
                  <div>
                    <h3 className="text-white font-medium mb-2">Connect Your Wallet</h3>
                    <p className="text-[#666] text-sm">Link your Solana wallet to start collecting skins as NFTs</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-[#333] rounded-full flex items-center justify-center text-white font-bold text-sm">
                    2
                  </div>
                  <div>
                    <h3 className="text-white font-medium mb-2">Open Loot Boxes</h3>
                    <p className="text-[#666] text-sm">Purchase and open cases to reveal rare CS:GO skins</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-[#333] rounded-full flex items-center justify-center text-white font-bold text-sm">
                    3
                  </div>
                  <div>
                    <h3 className="text-white font-medium mb-2">Keep or Sell</h3>
                    <p className="text-[#666] text-sm">Hold as NFTs or sell back to us at 85% market value</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#111] border-[#333] rounded-xl">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-white mb-4">Why Choose SolSkins?</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-white font-medium mb-2">🔒 Real Backing</h3>
                  <p className="text-[#666] text-sm">Every NFT is backed by actual CS:GO skins in our inventory</p>
                </div>
                <div>
                  <h3 className="text-white font-medium mb-2">⚡ Instant Liquidity</h3>
                  <p className="text-[#666] text-sm">Sell your skins back to us instantly at guaranteed rates</p>
                </div>
                <div>
                  <h3 className="text-white font-medium mb-2">🌐 Blockchain Ownership</h3>
                  <p className="text-[#666] text-sm">True ownership through Solana NFTs</p>
                </div>
                <div>
                  <h3 className="text-white font-medium mb-2">📈 Transparent Odds</h3>
                  <p className="text-[#666] text-sm">All drop rates and probabilities are publicly verifiable</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
