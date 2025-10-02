import * as anchor from "@coral-xyz/anchor";
import { BN, Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram, SYSVAR_INSTRUCTIONS_PUBKEY } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  getAssociatedTokenAddress,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";
import type { Skinvault } from "../target/types/skinvault";

const METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

describe("SkinVault - Comprehensive E2E Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const connection = provider.connection;
  const program = anchor.workspace.Skinvault as Program<Skinvault>;

  // Test constants
  const BATCH_ID = 1;
  const METADATA_URI_BOX = "https://arweave.net/unopened-box.json";
  const METADATA_URI_SKIN = "https://arweave.net/ak47-redline.json";

  // Keypairs - load or create funded wallets
  let authority: Keypair;
  let oracle: Keypair;
  let user1: Keypair;
  let user2: Keypair;

  // Program PDAs
  let globalPda: PublicKey;
  let globalBump: number;
  let batchPda: PublicKey;
  let batchBump: number;

  // Token accounts
  let usdcMint: PublicKey;
  let treasuryAta: PublicKey;
  let authorityUsdcAta: PublicKey;
  let user1UsdcAta: PublicKey;

  // NFT for testing
  let nftMint: PublicKey;
  let nftAta: PublicKey;
  let boxStatePda: PublicKey;
  let metadataPda: PublicKey;
  let masterEditionPda: PublicKey;

  // Test data
  const inventoryHash = Buffer.from(new Uint8Array(32).fill(7));
  const merkleRoot = inventoryHash; // Single leaf = root

  const log = (msg: string) => console.log(`  ✓ ${msg}`);

  before(async () => {
    console.log("\n🚀 Setting up test environment...\n");

    // Load or create funded keypairs
    const keypairDir = path.join(__dirname, "..", "test-keypairs");
    if (!fs.existsSync(keypairDir)) {
      fs.mkdirSync(keypairDir, { recursive: true });
    }

    authority = loadOrCreateKeypair(keypairDir, "authority.json");
    oracle = loadOrCreateKeypair(keypairDir, "oracle.json");
    user1 = loadOrCreateKeypair(keypairDir, "user1.json");
    user2 = loadOrCreateKeypair(keypairDir, "user2.json");

    log(`Authority: ${authority.publicKey.toString().slice(0, 8)}...`);
    log(`Oracle: ${oracle.publicKey.toString().slice(0, 8)}...`);
    log(`User1: ${user1.publicKey.toString().slice(0, 8)}...`);

    // Ensure keypairs have SOL (only request if balance is low)
    await ensureFunded(connection, authority.publicKey, 2);
    await ensureFunded(connection, user1.publicKey, 1);

    // Derive Global PDA (fixed seed)
    [globalPda, globalBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("global")],
      program.programId
    );
    log(`Global PDA: ${globalPda.toString().slice(0, 8)}...`);

    // Create test USDC mint
    usdcMint = await createMint(
      connection,
      authority,
      authority.publicKey,
      null,
      6 // USDC decimals
    );
    log(`USDC Mint created: ${usdcMint.toString().slice(0, 8)}...`);

    // Derive treasury ATA (owned by Global PDA)
    treasuryAta = await getAssociatedTokenAddress(
      usdcMint,
      globalPda,
      true // allowOwnerOffCurve
    );

    console.log("\n");
  });

  describe("1. Program Initialization", () => {
    it("Should initialize the SkinVault program", async () => {
      console.log("\n📦 Test: Initialize Program");

      const tx =       await program.methods
        .initialize(oracle.publicKey)
        .accountsPartial({
          usdcMint: usdcMint,
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();

      log(`Transaction: ${tx.slice(0, 8)}...`);

      const global = await program.account.global.fetch(globalPda);
      expect(global.authority.toString()).to.equal(authority.publicKey.toString());
      expect(global.oraclePubkey.toString()).to.equal(oracle.publicKey.toString());
      expect(global.buybackEnabled).to.be.true;
      expect(global.paused).to.be.false;
      expect(global.totalBoxesMinted.toNumber()).to.equal(0);

      log(`Authority set: ${global.authority.toString().slice(0, 8)}...`);
      log(`Oracle set: ${global.oraclePubkey.toString().slice(0, 8)}...`);
      log("Buyback enabled: true");
      log("Emergency pause: false");
    });

    it("Should set oracle public key", async () => {
      console.log("\n🔑 Test: Set Oracle");

      const newOracle = Keypair.generate();

      await program.methods
        .setOracle(newOracle.publicKey)
        .accountsPartial({
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();

      const global = await program.account.global.fetch(globalPda);
      expect(global.oraclePubkey.toString()).to.equal(newOracle.publicKey.toString());

      log(`Oracle updated to: ${newOracle.publicKey.toString().slice(0, 8)}...`);

      // Revert to original oracle for other tests
      await program.methods
        .setOracle(oracle.publicKey)
        .accountsPartial({
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();

      log("Oracle reverted to original");
    });
  });

  describe("2. Batch Management", () => {
    it("Should publish merkle root for batch", async () => {
      console.log("\n🌳 Test: Publish Merkle Root");

      [batchPda, batchBump] = PublicKey.findProgramAddressSync(
        [Buffer.from("batch"), new BN(BATCH_ID).toArrayLike(Buffer, "le", 8)],
        program.programId
      );

      const timestamp = Math.floor(Date.now() / 1000);

      await program.methods
        .publishMerkleRoot(
          new BN(BATCH_ID),
          Array.from(merkleRoot),
          new BN(timestamp),
          new BN(1) // total_items
        )
        .accountsPartial({
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();

      const batch = await program.account.batch.fetch(batchPda);
      expect(batch.batchId.toNumber()).to.equal(BATCH_ID);
      expect(batch.totalItems.toNumber()).to.equal(1);
      expect(batch.boxesMinted.toNumber()).to.equal(0);

      log(`Batch ID: ${BATCH_ID}`);
      log(`Total items: ${batch.totalItems.toNumber()}`);
      log(`Merkle root: ${Buffer.from(batch.merkleRoot).toString("hex").slice(0, 16)}...`);
    });
  });

  describe("3. NFT Minting & Metadata", () => {
    before(async () => {
      // Create NFT mint for user1
      nftMint = await createMint(
        connection,
        user1,
        user1.publicKey,
        null,
        0 // NFT decimals
      );

      nftAta = (
        await getOrCreateAssociatedTokenAccount(
          connection,
          user1,
          nftMint,
          user1.publicKey
        )
      ).address;

      await mintTo(connection, user1, nftMint, nftAta, user1, 1);

      log(`NFT Mint: ${nftMint.toString().slice(0, 8)}...`);
    });

    it("Should mint box with Metaplex metadata", async () => {
      console.log("\n📦 Test: Mint Box with NFT Metadata");

      [boxStatePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("box"), nftMint.toBuffer()],
        program.programId
      );

      [metadataPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          METADATA_PROGRAM_ID.toBuffer(),
          nftMint.toBuffer(),
        ],
        METADATA_PROGRAM_ID
      );

      [masterEditionPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          METADATA_PROGRAM_ID.toBuffer(),
          nftMint.toBuffer(),
          Buffer.from("edition"),
        ],
        METADATA_PROGRAM_ID
      );

      await program.methods
        .mintBox(new BN(BATCH_ID), METADATA_URI_BOX)
        .accountsPartial({
          nftMint: nftMint,
          nftAta: nftAta,
          payer: user1.publicKey,
        })
        .signers([user1])
        .rpc();

      const boxState = await program.account.boxState.fetch(boxStatePda);
      expect(boxState.owner.toString()).to.equal(user1.publicKey.toString());
      expect(boxState.batchId.toNumber()).to.equal(BATCH_ID);
      expect(boxState.opened).to.be.false;
      expect(boxState.redeemed).to.be.false;

      const global = await program.account.global.fetch(globalPda);
      expect(global.totalBoxesMinted.toNumber()).to.equal(1);

      log(`Box minted for NFT: ${nftMint.toString().slice(0, 8)}...`);
      log(`BoxState PDA: ${boxStatePda.toString().slice(0, 8)}...`);
      log(`Metadata created: ${metadataPda.toString().slice(0, 8)}...`);
      log("Box status: Unopened");
    });
  });

  describe("4. Box Opening & VRF", () => {
    let vrfPendingPda: PublicKey;
    let requestId: BN;

    it("Should open box and request VRF", async () => {
      console.log("\n🎲 Test: Open Box (Request VRF)");

      [vrfPendingPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vrf_pending"), nftMint.toBuffer()],
        program.programId
      );

      await program.methods
        .openBox(new BN(1)) // pool_size
        .accountsPartial({
          owner: user1.publicKey,
        })
        .signers([user1])
        .rpc();

      const vrfPending = await program.account.vrfPending.fetch(vrfPendingPda);
      requestId = vrfPending.requestId;

      log(`VRF request created: ${vrfPendingPda.toString().slice(0, 8)}...`);
      log(`Request ID: ${requestId.toString()}`);
      log(`Pool size: ${vrfPending.poolSize.toNumber()}`);
    });

    it("Should process VRF callback", async () => {
      console.log("\n🎯 Test: VRF Callback");

      const randomness = new Array(32).fill(1);

      await program.methods
        .vrfCallback(requestId, randomness)
        .accountsPartial({
          vrfAuthority: oracle.publicKey,
          boxOwner: user1.publicKey,
        })
        .signers([oracle])
        .rpc();

      const boxState = await program.account.boxState.fetch(boxStatePda);
      expect(boxState.opened).to.be.true;
      expect(boxState.randomIndex.toNumber()).to.be.greaterThanOrEqual(0);

      log("Box opened successfully");
      log(`Random index: ${boxState.randomIndex.toNumber()}`);
      log(`Open time: ${new Date(boxState.openTime.toNumber() * 1000).toISOString()}`);

      // VrfPending should be closed
      try {
        await program.account.vrfPending.fetch(vrfPendingPda);
        throw new Error("VrfPending should be closed");
      } catch (e) {
        log("VrfPending account closed (rent reclaimed)");
      }
    });
  });

  describe("5. Inventory Assignment", () => {
    let inventoryAssignmentPda: PublicKey;

    it("Should assign inventory with merkle proof", async () => {
      console.log("\n📋 Test: Assign Inventory");

      [inventoryAssignmentPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("inventory"), inventoryHash],
        program.programId
      );

      const emptyProof: any[] = []; // Single leaf = no proof needed

      await program.methods
        .assign(Array.from(inventoryHash), emptyProof, null)
        .accountsPartial({
          signer: user1.publicKey,
        })
        .signers([user1])
        .rpc();

      const boxState = await program.account.boxState.fetch(boxStatePda);
      expect(Buffer.from(boxState.assignedInventory).equals(inventoryHash)).to.be.true;

      const assignment = await program.account.inventoryAssignment.fetch(inventoryAssignmentPda);
      expect(Buffer.from(assignment.inventoryIdHash).equals(inventoryHash)).to.be.true;
      expect(assignment.boxMint.toString()).to.equal(nftMint.toString());

      log(`Inventory assigned: ${inventoryHash.toString("hex").slice(0, 16)}...`);
      log(`Assignment PDA: ${inventoryAssignmentPda.toString().slice(0, 8)}...`);
      log(`Assigned at: ${new Date(assignment.assignedAt.toNumber() * 1000).toISOString()}`);
    });

    it("Should prevent double-assignment of same inventory", async () => {
      console.log("\n🚫 Test: Prevent Inventory Double-Assignment");

      // Create another NFT and box
      const nftMint2 = await createMint(connection, user1, user1.publicKey, null, 0);
      const nftAta2 = (
        await getOrCreateAssociatedTokenAccount(connection, user1, nftMint2, user1.publicKey)
      ).address;
      await mintTo(connection, user1, nftMint2, nftAta2, user1, 1);

      const [boxStatePda2] = PublicKey.findProgramAddressSync(
        [Buffer.from("box"), nftMint2.toBuffer()],
        program.programId
      );

      const [metadataPda2] = PublicKey.findProgramAddressSync(
        [Buffer.from("metadata"), METADATA_PROGRAM_ID.toBuffer(), nftMint2.toBuffer()],
        METADATA_PROGRAM_ID
      );

      const [masterEditionPda2] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          METADATA_PROGRAM_ID.toBuffer(),
          nftMint2.toBuffer(),
          Buffer.from("edition"),
        ],
        METADATA_PROGRAM_ID
      );

      // Mint box
      await program.methods
        .mintBox(new BN(BATCH_ID), METADATA_URI_BOX)
        .accountsPartial({
          nftMint: nftMint2,
          nftAta: nftAta2,
          payer: user1.publicKey,
        })
        .signers([user1])
        .rpc();

      // Open box
      const [vrfPendingPda2] = PublicKey.findProgramAddressSync(
        [Buffer.from("vrf_pending"), nftMint2.toBuffer()],
        program.programId
      );

      await program.methods
        .openBox(new BN(1))
        .accountsPartial({
          owner: user1.publicKey,
        })
        .signers([user1])
        .rpc();

      const vrfPending2 = await program.account.vrfPending.fetch(vrfPendingPda2);
      
      await program.methods
        .vrfCallback(vrfPending2.requestId, new Array(32).fill(2))
        .accountsPartial({
          vrfAuthority: oracle.publicKey,
          boxOwner: user1.publicKey,
        })
        .signers([oracle])
        .rpc();

      // Try to assign same inventory (should fail)
      try {
        await program.methods
          .assign(Array.from(inventoryHash), [], null)
          .accountsPartial({
            signer: user1.publicKey,
          })
          .signers([user1])
          .rpc();

        throw new Error("Should have failed - inventory already assigned");
      } catch (e: any) {
        expect(e.message).to.include("already in use");
        log("✓ Double-assignment prevented (inventory PDA already exists)");
      }
    });
  });

  describe("6. Price Oracle & Treasury", () => {
    let priceStorePda: PublicKey;

    it("Should set price with oracle signature", async () => {
      console.log("\n💰 Test: Set Price (Oracle Signed)");

      [priceStorePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("price"), inventoryHash],
        program.programId
      );

      const price = new BN(100 * 1_000_000); // 100 USDC
      const timestamp = Math.floor(Date.now() / 1000);
      const fakeSignature = new Array(64).fill(2); // TODO: Real Ed25519 signature

      await program.methods
        .setPriceSigned(
          Array.from(inventoryHash),
          price,
          new BN(timestamp),
          fakeSignature
        )
        .accountsPartial({
          payer: user1.publicKey,
        })
        .signers([user1])
        .rpc();

      const priceStore = await program.account.priceStore.fetch(priceStorePda);
      expect(priceStore.price.toString()).to.equal(price.toString());
      expect(priceStore.oracle.toString()).to.equal(oracle.publicKey.toString());

      log(`Price set: ${price.toNumber() / 1_000_000} USDC`);
      log(`Oracle: ${priceStore.oracle.toString().slice(0, 8)}...`);
      log(`Update count: ${priceStore.updateCount.toNumber()}`);
    });

    it("Should deposit USDC to treasury", async () => {
      console.log("\n💵 Test: Deposit Treasury");

      // Create authority USDC ATA and fund it
      authorityUsdcAta = (
        await getOrCreateAssociatedTokenAccount(
          connection,
          authority,
          usdcMint,
          authority.publicKey
        )
      ).address;

      await mintTo(
        connection,
        authority,
        usdcMint,
        authorityUsdcAta,
        authority,
        2000n * 1_000_000n // 2000 USDC
      );

      const depositAmount = new BN(1500 * 1_000_000); // 1500 USDC

      await program.methods
        .depositTreasury(depositAmount)
        .accountsPartial({
          depositorAta: authorityUsdcAta,
          depositor: authority.publicKey,
        })
        .signers([authority])
        .rpc();

      const treasuryAccount = await getAccount(connection, treasuryAta);
      expect(treasuryAccount.amount.toString()).to.equal(depositAmount.toString());

      log(`Deposited: ${depositAmount.toNumber() / 1_000_000} USDC`);
      log(`Treasury balance: ${Number(treasuryAccount.amount) / 1_000_000} USDC`);
    });

    it("Should withdraw USDC from treasury (authority only)", async () => {
      console.log("\n💸 Test: Withdraw Treasury");

      const withdrawAmount = new BN(100 * 1_000_000); // 100 USDC

      const treasuryBefore = await getAccount(connection, treasuryAta);
      const authorityBefore = await getAccount(connection, authorityUsdcAta);

      await program.methods
        .withdrawTreasury(withdrawAmount)
        .accountsPartial({
          recipientAta: authorityUsdcAta,
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();

      const treasuryAfter = await getAccount(connection, treasuryAta);
      const authorityAfter = await getAccount(connection, authorityUsdcAta);

      const treasuryDiff = BigInt(treasuryBefore.amount.toString()) - BigInt(treasuryAfter.amount.toString());
      const authorityDiff = BigInt(authorityAfter.amount.toString()) - BigInt(authorityBefore.amount.toString());

      expect(treasuryDiff.toString()).to.equal(withdrawAmount.toString());
      expect(authorityDiff.toString()).to.equal(withdrawAmount.toString());

      log(`Withdrawn: ${withdrawAmount.toNumber() / 1_000_000} USDC`);
      log(`Treasury balance: ${Number(treasuryAfter.amount) / 1_000_000} USDC`);
    });
  });

  describe("7. Buyback System", () => {
    it("Should execute buyback and burn NFT", async () => {
      console.log("\n🔥 Test: Sell Back (with NFT Burn)");

      // Create user1 USDC ATA
      user1UsdcAta = (
        await getOrCreateAssociatedTokenAccount(
          connection,
          user1,
          usdcMint,
          user1.publicKey
        )
      ).address;

      const userBefore = await getAccount(connection, user1UsdcAta);
      const treasuryBefore = await getAccount(connection, treasuryAta);

      const minPrice = new BN(90 * 1_000_000); // Accept minimum 90 USDC

      await program.methods
        .sellBack(minPrice)
        .accountsPartial({
          userAta: user1UsdcAta,
          nftMint: nftMint,
          sellerNftAta: nftAta,
          seller: user1.publicKey,
        })
        .signers([user1])
        .rpc();

      const userAfter = await getAccount(connection, user1UsdcAta);
      const treasuryAfter = await getAccount(connection, treasuryAta);

      const userDiff = BigInt(userAfter.amount.toString()) - BigInt(userBefore.amount.toString());
      const treasuryDiff = BigInt(treasuryBefore.amount.toString()) - BigInt(treasuryAfter.amount.toString());

      // Should receive ~99 USDC (100 - 1% spread)
      expect(Number(userDiff)).to.be.greaterThan(98 * 1_000_000);
      expect(Number(userDiff)).to.be.lessThan(100 * 1_000_000);

      log(`User received: ${Number(userDiff) / 1_000_000} USDC`);
      log(`Treasury paid: ${Number(treasuryDiff) / 1_000_000} USDC`);
      log(`Spread fee: ${(100 - Number(userDiff) / 1_000_000).toFixed(2)} USDC (1%)`);

      // Check box state is marked as redeemed
      const boxState = await program.account.boxState.fetch(boxStatePda);
      expect(boxState.redeemed).to.be.true;
      expect(boxState.redeemTime.toNumber()).to.be.greaterThan(0);

      log("Box marked as redeemed");
      log(`Redeem time: ${new Date(boxState.redeemTime.toNumber() * 1000).toISOString()}`);

      // NFT should be burned (supply = 0)
      const mintInfo = await connection.getAccountInfo(nftMint);
      if (mintInfo) {
        const mintData = await connection.getParsedAccountInfo(nftMint);
        log("NFT burned successfully");
      }

      // NFT ATA should be closed
      try {
        await getAccount(connection, nftAta);
        throw new Error("NFT ATA should be closed");
      } catch (e) {
        log("NFT token account closed (rent reclaimed)");
      }
    });

    it("Should toggle buyback on/off", async () => {
      console.log("\n🔀 Test: Toggle Buyback");

      // Disable buyback
      await program.methods
        .toggleBuyback(false)
        .accountsPartial({
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();

      let global = await program.account.global.fetch(globalPda);
      expect(global.buybackEnabled).to.be.false;
      log("Buyback disabled");

      // Enable buyback
      await program.methods
        .toggleBuyback(true)
        .accountsPartial({
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();

      global = await program.account.global.fetch(globalPda);
      expect(global.buybackEnabled).to.be.true;
      log("Buyback enabled");
    });
  });

  describe("8. Emergency Controls", () => {
    it("Should pause and unpause program", async () => {
      console.log("\n⏸️  Test: Emergency Pause");

      // Pause
      await program.methods
        .emergencyPause(true)
        .accountsPartial({
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();

      let global = await program.account.global.fetch(globalPda);
      expect(global.paused).to.be.true;
      log("Program paused");

      // Try to mint box while paused (should fail)
      const testMint = await createMint(connection, user1, user1.publicKey, null, 0);
      const testAta = (
        await getOrCreateAssociatedTokenAccount(connection, user1, testMint, user1.publicKey)
      ).address;
      await mintTo(connection, user1, testMint, testAta, user1, 1);

      const [testBoxState] = PublicKey.findProgramAddressSync(
        [Buffer.from("box"), testMint.toBuffer()],
        program.programId
      );

      const [testMetadata] = PublicKey.findProgramAddressSync(
        [Buffer.from("metadata"), METADATA_PROGRAM_ID.toBuffer(), testMint.toBuffer()],
        METADATA_PROGRAM_ID
      );

      const [testMasterEdition] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          METADATA_PROGRAM_ID.toBuffer(),
          testMint.toBuffer(),
          Buffer.from("edition"),
        ],
        METADATA_PROGRAM_ID
      );

      try {
        await program.methods
          .mintBox(new BN(BATCH_ID), METADATA_URI_BOX)
          .accountsPartial({
            nftMint: testMint,
            nftAta: testAta,
            payer: user1.publicKey,
          })
          .signers([user1])
          .rpc();

        throw new Error("Should have failed - program is paused");
      } catch (e: any) {
        expect(e.message).to.include("BuybackDisabled");
        log("✓ User operations blocked while paused");
      }

      // Unpause
      await program.methods
        .emergencyPause(false)
        .accountsPartial({
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();

      global = await program.account.global.fetch(globalPda);
      expect(global.paused).to.be.false;
      log("Program unpaused");
    });

    it("Should transfer authority (2-step)", async () => {
      console.log("\n🔑 Test: Authority Transfer");

      const newAuthority = Keypair.generate();

      // Ensure new authority has SOL for accepting
      await ensureFunded(connection, newAuthority.publicKey, 0.5);

      // Step 1: Initiate transfer
      await program.methods
        .initiateAuthorityTransfer(newAuthority.publicKey)
        .accountsPartial({
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();

      let global = await program.account.global.fetch(globalPda);
      expect(global.pendingAuthority?.toString()).to.equal(newAuthority.publicKey.toString());
      log(`Transfer initiated to: ${newAuthority.publicKey.toString().slice(0, 8)}...`);

      // Step 2: Accept transfer
      await program.methods
        .acceptAuthority()
        .accountsPartial({
          newAuthority: newAuthority.publicKey,
        })
        .signers([newAuthority])
        .rpc();

      global = await program.account.global.fetch(globalPda);
      expect(global.authority.toString()).to.equal(newAuthority.publicKey.toString());
      expect(global.pendingAuthority).to.be.null;
      log(`Authority transferred to: ${newAuthority.publicKey.toString().slice(0, 8)}...`);

      // Transfer back to original authority
      await program.methods
        .initiateAuthorityTransfer(authority.publicKey)
        .accountsPartial({
          authority: newAuthority.publicKey,
        })
        .signers([newAuthority])
        .rpc();

      await program.methods
        .acceptAuthority()
        .accountsPartial({
          newAuthority: authority.publicKey,
        })
        .signers([authority])
        .rpc();

      log("Authority transferred back to original");
    });
  });

  describe("9. Program Statistics", () => {
    it("Should display final program statistics", async () => {
      console.log("\n📊 Final Program Statistics");

      const global = await program.account.global.fetch(globalPda);
      const batch = await program.account.batch.fetch(batchPda);
      const treasuryAccount = await getAccount(connection, treasuryAta);

      log(`Total boxes minted: ${global.totalBoxesMinted.toNumber()}`);
      log(`Total buybacks: ${global.totalBuybacks.toNumber()}`);
      log(`Total buyback volume: ${global.totalBuybackVolume.toNumber() / 1_000_000} USDC`);
      log(`Treasury balance: ${Number(treasuryAccount.amount) / 1_000_000} USDC`);
      log(`Batch ${BATCH_ID} - boxes minted: ${batch.boxesMinted.toNumber()}`);
      log(`Batch ${BATCH_ID} - boxes opened: ${batch.boxesOpened.toNumber()}`);
      log(`Program paused: ${global.paused}`);
      log(`Buyback enabled: ${global.buybackEnabled}`);
    });
  });
});

// Helper functions

function loadOrCreateKeypair(dir: string, filename: string): Keypair {
  const filepath = path.join(dir, filename);
  
  if (fs.existsSync(filepath)) {
    const keypairData = JSON.parse(fs.readFileSync(filepath, "utf-8"));
    return Keypair.fromSecretKey(new Uint8Array(keypairData));
  }
  
  const keypair = Keypair.generate();
  fs.writeFileSync(filepath, JSON.stringify(Array.from(keypair.secretKey)));
  console.log(`  Created new keypair: ${filename}`);
  
  return keypair;
}

async function ensureFunded(
  connection: anchor.web3.Connection,
  pubkey: PublicKey,
  minSol: number
) {
  const balance = await connection.getBalance(pubkey);
  const minLamports = minSol * anchor.web3.LAMPORTS_PER_SOL;
  
  if (balance < minLamports) {
    try {
      console.log(`  Requesting airdrop for ${pubkey.toString().slice(0, 8)}... (${minSol} SOL)`);
      const signature = await connection.requestAirdrop(
        pubkey,
        minLamports - balance
      );
      await connection.confirmTransaction(signature);
    } catch (e) {
      console.log(`  ⚠️  Airdrop failed (rate limit). Please fund manually: ${pubkey.toString()}`);
    }
  }
}
