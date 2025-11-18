import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

// Load treasury keypair from tests/keypairs/treasury-keypair.json
function loadTreasuryKeypair(): Keypair {
  const keypairPath = path.join(__dirname, "../tests/keypairs/treasury-keypair.json");
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
  return Keypair.fromSecretKey(new Uint8Array(keypairData));
}

async function main() {
  console.log("🔍 Checking Buyback Config on-chain...\n");

  // Load treasury keypair
  const treasury = loadTreasuryKeypair();
  const expectedTreasury = treasury.publicKey.toBase58();
  console.log("📋 Expected Treasury Address:", expectedTreasury, "\n");

  // Setup provider
  const connection = new anchor.web3.Connection(
    process.env.ANCHOR_PROVIDER_URL || anchor.web3.clusterApiUrl("devnet"),
    "confirmed"
  );
  const wallet = new anchor.Wallet(treasury);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);
  const program = anchor.workspace.Programs as Program;

  // Derive PDA
  const [buybackConfigPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("buyback_config_v4")],
    program.programId
  );

  console.log("Program ID:", program.programId.toString());
  console.log("Buyback Config PDA:", buybackConfigPda.toString(), "\n");

  try {
    const config = await (program.account as any).buyBackConfig.fetch(buybackConfigPda);
    
    console.log("✅ Buyback config found on-chain!\n");
    console.log("📊 Current Configuration:");
    console.log("  Authority:", config.authority.toBase58());
    console.log("  Treasury:", config.treasury.toBase58());
    console.log("  Treasury USDC Account:", config.treasuryTokenAccount.toBase58());
    console.log("  USDC Mint:", config.usdcMint.toBase58());
    console.log("  Collection Mint:", config.collectionMint.toBase58());
    console.log("  Buyback Enabled:", config.buybackEnable);
    console.log("  Min Treasury Balance:", config.minTreasuryBalance.toString(), "(" + (Number(config.minTreasuryBalance) / 1_000_000) + " USDC)\n");

    const currentTreasury = config.treasury.toBase58();
    
    if (currentTreasury === expectedTreasury) {
      console.log("✅ Treasury matches! No action needed.");
    } else {
      console.log("⚠️  WARNING: Treasury mismatch!");
      console.log("  Current on-chain:", currentTreasury);
      console.log("  Expected:", expectedTreasury);
      console.log("\n❌ The config on-chain has a different treasury address.");
      console.log("   You need to reinitialize the buyback config.");
      console.log("   Note: The PDA already exists, so you'll need to:");
      console.log("   1. Close/delete the existing PDA account (requires authority)");
      console.log("   2. OR use a new PDA seed (e.g., buyback_config_v4)");
      console.log("\n   To reinitialize, run:");
      console.log("   cd programs && ts-node scripts/init-buyback-on-chain.ts");
    }
  } catch (error: any) {
    if (error.toString().includes("Account does not exist") || error.toString().includes("Invalid account")) {
      console.log("ℹ️  Buyback config not found on-chain.");
      console.log("   You need to initialize it first.");
      console.log("\n   To initialize, run:");
      console.log("   cd programs && ts-node scripts/init-buyback-on-chain.ts");
      console.log("\n   Make sure to set:");
      console.log("   - TREASURY_USDC_ACCOUNT (the USDC token account owned by the treasury)");
      console.log("   - USDC_MINT (optional, defaults to devnet USDC)");
      console.log("   - MIN_USDC_BALANCE (optional, defaults to 100 USDC)");
    } else {
      console.error("❌ Error:", error);
      throw error;
    }
  }
}

main();

