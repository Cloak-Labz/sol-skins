import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";

/**
 * Initialize the SkinVault program with a specific admin authority.
 *
 * Usage:
 * 1. Set ANCHOR_PROVIDER_URL in .env (e.g., https://api.devnet.solana.com)
 * 2. Set ANCHOR_WALLET to your deployer keypair path
 * 3. Run: ts-node scripts/initialize-with-authority.ts
 *
 * This script will:
 * - Initialize the global state with the deployer as temporary authority
 * - Immediately transfer authority to v1t1nCTfxttsTFW3t7zTQFUsdpznu8kggzYSg7SDJMs
 */

const ADMIN_AUTHORITY = new PublicKey("v1t1nCTfxttsTFW3t7zTQFUsdpznu8kggzYSg7SDJMs");
const USDC_MINT_DEVNET = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"); // USDC on devnet

async function main() {
  // Setup provider
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Skinvault;
  const deployer = provider.wallet.publicKey;

  console.log("🚀 Initializing SkinVault Program");
  console.log("Program ID:", program.programId.toBase58());
  console.log("Deployer:", deployer.toBase58());
  console.log("Target Admin Authority:", ADMIN_AUTHORITY.toBase58());
  console.log("");

  // Find global state PDA
  const [globalState] = PublicKey.findProgramAddressSync(
    [Buffer.from("global")],
    program.programId
  );

  // Check if already initialized
  const existingAccount = await provider.connection.getAccountInfo(globalState);
  if (existingAccount) {
    console.log("❌ Global state already initialized at:", globalState.toBase58());
    console.log("");
    console.log("If you need to transfer authority, use: npm run transfer:authority");
    return;
  }

  console.log("📝 Global State PDA:", globalState.toBase58());
  console.log("💰 USDC Mint (devnet):", USDC_MINT_DEVNET.toBase58());
  console.log("");

  // Step 1: Initialize with deployer as temporary authority
  console.log("Step 1: Initializing program with deployer as temporary authority...");

  try {
    const initTx = await (program.methods as any)
      .initialize()
      .accounts({
        global: globalState,
        usdcMint: USDC_MINT_DEVNET,
        authority: deployer,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Initialized! Tx:", initTx);
    console.log("");
  } catch (error: any) {
    console.error("❌ Initialization failed:", error.message);
    if (error.logs) {
      console.log("\nTransaction logs:");
      error.logs.forEach((log: string) => console.log(log));
    }
    return;
  }

  // Step 2: Initiate authority transfer to target admin
  console.log("Step 2: Initiating authority transfer to admin...");

  try {
    const transferTx = await (program.methods as any)
      .initiateAuthorityTransfer(ADMIN_AUTHORITY)
      .accounts({
        global: globalState,
        authority: deployer,
      })
      .rpc();

    console.log("✅ Authority transfer initiated! Tx:", transferTx);
    console.log("");
  } catch (error: any) {
    console.error("❌ Authority transfer initiation failed:", error.message);
    if (error.logs) {
      console.log("\nTransaction logs:");
      error.logs.forEach((log: string) => console.log(log));
    }
    return;
  }

  console.log("🎉 Setup Complete!");
  console.log("");
  console.log("⚠️  IMPORTANT: The new admin authority must now accept the transfer:");
  console.log("");
  console.log("The admin wallet", ADMIN_AUTHORITY.toBase58(), "needs to run:");
  console.log("  npm run accept:authority");
  console.log("");
  console.log("Until accepted, the deployer retains admin privileges.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
