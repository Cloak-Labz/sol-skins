import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import fs from "fs";
import path from "path";

async function main() {
  console.log("🔧 Fixing current_batch in Global state...\n");

  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const idlPath = path.join(__dirname, "../target/idl/skinvault.json");
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  const programId = new PublicKey(idl.address);
  const program = new Program(idl, provider);

  console.log("Program ID:", programId.toBase58());
  console.log("Authority:", provider.wallet.publicKey.toBase58());
  console.log();

  // Check current state
  const [globalPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("global")],
    programId
  );

  const global = await program.account.global.fetch(globalPDA);
  console.log("Current Global.current_batch:", global.currentBatch.toString());

  // Find all existing batches
  console.log("\n🔍 Scanning for existing batches...");
  let maxBatchId = 0;

  for (let i = 0; i <= 10; i++) {
    const batchIdBuffer = Buffer.alloc(8);
    batchIdBuffer.writeBigUInt64LE(BigInt(i));
    const [batchPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("batch"), batchIdBuffer],
      programId
    );

    try {
      const batch = await program.account.batch.fetch(batchPDA);
      console.log(`✅ Found Batch ${i} (stored ID: ${batch.batchId.toString()})`);
      maxBatchId = Math.max(maxBatchId, Number(batch.batchId));
    } catch (err) {
      // Batch doesn't exist
    }
  }

  console.log(`\n📊 Highest batch ID found: ${maxBatchId}`);

  if (maxBatchId > Number(global.currentBatch)) {
    console.log(`\n⚠️  Global.current_batch (${global.currentBatch.toString()}) is outdated!`);
    console.log(`   It should be: ${maxBatchId}`);
    console.log(`\n💡 Solution: Publish a new batch with ID ${maxBatchId + 1}`);
    console.log(`   This will automatically update current_batch to ${maxBatchId + 1}`);
  } else {
    console.log(`\n✅ Global.current_batch is up to date!`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
