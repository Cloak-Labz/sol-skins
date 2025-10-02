"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/app-dashboard/packs");
  }, [router]);

  return (
    <div className="min-h-screen bg-black p-8 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-[#E99500]" />
    </div>
  );
}
