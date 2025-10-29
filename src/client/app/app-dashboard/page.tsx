"use client";

import { useEffect, useState } from "react";
import { boxesService, type Box } from "@/lib/services/boxes.service";
import { activityService } from "@/lib/services/activity";
import type { ActivityItem } from "@/lib/types/api";

export default function DashboardPage() {
  const [pulls, setPulls] = useState<ActivityItem[]>([]);
  const [packs, setPacks] = useState<Box[]>([]);

  useEffect(() => {
    activityService
      .getRecent(12)
      .then(setPulls)
      .catch(() => setPulls([]));
    boxesService
      .getActiveBoxes()
      .then(setPacks)
      .catch(() => setPacks([]));
  }, []);
  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Hero */}
        <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-gradient-to-b from-zinc-950 to-zinc-900">
          <img
            src="/assets/banner1.jpg"
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
                Dust3 Promo Pack
              </div>
              <p className="text-zinc-300 max-w-2xl mt-2">
                Open a digital pack to instantly reveal a real card. Choose to
                hold, trade, redeem, or sell it back to us at 85% value!
              </p>
            </div>
          </div>
        </div>

        {/* Recent Pulls */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold">Recent Pulls</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {pulls.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-zinc-800 bg-gradient-to-b from-zinc-950 to-zinc-900 p-10 text-zinc-400 gap-3">
                <div className="font-mono text-3xl">{":("}</div>
                <div>Nothing here yet</div>
              </div>
            )}
            {pulls.slice(0, 6).map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden"
              >
                <div className="aspect-[3/4] bg-zinc-900/50 flex items-center justify-center">
                  {p.skin?.imageUrl ? (
                    <img
                      src={p.skin.imageUrl}
                      alt={p.skin.skinName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src="/assets/pack-card.png"
                      alt="pull"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="p-3 space-y-1">
                  <div className="text-[11px] text-zinc-400">Just revealed</div>
                  <div className="text-xs text-white truncate">
                    {p.skin?.skinName || "Unknown"}
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    Claw Machine • {p.lootBox?.name || "Pack"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Your Skins */}
        <section className="space-y-3">
          <h3 className="text-white font-semibold">Your Packs</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-4">
            {packs.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-zinc-800 bg-gradient-to-b from-zinc-950 to-zinc-900 p-10 text-zinc-400 gap-3">
                <div className="font-mono text-3xl">{":("}</div>
                <div>Nothing here yet</div>
              </div>
            )}
            {packs.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-zinc-800 bg-gradient-to-b from-zinc-950 to-zinc-900 p-4 flex flex-col h-full"
              >
                <div className="aspect-[3/4] rounded-lg bg-zinc-800/40 mb-3 overflow-hidden">
                  {p.imageUrl && (
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 flex flex-col">
                  <div className="text-white font-semibold leading-tight mb-2 min-h-[2.5rem] flex items-start">
                    {p.name}
                  </div>
                  <div className="text-zinc-400 text-sm mb-3">
                    {Number(p.priceSol).toFixed(1)} SOL
                  </div>
                  <div className="mt-auto">
                    <a
                      href="/app-dashboard/packs"
                      className="w-full inline-flex items-center justify-center px-3 py-2 rounded-md bg-[#E99500] text-black hover:bg-[#d88500] text-sm font-semibold transition-colors"
                    >
                      Open Pack
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
