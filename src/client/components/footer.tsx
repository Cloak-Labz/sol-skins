import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-[#0a0a0a] border-t border-[#333] mt-16">
      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="h-8 mb-4 w-auto">
              <img
                src="/assets/DUST3-SVG.svg"
                alt="Dust3 logo"
                className="h-8 w-auto"
              />
            </div>
            <p className="text-[#666] text-sm leading-relaxed">
              The future of CS:GO skin collecting on Solana blockchain. Real
              skins, real value, real ownership.
            </p>
          </div>

          <div>
            <h4 className="text-white font-medium mb-4">Platform</h4>
            <div className="space-y-2">
              <Link
                href="/packs"
                className="block text-[#666] hover:text-white text-sm transition-colors"
              >
                Packs
              </Link>
              <Link
                href="/leaderboard"
                className="block text-[#666] hover:text-white text-sm transition-colors"
              >
                Leaderboard
              </Link>
              <Link
                href="/activity"
                className="block text-[#666] hover:text-white text-sm transition-colors"
              >
                Activity
              </Link>
            </div>
          </div>

          <div>
            <h4 className="text-white font-medium mb-4">Support</h4>
            <div className="space-y-2">
              <Link
                href="/about"
                className="block text-[#666] hover:text-white text-sm transition-colors"
              >
                About
              </Link>
              <Link
                href="https://discord.gg/ZMgYmAZBzU"
                className="block text-[#666] hover:text-white text-sm transition-colors"
              >
                Help Center
              </Link>
              <Link
                href="#"
                className="block text-[#666] hover:text-white text-sm transition-colors"
              >
                Terms of Service
              </Link>
              <Link
                href="#"
                className="block text-[#666] hover:text-white text-sm transition-colors"
              >
                Privacy Policy
              </Link>
            </div>
          </div>

          <div>
            <h4 className="text-white font-medium mb-4">Community</h4>
            <div className="space-y-2">
              <Link
                href="https://discord.gg/ZMgYmAZBzU "
                className="block text-[#666] hover:text-white text-sm transition-colors"
              >
                Discord
              </Link>
              <Link
                href="https://x.com/DUST3fun"
                className="block text-[#666] hover:text-white text-sm transition-colors"
              >
                Twitter
              </Link>
              <Link
                href="#"
                className="block text-[#666] hover:text-white text-sm transition-colors"
              >
                Telegram
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-[#333] mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-[#666] text-sm">
            © 2025 Dust3. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
