import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

/**
 * Transfer authority for an already-initialized SkinVault program.
 *
 * Usage:
 * 1. Set ANCHOR_PROVIDER_URL in .env (e.g., https://api.devnet.solana.com)
 * 2. Set ANCHOR_WALLET to the CURRENT admin authority keypair path
 * 3. Run: ts-node scripts/transfer-authority.ts
 *
 * This script will initiate authority transfer to v1t1nCTfxttsTFW3t7zTQFUsdpznu8kggzYSg7SDJMs
 */

const NEW_ADMIN_AUTHORITY = new PublicKey("v1t1nCTfxttsTFW3t7zTQFUsdpznu8kggzYSg7SDJMs");

async function main() {
  // Setup provider
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Skinvault;
  const currentAuthority = provider.wallet.publicKey;

  console.log("🔐 Transferring Authority");
  console.log("Program ID:", program.programId.toBase58());
  console.log("Current Authority (your wallet):", currentAuthority.toBase58());
  console.log("New Admin Authority:", NEW_ADMIN_AUTHORITY.toBase58());
  console.log("");

  // Find global state PDA
  const [globalState] = PublicKey.findProgramAddressSync(
    [Buffer.from("global")],
    program.programId
  );

  console.log("Global State PDA:", globalState.toBase58());
  console.log("");

  // Check current state
  let globalData: any;
  try {
    globalData = await provider.connection.getAccountInfo(globalState);
    if (!globalData) {
      console.log("❌ Global state account not found!");
      console.log("Is the program initialized? Is the program ID correct?");
      return;
    }

    // Decode the account data manually
    const accountData = await program.account.global.fetch(globalState);
    console.log("Current on-chain authority:", accountData.authority.toBase58());
    console.log("Pending authority:", accountData.pendingAuthority?.toBase58() || "None");
    console.log("");

    if (!accountData.authority.equals(currentAuthority)) {
      console.log("❌ ERROR: Your wallet is not the current authority!");
      console.log("Expected authority:", accountData.authority.toBase58());
      console.log("Your wallet:", currentAuthority.toBase58());
      console.log("");
      console.log("You must use the current authority's keypair to transfer authority.");
      return;
    }

    if (accountData.authority.equals(NEW_ADMIN_AUTHORITY)) {
      console.log("✅ Authority is already set to the target address!");
      return;
    }
  } catch (error: any) {
    console.error("❌ Failed to fetch global state:", error.message);
    console.log("");
    console.log("Is the program initialized? Is the program ID correct?");
    return;
  }

  // Initiate authority transfer
  console.log("Initiating authority transfer...");

  try {
    const tx = await (program.methods as any)
      .initiateAuthorityTransfer(NEW_ADMIN_AUTHORITY)
      .accounts({
        global: globalState,
        authority: currentAuthority,
      })
      .rpc();

    console.log("✅ Authority transfer initiated! Tx:", tx);
    console.log("");
  } catch (error: any) {
    console.error("❌ Authority transfer initiation failed:", error.message);
    if (error.logs) {
      console.log("\nTransaction logs:");
      error.logs.forEach((log: string) => console.log(log));
    }
    return;
  }

  console.log("🎉 Transfer Initiated Successfully!");
  console.log("");
  console.log("⚠️  NEXT STEP: The new admin must accept the transfer:");
  console.log("");
  console.log("The admin wallet", NEW_ADMIN_AUTHORITY.toBase58());
  console.log("must run: npm run accept:authority");
  console.log("");
  console.log("Until accepted, you (", currentAuthority.toBase58(), ") retain admin privileges.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
