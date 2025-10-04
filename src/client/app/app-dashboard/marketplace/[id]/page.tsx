"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingBag, Rocket, Clock, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function MarketplaceItemPage() {
  const router = useRouter();

  // Redirect to main marketplace page
  useEffect(() => {
    router.push("/app-dashboard/marketplace");
  }, [router]);

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
            This feature is currently under development. Check back soon!
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/app-dashboard/packs">
              <Button className="bg-[#E99500] hover:bg-[#E99500]/90 text-white px-8">
                <Rocket className="w-4 h-4 mr-2" />
                Open Packs
              </Button>
            </Link>
            <Link href="/app-dashboard/marketplace">
              <Button variant="outline" className="border-[#333] text-white hover:bg-[#1a1a1a] px-8">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Marketplace
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
