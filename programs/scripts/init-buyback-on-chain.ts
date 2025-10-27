import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

async function main() {
  console.log("🚀 Initializing Buyback Program...\n");

  // Setup
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Programs as Program;

  // Collection mint from Candy Machine
  const collectionMint = new PublicKey("2x2aiDQafe3K6s7TL4c5qKfKiUiTx4Pioren1aiUoWqE");

  // Minimum treasury balance (10 SOL)
  const minTreasuryBalance = new anchor.BN(10_000_000_000);

  // Derive PDA
  const [buybackConfigPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("buyback_config")],
    program.programId
  );

  console.log("Program ID:", program.programId.toString());
  console.log("Authority:", provider.wallet.publicKey.toString());
  console.log("Treasury:", provider.wallet.publicKey.toString());
  console.log("Collection Mint:", collectionMint.toString());
  console.log("Buyback Config PDA:", buybackConfigPda.toString());
  console.log("Min Treasury Balance:", minTreasuryBalance.toString(), "lamports (10 SOL)\n");

  try {
    console.log("📝 Sending transaction...");
    const tx = await program.methods
      .initializeBuyback(collectionMint, minTreasuryBalance)
      .accounts({
        authority: provider.wallet.publicKey,
        treasury: provider.wallet.publicKey,
        collectionMint: collectionMint,
      })
      .rpc();

    console.log("✅ Buyback config initialized!");
    console.log("Transaction signature:", tx);
    console.log("\n🎉 Setup complete!");
    console.log("\nNext steps:");
    console.log("1. Start your backend server");
    console.log("2. Test the API: curl http://localhost:4000/api/v1/buyback/status");
    console.log("3. Mint from Candy Machine and test buyback!");
  } catch (error) {
    if (error.toString().includes("already in use")) {
      console.log("ℹ️  Buyback config already initialized. Skipping...");
    } else {
      console.error("❌ Error:", error);
      throw error;
    }
  }
}

main();

