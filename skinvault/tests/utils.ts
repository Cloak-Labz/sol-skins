import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  createMint,
  createAssociatedTokenAccount,
  mintTo,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Skinvault } from "../target/types/skinvault";
import * as crypto from "crypto";

export const USDC_DECIMALS = 6;

// Seeds for PDAs
export const GLOBAL_SEED = "skinvault";
export const BATCH_SEED = "batch";
export const BOX_SEED = "box";
export const PRICE_SEED = "price";
export const VRF_PENDING_SEED = "vrf_pending";

export interface TestContext {
  program: Program<Skinvault>;
  provider: anchor.AnchorProvider;
  authority: Keypair;
  oracle: Keypair;
  user: Keypair;
  usdcMint: PublicKey;
  globalPda: PublicKey;
  treasuryAta: PublicKey;
}

export async function setupTest(): Promise<TestContext> {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Skinvault as Program<Skinvault>;

  const authority = Keypair.generate();
  const oracle = Keypair.generate();
  const user = Keypair.generate();

  // Airdrop SOL to test accounts
  await provider.connection.requestAirdrop(
    authority.publicKey,
    10 * anchor.web3.LAMPORTS_PER_SOL
  );
  await provider.connection.requestAirdrop(
    oracle.publicKey,
    2 * anchor.web3.LAMPORTS_PER_SOL
  );
  await provider.connection.requestAirdrop(
    user.publicKey,
    2 * anchor.web3.LAMPORTS_PER_SOL
  );

  // Wait for airdrops
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Create USDC mint (fake for testing)
  const usdcMint = await createMint(
    provider.connection,
    authority,
    authority.publicKey,
    null,
    USDC_DECIMALS
  );

  // Get PDAs
  const [globalPda] = PublicKey.findProgramAddressSync(
    [Buffer.from(GLOBAL_SEED), authority.publicKey.toBuffer()],
    program.programId
  );

  const treasuryAta = await getAssociatedTokenAddress(
    usdcMint,
    globalPda,
    true
  );

  return {
    program,
    provider,
    authority,
    oracle,
    user,
    usdcMint,
    globalPda,
    treasuryAta,
  };
}

export async function createUserUsdcAccount(
  ctx: TestContext,
  user: PublicKey,
  amount: number
): Promise<PublicKey> {
  const userAta = await createAssociatedTokenAccount(
    ctx.provider.connection,
    ctx.authority,
    ctx.usdcMint,
    user
  );

  await mintTo(
    ctx.provider.connection,
    ctx.authority,
    ctx.usdcMint,
    userAta,
    ctx.authority,
    amount * Math.pow(10, USDC_DECIMALS)
  );

  return userAta;
}

export async function createNftMint(
  ctx: TestContext,
  owner: Keypair
): Promise<{ mint: PublicKey; ata: PublicKey }> {
  const mint = await createMint(
    ctx.provider.connection,
    owner,
    owner.publicKey,
    null,
    0 // NFTs have 0 decimals
  );

  const ata = await createAssociatedTokenAccount(
    ctx.provider.connection,
    owner,
    mint,
    owner.publicKey
  );

  // Mint exactly 1 NFT
  await mintTo(ctx.provider.connection, owner, mint, ata, owner, 1);

  return { mint, ata };
}

export function getBatchPda(
  program: Program<Skinvault>,
  batchId: number
): PublicKey {
  const buffer = Buffer.alloc(8);
  buffer.writeUInt32LE(batchId, 0);
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from(BATCH_SEED), buffer],
    program.programId
  );
  return pda;
}

export function getBoxStatePda(
  program: Program<Skinvault>,
  nftMint: PublicKey
): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from(BOX_SEED), nftMint.toBuffer()],
    program.programId
  );
  return pda;
}

export function getPriceStorePda(
  program: Program<Skinvault>,
  inventoryHash: Buffer
): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from(PRICE_SEED), inventoryHash],
    program.programId
  );
  return pda;
}

export function getVrfPendingPda(
  program: Program<Skinvault>,
  nftMint: PublicKey
): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from(VRF_PENDING_SEED), nftMint.toBuffer()],
    program.programId
  );
  return pda;
}

export function createInventoryHash(inventoryId: string): Buffer {
  return crypto.createHash("sha256").update(inventoryId).digest();
}

export function createMerkleLeaf(
  inventoryId: string,
  metadata: string
): Buffer {
  const data = `${inventoryId}|${metadata}`;
  return crypto.createHash("sha256").update(data).digest();
}

export function buildMerkleTree(leaves: Buffer[]): {
  root: Buffer;
  proofs: Buffer[][];
} {
  if (leaves.length === 0) {
    throw new Error("Cannot build tree with no leaves");
  }

  if (leaves.length === 1) {
    return { root: leaves[0], proofs: [[]] };
  }

  let currentLevel = [...leaves];
  const proofs: Buffer[][] = leaves.map(() => []);

  while (currentLevel.length > 1) {
    const nextLevel: Buffer[] = [];

    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;

      // Store sibling for proof
      proofs[i].push(right);
      if (i + 1 < currentLevel.length) {
        proofs[i + 1].push(left);
      }

      // Create parent node (smaller hash first)
      const [a, b] =
        Buffer.compare(left, right) <= 0 ? [left, right] : [right, left];
      const parent = crypto
        .createHash("sha256")
        .update(Buffer.concat([a, b]))
        .digest();

      nextLevel.push(parent);
    }

    currentLevel = nextLevel;
  }

  return { root: currentLevel[0], proofs };
}

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function logProgramEvent(event: any, eventName: string): void {
  console.log(`\n📅 Event: ${eventName}`);
  console.log(JSON.stringify(event, null, 2));
}
