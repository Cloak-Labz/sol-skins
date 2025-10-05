import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dust3 — Provably Fair CS Skins with Instant Liquidity",
  description:
    "Open CS skin packs with verifiable randomness, real inventory backing, and instant USDC buyback on Solana. Try the 3D Dust Claw experience.",
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
