import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

/**
 * Accept authority transfer for the SkinVault program.
 *
 * Usage:
 * 1. Set ANCHOR_PROVIDER_URL in .env (e.g., https://api.devnet.solana.com)
 * 2. Set ANCHOR_WALLET to the NEW admin authority keypair path
 * 3. Run: ts-node scripts/accept-authority.ts
 *
 * This script completes the 2-step authority transfer process.
 */

async function main() {
  // Setup provider
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Skinvault as Program<any>;
  const newAuthority = provider.wallet.publicKey;

  console.log("🔐 Accepting Authority Transfer");
  console.log("Program ID:", program.programId.toBase58());
  console.log("New Authority:", newAuthority.toBase58());
  console.log("");

  // Find global state PDA
  const [globalState] = PublicKey.findProgramAddressSync(
    [Buffer.from("global")],
    program.programId
  );

  // Check current state
  const global = await program.account.globalState.fetch(globalState);
  console.log("Current Authority:", global.authority.toBase58());
  console.log("Pending Authority:", global.pendingAuthority?.toBase58() || "None");
  console.log("");

  if (!global.pendingAuthority) {
    console.log("❌ No pending authority transfer found.");
    console.log("Authority transfer must be initiated first by the current authority.");
    return;
  }

  if (!global.pendingAuthority.equals(newAuthority)) {
    console.log("❌ This wallet is not the pending authority.");
    console.log("Expected:", global.pendingAuthority.toBase58());
    console.log("Your wallet:", newAuthority.toBase58());
    return;
  }

  // Accept authority transfer
  console.log("Accepting authority transfer...");

  try {
    const tx = await program.methods
      .acceptAuthority()
      .accountsPartial({
        global: globalState,
        newAuthority: newAuthority,
      })
      .rpc();

    console.log("✅ Authority transfer accepted! Tx:", tx);
    console.log("");

    // Verify new authority
    const updatedGlobal = await program.account.globalState.fetch(globalState);
    console.log("🎉 New Authority:", updatedGlobal.authority.toBase58());
    console.log("Pending Authority:", updatedGlobal.pendingAuthority?.toBase58() || "None");
  } catch (error) {
    console.error("❌ Authority transfer failed:", error);
    return;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
