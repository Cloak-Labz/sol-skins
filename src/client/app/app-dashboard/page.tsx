"use client";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-black p-6 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Hero */}
        <div className="relative rounded-2xl overflow-hidden border border-[#1a1a1a]">
          <img
            src="/dust3.jpeg"
            alt="Dust3 Promo Pack"
            className="w-full h-[220px] md:h-[360px] object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                Introducing
              </h2>
              <div className="text-4xl md:text-5xl font-extrabold text-white leading-tight">
                Basketball Packs
              </div>
              <p className="text-zinc-300 max-w-2xl mt-2">
                Open a digital pack to instantly reveal a real card. Choose to
                hold, trade, redeem, or sell it back to us at 85% value!
              </p>
            </div>
            <div className="flex items-center gap-3">
              <a href="/app-dashboard/packs" className="inline-block">
                <span className="inline-flex items-center px-4 py-2 rounded-md bg-[#E99500] text-black hover:bg-[#d88500] transition-colors">
                  View Drop
                </span>
              </a>
            </div>
          </div>
        </div>

        {/* Recent Pulls */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold">Recent Pulls</h3>
            <a
              href="/app-dashboard/packs"
              className="text-[#E99500] text-sm hover:underline"
            >
              Open Now
            </a>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden"
              >
                <div className="aspect-[3/4] bg-zinc-900/50 flex items-center justify-center">
                  <img
                    src="/assets/pack-card.png"
                    alt="pull"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-3 space-y-1">
                  <div className="text-[11px] text-zinc-400">
                    Just revealed • 1m ago
                  </div>
                  <div className="text-xs text-white truncate">
                    2025 Pokemon SV Black Bolt Poke
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    Claw Machine • Elite Pack
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Digital Packs, Physical Cards */}
        <section className="space-y-3">
          <h3 className="text-white font-semibold">
            Digital Packs, Physical Cards
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-4">
            {[
              { name: "Rookie Pack", price: "$25" },
              { name: "Starter Hoops Pack", price: "$25" },
              { name: "Elite Pack", price: "$50" },
              { name: "East Blue Pack", price: "$80" },
              { name: "Legend Pack", price: "$250" },
              { name: "Platinum Hoops Pack", price: "$500" },
            ].map((p) => (
              <div
                key={p.name}
                className="rounded-xl border border-zinc-800 bg-gradient-to-b from-zinc-950 to-zinc-900 p-4"
              >
                <div className="aspect-[3/4] rounded-lg bg-zinc-800/40 mb-3"></div>
                <div className="text-white font-semibold leading-tight">
                  {p.name}
                </div>
                <div className="text-zinc-400 text-sm">{p.price}</div>
                <div className="mt-3 flex items-center gap-2">
                  <button className="h-8 w-8 rounded bg-zinc-900 border border-zinc-700 text-white">
                    −
                  </button>
                  <div className="px-3 py-1 rounded bg-zinc-900 border border-zinc-700 text-white text-sm">
                    1
                  </div>
                  <button className="h-8 w-8 rounded bg-zinc-900 border border-zinc-700 text-white">
                    +
                  </button>
                  <a
                    href="/app-dashboard/packs"
                    className="ml-auto inline-flex items-center px-3 py-1.5 rounded-md bg-[#E99500] text-black hover:bg-[#d88500] text-sm"
                  >
                    Buy
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Actions */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              title: "Open Packs",
              href: "/app-dashboard/packs",
              desc: "Try your luck",
            },
            {
              title: "Inventory",
              href: "/app-dashboard/inventory",
              desc: "Manage winnings",
            },
            {
              title: "Leaderboard",
              href: "/app-dashboard/leaderboard",
              desc: "Top collectors",
            },
            {
              title: "About",
              href: "/app-dashboard/about",
              desc: "How Dust3 works",
            },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="group rounded-xl border border-zinc-800 hover:border-zinc-700 bg-gradient-to-b from-zinc-950 to-zinc-900 p-5 transition-transform duration-150 hover:scale-[1.01]"
            >
              <div className="text-white font-semibold">{item.title}</div>
              <div className="text-sm text-zinc-400">{item.desc}</div>
            </a>
          ))}
        </div>

        {/* Stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Packs Opened", value: "1,284" },
            { label: "Total Won (USDC)", value: "$32,910" },
            { label: "Buybacks Processed", value: "742" },
            { label: "Avg. Confirmation", value: "1.6s" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-zinc-800 bg-zinc-950 p-5"
            >
              <div className="text-zinc-400 text-sm">{s.label}</div>
              <div className="text-white text-2xl font-bold">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Recent Activity (placeholder) */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950">
          <div className="p-5 border-b border-zinc-800 text-white font-semibold">
            Recent Activity
          </div>
          <div className="p-5 text-zinc-400 text-sm">
            Coming soon: live drops, buybacks, and leaderboard highlights.
          </div>
        </div>
      </div>
    </div>
  );
}
