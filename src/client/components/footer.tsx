import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-[#0a0a0a] border-t border-[#333] mt-8 sm:mt-12 lg:mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="h-6 sm:h-8 mb-3 sm:mb-4 w-auto">
              <img
                src="/assets/DUST3-SVG.svg"
                alt="Dust3 logo"
                className="h-6 sm:h-8 w-auto"
              />
            </div>
            <p className="text-[#666] text-xs sm:text-sm leading-relaxed">
              The future of CS:GO skin collecting on Solana blockchain. Real
              skins, real value, real ownership.
            </p>
          </div>

          <div>
            <h4 className="text-white text-sm sm:text-base font-medium mb-3 sm:mb-4">Platform</h4>
            <div className="space-y-1.5 sm:space-y-2">
              <Link
                href="/packs"
                className="block text-[#666] hover:text-white text-xs sm:text-sm transition-colors"
              >
                Packs
              </Link>
              <Link
                href="/leaderboard"
                className="block text-[#666] hover:text-white text-xs sm:text-sm transition-colors"
              >
                Leaderboard
              </Link>
              <Link
                href="/activity"
                className="block text-[#666] hover:text-white text-xs sm:text-sm transition-colors"
              >
                Activity
              </Link>
            </div>
          </div>

          <div>
            <h4 className="text-white text-sm sm:text-base font-medium mb-3 sm:mb-4">Support</h4>
            <div className="space-y-1.5 sm:space-y-2">
              <Link
                href="https://discord.gg/ZMgYmAZBzU"
                className="block text-[#666] hover:text-white text-xs sm:text-sm transition-colors"
              >
                Help Center
              </Link>
              <Link
                href="/terms"
                className="block text-[#666] hover:text-white text-xs sm:text-sm transition-colors"
              >
                Terms of Service
              </Link>
              <Link
                href="/privacy"
                className="block text-[#666] hover:text-white text-xs sm:text-sm transition-colors"
              >
                Privacy Policy
              </Link>
            </div>
          </div>

          <div>
            <h4 className="text-white text-sm sm:text-base font-medium mb-3 sm:mb-4">Community</h4>
            <div className="space-y-1.5 sm:space-y-2">
              <Link
                href="https://discord.gg/ZMgYmAZBzU "
                className="block text-[#666] hover:text-white text-xs sm:text-sm transition-colors"
              >
                Discord
              </Link>
              <Link
                href="https://x.com/DUST3fun"
                className="block text-[#666] hover:text-white text-xs sm:text-sm transition-colors"
              >
                Twitter
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-[#333] mt-6 sm:mt-8 pt-6 sm:pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-[#666] text-xs sm:text-sm text-center sm:text-left">
            © 2025 Dust3. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
