"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { Home, Package } from "lucide-react";
import { motion } from "framer-motion";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 py-8 sm:p-6 md:p-8">
      <div className="max-w-2xl w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="bg-gradient-to-b from-zinc-950 to-zinc-900 border-zinc-800 overflow-hidden">
            <div className="relative">
              {/* Animated background */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#E99500]/10 via-transparent to-transparent" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(233,149,0,0.1),transparent_70%)]" />

              <div className="relative px-4 py-8 sm:p-8 md:p-12 text-center">
                {/* Error Code */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="mb-4 sm:mb-6"
                >
                  <div className="inline-block">
                    <h1 className="text-7xl sm:text-8xl md:text-9xl lg:text-[12rem] font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#E99500] to-[#ff6b00] leading-none">
                      404
                    </h1>
                    <div className="h-0.5 sm:h-1 bg-gradient-to-r from-[#E99500] to-[#ff6b00] mt-2 sm:mt-4 rounded-full" />
                  </div>
                </motion.div>

                {/* Error Message */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  className="mb-6 sm:mb-8 px-2"
                >
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2 sm:mb-3">
                    Page Not Found
                  </h2>
                  <p className="text-gray-400 text-base sm:text-lg mb-1 sm:mb-2">
                    Looks like this skin doesn't exist in our inventory...
                  </p>
                  <p className="text-gray-500 text-xs sm:text-sm">
                    The page you're looking for has been moved or doesn't exist.
                  </p>
                </motion.div>

                {/* Action Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                  className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center"
                >
                  <Link href="/" className="w-full sm:w-auto">
                    <Button
                      size="lg"
                      className="w-full bg-[#E99500] hover:bg-[#c77f00] text-black font-bold px-6 sm:px-8 py-4 sm:py-6 text-sm sm:text-base"
                    >
                      <Home className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                      Go Home
                    </Button>
                  </Link>

                  <Link href="/packs" className="w-full sm:w-auto">
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full border-[#333] text-white hover:bg-[#1a1a1a] hover:text-[#E99500] px-6 sm:px-8 py-4 sm:py-6 text-sm sm:text-base"
                    >
                      <Package className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                      View Packs
                    </Button>
                  </Link>
                </motion.div>
              </div>
            </div>
          </Card>

          {/* Fun Message */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.5 }}
            className="text-center mt-4 sm:mt-6 text-gray-600 text-xs sm:text-sm px-4"
          >
            <p>💀 No skins were harmed in the making of this error page.</p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

