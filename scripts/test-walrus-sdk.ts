#!/usr/bin/env ts-node
/**
 * Test Walrus SDK Integration
 *
 * This script tests the WalrusClient using the official @mysten/walrus SDK.
 *
 * Usage:
 *   npx ts-node scripts/test-walrus-sdk.ts
 */

import { WalrusClient } from "./upload-to-walrus";

async function testWalrusSDK() {
  console.log(
    "╔══════════════════════════════════════════════════════════════════════╗"
  );
  console.log(
    "║                                                                      ║"
  );
  console.log(
    "║         🐋  WALRUS SDK TEST - Using Official SDK  🐋                  ║"
  );
  console.log(
    "║                                                                      ║"
  );
  console.log(
    "╚══════════════════════════════════════════════════════════════════════╝"
  );
  console.log("");

  try {
    // Step 1: Initialize client
    console.log("📋 Step 1: Initializing Walrus SDK client...");
    const walrus = await WalrusClient.create({
      network: "testnet",
      epochs: 1,
      verbose: true,
    });
    console.log("");

    // Step 2: Create test metadata
    console.log("📋 Step 2: Creating test NFT metadata...");
    const testMetadata = {
      name: "Test NFT from Walrus SDK",
      symbol: "TEST",
      description: "Testing the official Walrus TypeScript SDK",
      image: "https://example.com/test.png",
      attributes: [
        { trait_type: "Test", value: "Success" },
        { trait_type: "SDK", value: "@mysten/walrus" },
        { trait_type: "Network", value: "Testnet" },
      ],
      properties: {
        files: [{ uri: "https://example.com/test.png", type: "image/png" }],
        category: "image",
      },
    };
    console.log("   Created metadata for:", testMetadata.name);
    console.log("");

    // Step 3: Upload to Walrus
    console.log("📋 Step 3: Uploading metadata to Walrus...");
    const uri = await walrus.uploadJson(testMetadata);
    console.log("");

    // Step 4: Verify retrieval
    console.log("📋 Step 4: Verifying retrieval...");
    const response = await fetch(uri);
    const retrieved: any = await response.json();

    console.log("   ✅ Successfully retrieved from Walrus!");
    console.log("   Name:", retrieved.name);
    console.log("   Symbol:", retrieved.symbol);
    console.log("");

    // Step 5: Test batch upload
    console.log("📋 Step 5: Testing batch upload (3 items)...");
    const batchMetadata = [
      {
        name: "AK-47 | Fire Serpent",
        symbol: "SKIN",
        description: "Covert grade weapon skin",
        attributes: [{ trait_type: "Weapon", value: "AK-47" }],
      },
      {
        name: "AWP | Dragon Lore",
        symbol: "SKIN",
        description: "Covert grade weapon skin",
        attributes: [{ trait_type: "Weapon", value: "AWP" }],
      },
      {
        name: "M4A4 | Howl",
        symbol: "SKIN",
        description: "Contraband grade weapon skin",
        attributes: [{ trait_type: "Weapon", value: "M4A4" }],
      },
    ];

    const uris = await walrus.uploadJsonBatch(batchMetadata);
    console.log("");

    // Summary
    console.log(
      "╔══════════════════════════════════════════════════════════════════════╗"
    );
    console.log(
      "║                                                                      ║"
    );
    console.log(
      "║                ✅  WALRUS SDK TEST COMPLETE! ✅                       ║"
    );
    console.log(
      "║                                                                      ║"
    );
    console.log(
      "╚══════════════════════════════════════════════════════════════════════╝"
    );
    console.log("");
    console.log("🎯 Results:");
    console.log("   • Single upload URI:", uri);
    console.log("   • Batch uploaded:", uris.length, "items");
    console.log("");
    console.log("📋 Batch URIs:");
    uris.forEach((url, i) => {
      console.log(`   [${i}]`, batchMetadata[i].name);
      console.log(`       ${url}`);
    });
    console.log("");
    console.log("✨ Ready to use in integration tests!");
    console.log("");
  } catch (error: any) {
    console.error("");
    console.error("❌ Test failed:", error.message);
    console.error("");

    if (error.message.includes("fetch")) {
      console.error("💡 Tip: Make sure you have internet connection");
    }

    process.exit(1);
  }
}

// Run the test
testWalrusSDK()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Unexpected error:", error);
    process.exit(1);
  });
