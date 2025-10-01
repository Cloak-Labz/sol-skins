import * as anchor from "@coral-xyz/anchor";
import { BN, Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  getAssociatedTokenAddress,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { expect } from "chai";
import type { Skinvault } from "../types/skinvault";

describe("Dust3 – Skinvault E2E", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const connection = provider.connection;
  const wallet = provider.wallet as anchor.Wallet;

  const program = anchor.workspace.skinvault as Program<Skinvault>;

  // Globals
  const ORACLE = Keypair.generate().publicKey;
  const BATCH_ID_NUM = 1;
  const METADATA_URI = "ipfs://dust3-box";

  // Will be set during test
  let usdcMint: PublicKey;
  let userUsdcAta: PublicKey;
  let globalPda: PublicKey;
  let treasuryAta: PublicKey;
  let batchPda: PublicKey;
  let nftMint: PublicKey;
  let nftAta: PublicKey;
  let boxStatePda: PublicKey;
  let vrfPendingPda: PublicKey;

  const now = () => Math.floor(Date.now() / 1000);

  it("Initialize → Publish root → Mint box → Open → VRF → Assign → Price → Deposit → Sell back", async () => {
    // Ensure payer has SOL
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash();
    try {
      const sig = await connection.requestAirdrop(
        wallet.publicKey,
        2_000_000_000
      );
      await connection.confirmTransaction({
        signature: sig,
        blockhash,
        lastValidBlockHeight,
      });
    } catch (_) {}
    // Derive PDAs we need
    globalPda = PublicKey.findProgramAddressSync(
      [Buffer.from("skinvault"), wallet.publicKey.toBuffer()],
      program.programId
    )[0];

    // 1) Create a test USDC mint and fund user
    usdcMint = await createMint(
      connection,
      (wallet.payer as any) ?? (wallet as any).payer, // anchor local wallet supports payer
      wallet.publicKey,
      null,
      6
    );

    userUsdcAta = (
      await getOrCreateAssociatedTokenAccount(
        connection,
        (wallet.payer as any) ?? (wallet as any).payer,
        usdcMint,
        wallet.publicKey
      )
    ).address;

    // Mint 2,000 USDC to user
    await mintTo(
      connection,
      (wallet.payer as any) ?? (wallet as any).payer,
      usdcMint,
      userUsdcAta,
      wallet.publicKey,
      2_000n * 1_000_000n
    );

    // Treasury ATA owned by Global PDA (owner off-curve)
    treasuryAta = await getAssociatedTokenAddress(usdcMint, globalPda, true);

    // 2) Initialize program (creates Global and treasury ATA)
    await program.methods
      .initialize(ORACLE)
      .accountsStrict({
        global: globalPda,
        usdcMint,
        treasuryAta,
        authority: wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: new PublicKey(
          "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        ),
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();

    // 3) Publish Merkle root (use a constant non-zero 32-byte array, total_items=1)
    const inventoryHash = new Uint8Array(32).fill(7);
    const merkleRoot = inventoryHash; // single-leaf tree ⇒ root == leaf

    batchPda = PublicKey.findProgramAddressSync(
      [
        Buffer.from("batch"),
        Buffer.from(new BN(BATCH_ID_NUM).toArray("le", 8)),
      ],
      program.programId
    )[0];

    await program.methods
      .publishMerkleRoot(
        new BN(BATCH_ID_NUM),
        Array.from(merkleRoot) as any,
        new BN(now()),
        new BN(1)
      )
      .accountsStrict({
        global: globalPda,
        batch: batchPda,
        authority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();

    // 4) Create NFT mint (decimals 0) and mint 1 to user
    nftMint = await createMint(
      connection,
      (wallet.payer as any) ?? (wallet as any).payer,
      wallet.publicKey,
      null,
      0
    );
    nftAta = (
      await getOrCreateAssociatedTokenAccount(
        connection,
        (wallet.payer as any) ?? (wallet as any).payer,
        nftMint,
        wallet.publicKey
      )
    ).address;
    await mintTo(
      connection,
      (wallet.payer as any) ?? (wallet as any).payer,
      nftMint,
      nftAta,
      wallet.publicKey,
      1n
    );

    // 5) Mint box (creates BoxState PDA)
    boxStatePda = PublicKey.findProgramAddressSync(
      [Buffer.from("box"), nftMint.toBuffer()],
      program.programId
    )[0];

    await program.methods
      .mintBox(new BN(BATCH_ID_NUM), METADATA_URI)
      .accountsStrict({
        global: globalPda,
        batch: batchPda,
        nftMint,
        nftAta,
        boxState: boxStatePda,
        payer: wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();

    // 6) Open box (creates VrfPending PDA)
    vrfPendingPda = PublicKey.findProgramAddressSync(
      [Buffer.from("vrf_pending"), nftMint.toBuffer()],
      program.programId
    )[0];

    await program.methods
      .openBox(new BN(1))
      .accountsStrict({
        boxState: boxStatePda,
        batch: batchPda,
        vrfPending: vrfPendingPda,
        owner: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();

    // Fetch VRF pending to get request_id
    const vrfPending = await program.account.vrfPending.fetch(vrfPendingPda);
    const requestId = new BN(vrfPending.requestId);

    // 7) VRF callback (randomness can be any non-zero 32 bytes)
    const randomness = new Array(32).fill(1);
    await program.methods
      .vrfCallback(requestId, randomness as any)
      .accountsStrict({
        batch: batchPda,
        boxState: boxStatePda,
        vrfPending: vrfPendingPda,
        boxOwner: wallet.publicKey,
      } as any)
      .rpc();

    // 8) Assign inventory (empty proof works for single-leaf tree); signer is box owner
    await program.methods
      .assign(Array.from(inventoryHash) as any, [], null)
      .accountsStrict({
        batch: batchPda,
        boxState: boxStatePda,
        signer: wallet.publicKey,
      } as any)
      .rpc();

    // 9) Set price (timestamp: fresh, signature: non-zero)
    const price = 100n * 1_000_000n; // 100 USDC
    const timestamp = now() - 1;
    const fakeSig = new Array(64).fill(2);
    await program.methods
      .setPriceSigned(
        Array.from(inventoryHash) as any,
        new BN(price),
        new BN(timestamp),
        fakeSig as any
      )
      .accountsStrict({
        global: globalPda,
        priceStore: PublicKey.findProgramAddressSync(
          [Buffer.from("price"), Buffer.from(inventoryHash)],
          program.programId
        )[0],
        payer: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();

    // 10) Deposit treasury (move 1,500 USDC from user to treasury)
    await program.methods
      .depositTreasury(new BN(1_500n * 1_000_000n))
      .accountsStrict({
        global: globalPda,
        treasuryAta,
        depositorAta: userUsdcAta,
        usdcMint,
        depositor: wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      } as any)
      .rpc();

    // 11) Sell back (min price tolerance)
    const userBefore = await getAccount(connection, userUsdcAta);
    await program.methods
      .sellBack(new BN(90n * 1_000_000n))
      .accountsStrict({
        global: globalPda,
        treasuryAta,
        userAta: userUsdcAta,
        usdcMint,
        priceStore: PublicKey.findProgramAddressSync(
          [Buffer.from("price"), Buffer.from(inventoryHash)],
          program.programId
        )[0],
        boxState: boxStatePda,
        seller: wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      } as any)
      .rpc();

    const userAfter = await getAccount(connection, userUsdcAta);
    const diff =
      BigInt(userAfter.amount.toString()) -
      BigInt(userBefore.amount.toString());
    // Payout should be ~99 USDC (1% spread)
    expect(Number(diff)).to.be.greaterThan(98 * 1_000_000);

    // Sanity checks
    const box = await program.account.boxState.fetch(boxStatePda);
    expect(box.opened).to.eq(true);
    expect(
      Buffer.from(box.assignedInventory).equals(Buffer.from(inventoryHash))
    ).to.eq(true);
  });
});
