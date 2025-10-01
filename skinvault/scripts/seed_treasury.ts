import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair } from "@solana/web3.js";
import {
  createMint,
  createAssociatedTokenAccount,
  mintTo,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Skinvault } from "../target/types/skinvault";
import * as fs from "fs";

// Configuration
const RPC_URL = process.env.RPC_URL || "https://api.devnet.solana.com";
const WALLET_PATH = process.env.WALLET_PATH || "~/.config/solana/id.json";
const PROGRAM_ID = "SKINVault1111111111111111111111111111111111";
const USDC_DECIMALS = 6;

interface TreasuryConfig {
  initialDeposit: number; // in USDC
  createNewMint: boolean;
  existingMintAddress?: string;
}

async function createUsdcMint(
  connection: anchor.web3.Connection,
  payer: Keypair
): Promise<PublicKey> {
  console.log("🏭 Creating new USDC mint (test purposes)...");

  const mint = await createMint(
    connection,
    payer,
    payer.publicKey,
    null,
    USDC_DECIMALS
  );

  console.log(`✅ USDC mint created: ${mint.toString()}`);
  return mint;
}

async function initializeTreasury(
  program: Program<Skinvault>,
  authority: Keypair,
  oraclePublicKey: PublicKey,
  usdcMint: PublicKey
): Promise<{ globalPda: PublicKey; treasuryAta: PublicKey }> {
  console.log("🏦 Initializing SkinVault treasury...");

  const [globalPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("skinvault"), authority.publicKey.toBuffer()],
    program.programId
  );

  const treasuryAta = await getAssociatedTokenAddress(
    usdcMint,
    globalPda,
    true
  );

  try {
    // Check if already initialized
    await program.account.global.fetch(globalPda);
    console.log("ℹ️  SkinVault already initialized");
    return { globalPda, treasuryAta };
  } catch (error) {
    // Not initialized, proceed with initialization
    console.log("🔨 Initializing SkinVault...");
  }

  const tx = await program.methods
    .initialize(oraclePublicKey)
    .accounts({
      global: globalPda,
      usdcMint: usdcMint,
      treasuryAta: treasuryAta,
      authority: authority.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: anchor.utils.token.ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([authority])
    .rpc();

  console.log(`✅ SkinVault initialized: ${tx}`);
  console.log(`🏦 Global PDA: ${globalPda.toString()}`);
  console.log(`💰 Treasury ATA: ${treasuryAta.toString()}`);

  return { globalPda, treasuryAta };
}

async function seedTreasury(
  connection: anchor.web3.Connection,
  program: Program<Skinvault>,
  authority: Keypair,
  usdcMint: PublicKey,
  globalPda: PublicKey,
  treasuryAta: PublicKey,
  amount: number
): Promise<string> {
  console.log(`💰 Seeding treasury with ${amount} USDC...`);

  // Create authority's USDC account if it doesn't exist
  let authorityUsdcAta: PublicKey;
  try {
    authorityUsdcAta = await getAssociatedTokenAddress(
      usdcMint,
      authority.publicKey
    );

    // Check if account exists
    await connection.getTokenAccountBalance(authorityUsdcAta);
  } catch (error) {
    // Create the account
    authorityUsdcAta = await createAssociatedTokenAccount(
      connection,
      authority,
      usdcMint,
      authority.publicKey
    );
    console.log(
      `📄 Created authority USDC ATA: ${authorityUsdcAta.toString()}`
    );
  }

  // Mint USDC to authority first
  const mintAmount = amount * Math.pow(10, USDC_DECIMALS);
  await mintTo(
    connection,
    authority,
    usdcMint,
    authorityUsdcAta,
    authority,
    mintAmount
  );
  console.log(`🏭 Minted ${amount} USDC to authority`);

  // Deposit into treasury
  const tx = await program.methods
    .depositTreasury(new anchor.BN(mintAmount))
    .accounts({
      global: globalPda,
      treasuryAta: treasuryAta,
      depositorAta: authorityUsdcAta,
      usdcMint: usdcMint,
      depositor: authority.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .signers([authority])
    .rpc();

  console.log(`✅ Treasury deposit completed: ${tx}`);
  return tx;
}

async function checkTreasuryBalance(
  connection: anchor.web3.Connection,
  treasuryAta: PublicKey
): Promise<number> {
  try {
    const balance = await connection.getTokenAccountBalance(treasuryAta);
    return balance.value.uiAmount || 0;
  } catch (error) {
    return 0;
  }
}

async function main() {
  console.log("💰 Treasury Seeder");
  console.log("==================");

  // Parse command line arguments
  const configFile = process.argv[2];
  let config: TreasuryConfig;

  if (configFile && fs.existsSync(configFile)) {
    console.log(`📁 Loading config from: ${configFile}`);
    config = JSON.parse(fs.readFileSync(configFile, "utf8"));
  } else {
    // Default configuration
    config = {
      initialDeposit: 50000, // 50,000 USDC
      createNewMint: true,
    };
    console.log("📦 Using default configuration");
  }

  console.log(`💵 Initial deposit: ${config.initialDeposit} USDC`);
  console.log(`🏭 Create new mint: ${config.createNewMint}`);

  // Setup connection and program
  const connection = new anchor.web3.Connection(RPC_URL);
  const wallet = anchor.Wallet.local();
  const provider = new anchor.AnchorProvider(connection, wallet, {});
  anchor.setProvider(provider);

  const programId = new PublicKey(PROGRAM_ID);
  const program = new Program<Skinvault>(
    JSON.parse(fs.readFileSync("target/idl/skinvault.json", "utf8")),
    programId,
    provider
  );

  const authority = wallet.payer;
  console.log(`👤 Authority: ${authority.publicKey.toString()}`);

  // Create or use existing USDC mint
  let usdcMint: PublicKey;
  if (config.createNewMint) {
    usdcMint = await createUsdcMint(connection, authority);
  } else {
    if (!config.existingMintAddress) {
      throw new Error(
        "Existing mint address required when createNewMint is false"
      );
    }
    usdcMint = new PublicKey(config.existingMintAddress);
    console.log(`💴 Using existing USDC mint: ${usdcMint.toString()}`);
  }

  // Generate oracle keypair (in production, this would be a known public key)
  const oracle = Keypair.generate();
  console.log(`🔮 Oracle: ${oracle.publicKey.toString()}`);

  try {
    // Initialize treasury
    const { globalPda, treasuryAta } = await initializeTreasury(
      program,
      authority,
      oracle.publicKey,
      usdcMint
    );

    // Check current balance
    const currentBalance = await checkTreasuryBalance(connection, treasuryAta);
    console.log(`💰 Current treasury balance: ${currentBalance} USDC`);

    // Seed treasury if needed
    if (config.initialDeposit > 0) {
      const depositTx = await seedTreasury(
        connection,
        program,
        authority,
        usdcMint,
        globalPda,
        treasuryAta,
        config.initialDeposit
      );

      const newBalance = await checkTreasuryBalance(connection, treasuryAta);
      console.log(`💰 New treasury balance: ${newBalance} USDC`);
      console.log(
        `🔗 Deposit transaction: https://explorer.solana.com/tx/${depositTx}?cluster=devnet`
      );
    }

    // Save deployment info
    const deploymentInfo = {
      programId: programId.toString(),
      authority: authority.publicKey.toString(),
      oracle: oracle.publicKey.toString(),
      usdcMint: usdcMint.toString(),
      globalPda: globalPda.toString(),
      treasuryAta: treasuryAta.toString(),
      initialDeposit: config.initialDeposit,
      deployedAt: new Date().toISOString(),
      cluster: RPC_URL.includes("devnet") ? "devnet" : "mainnet-beta",
    };

    const outputFile = `deployment_${Date.now()}.json`;
    fs.writeFileSync(outputFile, JSON.stringify(deploymentInfo, null, 2));
    console.log(`💾 Deployment info saved to: ${outputFile}`);

    console.log("\n🎉 Treasury setup complete!");
    console.log("📋 Summary:");
    console.log(`   Program ID: ${programId.toString()}`);
    console.log(`   Global PDA: ${globalPda.toString()}`);
    console.log(`   Treasury ATA: ${treasuryAta.toString()}`);
    console.log(`   USDC Mint: ${usdcMint.toString()}`);
    console.log(`   Treasury Balance: ${newBalance || currentBalance} USDC`);
  } catch (error) {
    console.error("❌ Failed to seed treasury:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { createUsdcMint, initializeTreasury, seedTreasury };
