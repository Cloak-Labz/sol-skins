"use client";

import { useEffect, useState } from "react";
import { Package } from "lucide-react";
import { boxesService, type Box } from "@/lib/services/boxes.service";
import { activityService } from "@/lib/services/activity.service";
import type { ActivityItem } from "@/lib/types/api";

function PullCard({ pull }: { pull: ActivityItem }) {
  const [imageError, setImageError] = useState(false);
  const normalizeImageUrl = (url?: string | null) => {
    if (!url) return undefined;
    const trimmed = url.trim();
    if (!trimmed) return undefined;
    if (trimmed.startsWith("ipfs://")) {
      const hash = trimmed.replace("ipfs://", "").replace(/^\/+/, "");
      return hash ? `https://ipfs.io/ipfs/${hash}` : undefined;
    }
    if (trimmed.startsWith("ar://")) {
      const txId = trimmed.replace("ar://", "").replace(/^\/+/, "");
      return txId ? `https://arweave.net/${txId}` : undefined;
    }
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }
    if (/^ipfs\.io\//i.test(trimmed)) {
      return `https://${trimmed}`;
    }
    return undefined;
  };
  
  const imageSrc = normalizeImageUrl(
    pull.skin?.imageUrl ?? (pull as any)?.skin?.metadata?.image
  );

  return (
    <div className="group rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden relative">
      <div className="absolute inset-0 opacity-50 group-hover:opacity-90 transition-opacity duration-500 pointer-events-none">
        <div className="absolute -inset-6 bg-gradient-to-br from-[#E99500]/60 via-transparent to-transparent blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#E99500]/15 via-transparent to-transparent" />
      </div>
      <div className="relative aspect-[3/4] bg-zinc-900/60 flex items-center justify-center p-3 transition-transform duration-500 group-hover:scale-[1.02]">
        {imageSrc && !imageError ? (
          <img
            src={imageSrc}
            alt={pull.skin?.skinName || "Skin"}
            className="w-full h-full object-contain rounded-md"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <Package className="w-12 h-12 sm:w-16 sm:h-16 text-zinc-600" />
        )}
      </div>
      <div className="p-3 space-y-1">
        <div className="text-[11px] text-zinc-400">Just revealed</div>
        <div className="text-xs text-white truncate">
          {pull.skin?.skinName || "Unknown"}
        </div>
        <div className="text-[11px] text-zinc-500 space-y-0.5">
          <div className="truncate">
            {pull.skin?.weapon || "Unknown"} • {pull.skin?.condition || "Field-Tested"}
          </div>
          <div className="truncate">
            {pull.skin?.rarity || "Common"} • {pull.lootBox?.name || "Pack"}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [pulls, setPulls] = useState<ActivityItem[]>([]);
  const [packs, setPacks] = useState<Box[]>([]);
  const [loading, setLoading] = useState(true);

  const normalizeImageUrl = (url?: string | null) => {
    if (!url) return undefined;

    const trimmed = url.trim();
    if (!trimmed) return undefined;

    if (trimmed.startsWith("ipfs://")) {
      const hash = trimmed.replace("ipfs://", "").replace(/^\/+/, "");
      return hash ? `https://ipfs.io/ipfs/${hash}` : undefined;
    }

    if (trimmed.startsWith("ar://")) {
      const txId = trimmed.replace("ar://", "").replace(/^\/+/, "");
      return txId ? `https://arweave.net/${txId}` : undefined;
    }

    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }

    if (/^ipfs\.io\//i.test(trimmed)) {
      return `https://${trimmed}`;
    }

    return undefined;
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      activityService.getRecent(40).catch(() => []),
      boxesService.getActiveBoxes().catch(() => [])
    ]).then(([pullsData, packsData]) => {
      setPulls(pullsData);
      setPacks(packsData);
    }).finally(() => {
      setLoading(false);
    });
  }, []);
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] p-6 md:p-8 font-sans">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Hero Skeleton */}
          <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-gradient-to-b from-zinc-950 to-zinc-900">
            <div className="w-full h-[220px] md:h-[360px] bg-zinc-900 animate-pulse" />
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
              <div className="space-y-3">
                <div className="h-8 bg-zinc-800 rounded w-48 animate-pulse" />
                <div className="h-12 bg-zinc-800 rounded w-64 animate-pulse" />
                <div className="h-4 bg-zinc-800 rounded w-96 animate-pulse" />
              </div>
            </div>
          </div>

          {/* Recent Pulls Skeleton */}
          <section className="space-y-3">
            <div className="h-6 bg-zinc-800 rounded w-32 animate-pulse" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden">
                  <div className="aspect-[3/4] bg-zinc-900 animate-pulse" />
                  <div className="p-3 space-y-2">
                    <div className="h-3 bg-zinc-800 rounded w-20 animate-pulse" />
                    <div className="h-4 bg-zinc-800 rounded w-full animate-pulse" />
                    <div className="h-3 bg-zinc-800 rounded w-24 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Your Packs Skeleton */}
          <section className="space-y-3">
            <div className="h-6 bg-zinc-800 rounded w-32 animate-pulse" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden">
                  <div className="aspect-[3/4] bg-zinc-900 animate-pulse" />
                  <div className="p-3 space-y-2">
                    <div className="h-3 bg-zinc-800 rounded w-20 animate-pulse" />
                    <div className="h-4 bg-zinc-800 rounded w-full animate-pulse" />
                    <div className="h-3 bg-zinc-800 rounded w-24 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

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

        <section className="space-y-3">
          <h3 className="text-white font-semibold">Available Packs</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-4">
            {packs.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-zinc-800 bg-gradient-to-b from-zinc-950 to-zinc-900 p-10 text-zinc-400 gap-3">
                <div className="font-mono text-3xl">{":("}</div>
                <div>Nothing here yet</div>
              </div>
            )}
            {packs.map((p) => {
              const packImageSrc = normalizeImageUrl(p.imageUrl);

              return (
                <div
                  key={p.id}
                  className="rounded-xl border border-zinc-800 bg-gradient-to-b from-zinc-950 to-zinc-900 p-4 flex flex-col h-full"
                >
                  <div className="aspect-[3/4] rounded-lg bg-zinc-800/40 mb-3 overflow-hidden">
                    {packImageSrc ? (
                      <img
                        src={packImageSrc}
                        alt={p.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(event) => {
                          const target = event.currentTarget;
                          target.onerror = null;
                          target.src = "/assets/banner2.jpg";
                        }}
                      />
                    ) : (
                      <img
                        src="/assets/banner2.jpg"
                        alt={p.name}
                        className="w-full h-full object-cover opacity-90"
                      />
                    )}
                  </div>
                  <div className="flex-1 flex flex-col">
                    <div className="text-white font-semibold leading-tight mb-2 min-h-[2.5rem] flex items-start">
                      {p.name}
                    </div>
                    <div className="text-zinc-400 text-sm mb-3">
                      {Math.floor(Number(p.priceUsdc || 0))} USDC
                    </div>
                    <div className="mt-auto">
                      <a
                        href="/packs"
                        className="w-full inline-flex items-center justify-center px-3 py-2 rounded-md bg-[#E99500] text-black hover:bg-[#d88500] text-sm font-semibold transition-colors"
                      >
                        Open Pack
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Recent Pulls */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold">Recent Pulls</h3>
          </div>
          {pulls.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-800 bg-gradient-to-b from-zinc-950 to-zinc-900 p-10 text-zinc-400 gap-3">
              <div className="font-mono text-3xl">{":("}</div>
              <div>Nothing here yet</div>
            </div>
          ) : (
            <div className="relative overflow-hidden px-4 sm:px-6 md:px-10">
              <div className="flex gap-3 animate-scroll" style={{ width: 'fit-content' }}>
                {/* First set of pulls */}
                {pulls.map((p) => (
                  <div key={p.id} className="flex-shrink-0 w-[calc(50vw-1.5rem)] sm:w-[calc(33.333vw-1.5rem)] lg:w-[200px]">
                    <PullCard pull={p} />
                  </div>
                ))}
                {/* Duplicate set for seamless loop */}
                {pulls.map((p) => (
                  <div key={`duplicate-${p.id}`} className="flex-shrink-0 w-[calc(50vw-1.5rem)] sm:w-[calc(33.333vw-1.5rem)] lg:w-[200px]">
                    <PullCard pull={p} />
                  </div>
                ))}
                {/* Third set to ensure smooth transition */}
                {pulls.map((p) => (
                  <div key={`triplicate-${p.id}`} className="flex-shrink-0 w-[calc(50vw-1.5rem)] sm:w-[calc(33.333vw-1.5rem)] lg:w-[200px]">
                    <PullCard pull={p} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
