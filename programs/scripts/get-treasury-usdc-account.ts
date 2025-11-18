import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair } from "@solana/web3.js";
import { getAssociatedTokenAddress, getAccount, createAssociatedTokenAccountInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token";
import * as fs from "fs";
import * as path from "path";

// Load treasury keypair from tests/keypairs/treasury-keypair.json
function loadTreasuryKeypair(): Keypair {
  const keypairPath = path.join(__dirname, "../tests/keypairs/treasury-keypair.json");
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
  return Keypair.fromSecretKey(new Uint8Array(keypairData));
}

async function main() {
  console.log("🔍 Getting/Creating Treasury USDC Account...\n");

  // Load treasury keypair
  const treasury = loadTreasuryKeypair();
  const treasuryPubkey = treasury.publicKey;
  console.log("📋 Treasury Address:", treasuryPubkey.toBase58(), "\n");

  // Setup connection
  const connection = new anchor.web3.Connection(
    process.env.ANCHOR_PROVIDER_URL || anchor.web3.clusterApiUrl("devnet"),
    "confirmed"
  );

  // USDC Mint (devnet default)
  const usdcMintStr = process.env.USDC_MINT || "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"; // Devnet USDC
  const usdcMint = new PublicKey(usdcMintStr);
  console.log("💵 USDC Mint:", usdcMint.toBase58(), "\n");

  // Get or create Associated Token Account (ATA)
  const treasuryUsdcAccount = await getAssociatedTokenAddress(usdcMint, treasuryPubkey);
  console.log("📦 Treasury USDC Account (ATA):", treasuryUsdcAccount.toBase58(), "\n");

  // Check if account exists
  try {
    const accountInfo = await getAccount(connection, treasuryUsdcAccount);
    const balance = Number(accountInfo.amount) / 1_000_000; // USDC has 6 decimals
    console.log("✅ Account exists!");
    console.log("  Balance:", balance, "USDC");
    console.log("  Owner:", accountInfo.owner.toBase58());
    console.log("  Mint:", accountInfo.mint.toBase58());
  } catch (error: any) {
    if (error.toString().includes("could not find account")) {
      console.log("⚠️  Account does not exist yet.");
      console.log("   You need to create it first or fund it with USDC.");
      console.log("\n   To create and fund:");
      console.log("   1. Use a faucet or transfer USDC to this address");
      console.log("   2. Or create the ATA using:");
      console.log("      spl-token create-account", usdcMint.toBase58(), "--owner", treasuryPubkey.toBase58());
    } else {
      throw error;
    }
  }

  console.log("\n📝 Set this in your environment:");
  console.log("   export TREASURY_USDC_ACCOUNT=" + treasuryUsdcAccount.toBase58());
  console.log("\n   Or add to your .env file:");
  console.log("   TREASURY_USDC_ACCOUNT=" + treasuryUsdcAccount.toBase58());
}

main();

