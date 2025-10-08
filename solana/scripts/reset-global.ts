import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import fs from "fs";
import path from "path";

async function main() {
  console.log("🔄 Resetting Global account...\n");

  // Load program
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const idlPath = path.join(__dirname, "../target/idl/skinvault.json");
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  const programId = new PublicKey(idl.address);
  const program = new Program(idl, provider);

  console.log("Program ID:", programId.toBase58());
  console.log("Authority:", provider.wallet.publicKey.toBase58());
  console.log();

  // Derive Global PDA
  const [globalPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("global")],
    programId
  );

  console.log("Global PDA:", globalPDA.toBase58());

  // Check if Global account exists
  const accountInfo = await provider.connection.getAccountInfo(globalPDA);
  if (!accountInfo) {
    console.log("✅ Global account doesn't exist - nothing to close");
    return;
  }

  console.log("⚠️  Global account exists - closing it...");
  console.log();

  try {
    // Call close_global
    const tx = await program.methods
      .closeGlobal()
      .accounts({
        global: globalPDA,
        authority: provider.wallet.publicKey,
      })
      .rpc();

    console.log("✅ Global account closed!");
    console.log("Signature:", tx);
    console.log();
    console.log("💡 Now you can reinitialize the program with the correct structure");
  } catch (error: any) {
    console.error("❌ Error closing Global:", error.message || error);
    if (error.logs) {
      console.log("\nLogs:");
      error.logs.forEach((log: string) => console.log("  ", log));
    }
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
