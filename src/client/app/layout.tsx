import type React from "react";
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import Footer from "@/components/footer";
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
  title: "SolSkins - CS:GO Skins on Solana",
  description:
    "Open loot boxes, collect CS:GO skins as NFTs, and trade on Solana blockchain",
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
      <body className="antialiased min-h-screen bg-[#0a0a0a]">
        <SolanaProvider>
          <UserProvider>
            <div className="relative">
              <Sidebar />
              <Header />
              <main className="ml-64 pt-16 min-h-screen flex flex-col relative z-10">
                <div className="flex-1 relative z-10">{children}</div>
                <Footer />
              </main>
            </div>
            <Toaster 
              position="top-right"
              toastOptions={{
                style: {
                  background: '#1a1a1a',
                  color: '#fff',
                  border: '1px solid #333',
                },
              }}
            />
          </UserProvider>
        </SolanaProvider>
      </body>
    </html>
  );
}
