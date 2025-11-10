import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 Fetching Sugar cache file...");

    // Look for cache files in common Sugar locations
    const possibleCachePaths = [
      // Current directory
      "./cache.json",
      "./.sugar/cache.json",
      // Solana directory
      "../solana/cache.json",
      "../solana/.sugar/cache.json",
      // Parent directories
      "../../solana/cache.json",
      "../../solana/.sugar/cache.json",
    ];

    let cacheData = null;
    let cachePath = "";

    // Try to find cache file
    for (const cachePath of possibleCachePaths) {
      try {
        const fullPath = path.resolve(cachePath);
        if (fs.existsSync(fullPath)) {
          const fileContent = fs.readFileSync(fullPath, "utf8");
          cacheData = JSON.parse(fileContent);
          break;
        }
      } catch (error) {
        continue;
      }
    }

    if (!cacheData) {
      return NextResponse.json({
        success: false,
        message: "No Sugar cache file found",
        cacheData: null,
      });
    }

    // Validate cache structure according to Metaplex documentation
    if (!cacheData.program || !cacheData.items) {
      return NextResponse.json({
        success: false,
        message: "Invalid cache file structure",
        cacheData: null,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Cache file loaded successfully",
      cacheData: cacheData,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to load cache file",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
