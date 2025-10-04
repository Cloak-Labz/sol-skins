"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingBag, Rocket, Clock } from "lucide-react";
import Link from "next/link";

export default function MarketplacePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-8">
      <Card className="bg-[#111] border-[#333] max-w-2xl w-full">
        <CardContent className="p-12 text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <ShoppingBag className="w-20 h-20 text-[#666]" />
              <div className="absolute -top-2 -right-2 bg-[#E99500] rounded-full p-2">
                <Clock className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <h1 className="text-4xl font-bold text-white mb-4">
            Marketplace Coming Soon
          </h1>
          
          <p className="text-[#999] text-lg mb-8 leading-relaxed">
            We're building an amazing peer-to-peer marketplace where you can buy and sell 
            CS:GO skins directly with other players. All transactions will be secured on 
            the Solana blockchain.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link href="/app-dashboard/packs">
              <Button className="bg-[#E99500] hover:bg-[#E99500]/90 text-white px-8">
                <Rocket className="w-4 h-4 mr-2" />
                Open Packs
              </Button>
            </Link>
            <Link href="/app-dashboard/inventory">
              <Button variant="outline" className="border-[#333] text-white hover:bg-[#1a1a1a] px-8">
                View Inventory
              </Button>
            </Link>
          </div>

          <div className="pt-8 border-t border-[#333]">
            <p className="text-[#666] text-sm">
              Want to be notified when the marketplace launches? Connect your wallet and start collecting skins!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
