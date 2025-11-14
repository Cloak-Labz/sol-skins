import type React from "react";
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SolanaProvider } from "@/components/solana-provider";
import { UserProvider } from "@/lib/contexts/UserContext";
import { Toaster } from "sonner";
import { Analytics } from '@vercel/analytics/next';

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DUST3 - CS2 Skins Meet Web3",
  description:
    "Open CS2 skin packs on Solana. Provably fair drops, instant SOL payouts, or claim to Steam. Real skins, real value.",
  openGraph: {
    title: "DUST3 - CS2 Skins Meet Web3",
    description:
      "Open CS2 skin packs on Solana. Provably fair drops, instant SOL payouts, or claim to Steam. Real skins, real value.",
    type: "website",
    siteName: "DUST3",
    images: [
      {
        url: "/assets/banner2.png",
        width: 1200,
        height: 630,
        alt: "DUST3 - CS2 Skins on Solana",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@DUST3fun",
    creator: "@DUST3fun",
    title: "DUST3 - CS2 Skins Meet Web3",
    description:
      "Open CS2 skin packs on Solana. Provably fair drops, instant SOL payouts, or claim to Steam.",
    images: ["/assets/banner2.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} dark`}
      suppressHydrationWarning
    >
      <body
        suppressHydrationWarning
        className="antialiased min-h-screen bg-[#0a0a0a]"
      >
        <SolanaProvider>
          <UserProvider>
            {children}
            <Toaster
              position="top-center"
              theme="dark"
              toastOptions={{
                style: {
                  background: "#1a1a1a",
                  color: "#fff",
                  border: "1px solid #333",
                },
              }}
            />
          </UserProvider>
        </SolanaProvider>
        <Analytics />
      </body>
    </html>
  );
}
