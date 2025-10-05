"use client";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-black p-6 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Promo Hero */}
        <div className="relative rounded-2xl overflow-hidden border border-zinc-800">
          <img src="/dust3.jpeg" alt="Dust3 Promo Pack" className="w-full h-[220px] md:h-[340px] object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white">Dust3 Promo Pack</h2>
              <p className="text-zinc-300">Open packs inspired by CS classics. Provably fair, instant delivery.</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-md bg-zinc-900 text-zinc-200 border border-zinc-700 text-sm">Featured</span>
              <a href="/app-dashboard/packs" className="inline-block">
                <span className="inline-flex items-center px-4 py-2 rounded-md bg-zinc-100 text-black hover:bg-white transition-colors">Open Packs</span>
              </a>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: 'Open Packs', href: '/app-dashboard/packs', desc: 'Try your luck' },
            { title: 'Inventory', href: '/app-dashboard/inventory', desc: 'Manage winnings' },
            { title: 'Activity', href: '/app-dashboard/activity', desc: 'See latest' },
            { title: 'Leaderboard', href: '/app-dashboard/leaderboard', desc: 'Top collectors' },
          ].map((item) => (
            <a key={item.href} href={item.href} className="group rounded-xl border border-zinc-800 hover:border-zinc-700 bg-gradient-to-b from-zinc-950 to-zinc-900 p-5 transition-transform duration-150 hover:scale-[1.01]">
              <div className="text-foreground font-semibold">{item.title}</div>
              <div className="text-sm text-zinc-400">{item.desc}</div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
