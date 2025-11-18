import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { PublicKey, Keypair } from "@solana/web3.js";
import { getAssociatedTokenAddress, getAccount } from "@solana/spl-token";
import * as fs from "fs";
import * as path from "path";

// Load treasury keypair from tests/keypairs/treasury-keypair.json
function loadTreasuryKeypair(): Keypair {
  const keypairPath = path.join(__dirname, "../tests/keypairs/treasury-keypair.json");
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
  return Keypair.fromSecretKey(new Uint8Array(keypairData));
}

async function main() {
  console.log("🚀 Initializing Buyback Program...\n");

  // Load treasury keypair
  const treasury = loadTreasuryKeypair();
  console.log("📋 Treasury Address:", treasury.publicKey.toBase58(), "\n");

  // Setup provider with treasury as wallet
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

  // Collection mint from Candy Machine
  const collectionMint = new PublicKey("2x2aiDQafe3K6s7TL4c5qKfKiUiTx4Pioren1aiUoWqE");
  const usdcMint = new PublicKey(process.env.USDC_MINT ?? "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"); // default devnet USDC
  const usdcDecimals = Number(process.env.USDC_DECIMALS ?? 6);
  const minUsdc = Number(process.env.MIN_USDC_BALANCE ?? 100); // default 100 USDC
  
  // Get or calculate Treasury USDC Account (ATA)
  let treasuryUsdcAccount: PublicKey;
  const treasuryUsdcAccountEnv = process.env.TREASURY_USDC_ACCOUNT;
  
  if (treasuryUsdcAccountEnv) {
    // Use provided account
    treasuryUsdcAccount = new PublicKey(treasuryUsdcAccountEnv);
    console.log("📦 Using provided TREASURY_USDC_ACCOUNT:", treasuryUsdcAccount.toBase58());
  } else {
    // Calculate ATA automatically
    treasuryUsdcAccount = await getAssociatedTokenAddress(usdcMint, treasury.publicKey);
    console.log("📦 Calculated Treasury USDC Account (ATA):", treasuryUsdcAccount.toBase58());
    console.log("   (You can set TREASURY_USDC_ACCOUNT env var to use a different account)\n");
    
    // Check if account exists and has balance
    try {
      const accountInfo = await getAccount(provider.connection, treasuryUsdcAccount);
      const balance = Number(accountInfo.amount) / 1_000_000;
      console.log("✅ Account exists with balance:", balance, "USDC");
      if (balance < minUsdc) {
        console.log("⚠️  Warning: Balance is below minimum required (", minUsdc, "USDC)");
        console.log("   Make sure to fund this account before initializing!");
      }
    } catch (error: any) {
      if (error.toString().includes("could not find account")) {
        console.log("⚠️  Account does not exist yet.");
        console.log("   You need to create and fund it with at least", minUsdc, "USDC.");
        console.log("   The account address is:", treasuryUsdcAccount.toBase58());
        console.log("\n   To create and fund:");
        console.log("   1. Use a USDC faucet or transfer USDC to:", treasuryUsdcAccount.toBase58());
        console.log("   2. Or use spl-token: spl-token create-account", usdcMint.toBase58());
        console.log("   3. Then transfer USDC to the account");
        throw new Error("Treasury USDC account does not exist. Create and fund it first.");
      } else {
        throw error;
      }
    }
  }
  
  const minTreasuryBalance = new BN(minUsdc * 10 ** usdcDecimals);

  // Derive PDA
  const [buybackConfigPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("buyback_config_v4")],
    program.programId
  );

  console.log("Program ID:", program.programId.toString());
  console.log("Authority:", treasury.publicKey.toString());
  console.log("Treasury:", treasury.publicKey.toString());
  console.log("Collection Mint:", collectionMint.toString());
  console.log("Buyback Config PDA:", buybackConfigPda.toString());
  console.log("USDC Mint:", usdcMint.toString());
  console.log("Treasury USDC Account:", treasuryUsdcAccount.toString());
  console.log("Min Treasury Balance (raw):", minTreasuryBalance.toString(), ` (~${minUsdc} USDC)\n`);

  // Check if config already exists
  try {
    const existingConfig = await (program.account as any).buyBackConfig.fetch(buybackConfigPda);
    const existingTreasury = existingConfig.treasury.toBase58();
    const expectedTreasury = treasury.publicKey.toBase58();

    console.log("⚠️  Buyback config already exists on-chain!");
    console.log("  Current Treasury:", existingTreasury);
    console.log("  Expected Treasury:", expectedTreasury);

    if (existingTreasury === expectedTreasury) {
      console.log("\n✅ Treasury matches! Config is already correctly initialized.");
      console.log("   No action needed.");
      return;
    } else {
      console.log("\n❌ Treasury mismatch detected!");
      console.log("   The config on-chain has a different treasury address.");
      console.log("   You need to close the existing PDA account first.");
      console.log("\n   To fix this:");
      console.log("   1. Close the PDA account (requires authority):");
      console.log("      solana program close <PDA_ADDRESS> --program-id <PROGRAM_ID>");
      console.log("   2. Then run this script again to reinitialize.");
      console.log("\n   Or use a new PDA seed by updating the seed in:");
      console.log("   - programs/programs/programs/src/instructions/initialize.rs");
      console.log("   - programs/programs/programs/src/instructions/execute.rs");
      console.log("   - programs/programs/programs/src/instructions/toggle_buyback.rs");
      console.log("   - programs/tests/programs.ts");
      console.log("   - src/server/services/BuybackService.ts");
      throw new Error("Treasury mismatch - cannot initialize");
    }
  } catch (error: any) {
    // If account doesn't exist, proceed with initialization
    if (error.toString().includes("Account does not exist") || 
        error.toString().includes("Invalid account") ||
        error.toString().includes("Treasury mismatch")) {
      if (error.toString().includes("Treasury mismatch")) {
        throw error; // Re-throw treasury mismatch errors
      }

      // Account doesn't exist, proceed with initialization
      try {
        console.log("📝 Initializing buyback config...");
        const tx = await program.methods
          .initializeBuyback(collectionMint, minTreasuryBalance)
          .accounts({
            authority: treasury.publicKey,
            treasury: treasury.publicKey,
            collectionMint,
            usdcMint,
            treasuryUsdcAccount,
          })
          .signers([treasury])
          .rpc();

        console.log("✅ Buyback config initialized!");
        console.log("Transaction signature:", tx);
        console.log("\n🎉 Setup complete!");
        console.log("\nNext steps:");
        console.log("1. Update ADMIN_WALLET_PRIVATE_KEY in your backend .env file");
        console.log("2. Start your backend server");
        console.log("3. Test the API: curl http://localhost:4000/api/v1/buyback/status");
        console.log("4. Mint from Candy Machine and test buyback!");
      } catch (initError: any) {
        if (initError.toString().includes("already in use")) {
          console.log("ℹ️  Account already in use. This shouldn't happen if check passed.");
          console.log("   Try running: ts-node scripts/check-buyback-config.ts");
        } else {
          console.error("❌ Error initializing:", initError);
          throw initError;
        }
      }
    } else {
      console.error("❌ Unexpected error:", error);
      throw error;
    }
  }
}

main();

