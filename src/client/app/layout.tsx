import type React from "react";
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SolanaProvider } from "@/components/solana-provider";
import { UserProvider } from "@/lib/contexts/UserContext";
import { Toaster } from "react-hot-toast";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dust3 - Where CS skins meet Web3 fairness",
  description:
    "Unbox CS:GO skins on-chain. Provably fair, backed by real inventory, instant liquidity.",
  generator: "v0.app",
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
    >
      <body
        suppressHydrationWarning
        className="antialiased min-h-screen bg-black"
      >
        <SolanaProvider>
          <UserProvider>
            {children}
            <Toaster
              position="top-right"
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
      </body>
    </html>
  );
}
