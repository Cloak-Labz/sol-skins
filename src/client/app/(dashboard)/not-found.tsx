"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Home, Package, ArrowLeft, Box, Search } from "lucide-react";
import { motion } from "framer-motion";

export default function DashboardNotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6 md:p-8 flex items-center justify-center">
      <div className="max-w-2xl w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="bg-gradient-to-b from-zinc-950 to-zinc-900 border-zinc-800 overflow-hidden -py-6">
            <CardContent className="p-8 md:p-12">
              <div className="relative">
                {/* Animated background */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#E99500]/10 via-transparent to-transparent pointer-events-none" />
                
                <div className="relative text-center">
                  {/* Animated Box Icon */}
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.2, duration: 0.6, type: "spring" }}
                    className="inline-block mb-6"
                  >
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#E99500]/20 to-[#ff6b00]/20 border-2 border-[#E99500]/30 flex items-center justify-center">
                      <Box className="w-12 h-12 text-[#E99500]" />
                    </div>
                  </motion.div>

                  {/* Error Code */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                  >
                    <h1 className="text-7xl md:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#E99500] to-[#ff6b00] mb-4">
                      404
                    </h1>
                  </motion.div>

                  {/* Error Message */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className="mb-8"
                  >
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
                      This Case is Empty
                    </h2>
                    <p className="text-gray-400 text-base mb-2">
                      The page you're looking for doesn't exist or has been moved.
                    </p>
                    <p className="text-gray-500 text-sm">
                      Try opening a new pack or check your inventory instead!
                    </p>
                  </motion.div>

                  {/* Action Buttons */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7, duration: 0.5 }}
                    className="flex flex-col sm:flex-row gap-3 justify-center mb-8"
                  >
                    <Link href="/dashboard">
                      <Button
                        size="lg"
                        className="w-full sm:w-auto bg-[#E99500] hover:bg-[#c77f00] text-black font-bold px-6"
                      >
                        <Home className="w-4 h-4 mr-2" />
                        Dashboard Home
                      </Button>
                    </Link>

                    <Link href="/packs">
                      <Button
                        size="lg"
                        variant="outline"
                        className="w-full sm:w-auto border-[#333] text-white hover:bg-[#1a1a1a] hover:text-[#E99500] px-6"
                      >
                        <Package className="w-4 h-4 mr-2" />
                        Open Packs
                      </Button>
                    </Link>
                  </motion.div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fun Footer Message */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1, duration: 0.5 }}
            className="text-center mt-4"
          >
            <p className="text-gray-600 text-xs">
              🎮 Better luck next time, unbox a winning page!
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

