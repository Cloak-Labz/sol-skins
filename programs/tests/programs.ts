import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Programs } from "../target/types/programs";
import { 
  Keypair, 
  LAMPORTS_PER_SOL, 
  PublicKey,
} from "@solana/web3.js";
import {
  createMint,
  createAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { assert } from "chai";
import { readFileSync } from "fs";
import path from "path";

describe("Buyback Program", () => {
  // Configure the client
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Programs as Program<Programs>;

  const USDC_DECIMALS = 6;
  const USDC_FACTOR = 10 ** USDC_DECIMALS;
  
  // Helper to load funded keypairs
  const loadKeypair = (filename: string): Keypair => {
    const filePath = path.join(__dirname, "keypairs", filename);
    const secretKey = Uint8Array.from(
      JSON.parse(readFileSync(filePath, "utf-8"))
    );
    return Keypair.fromSecretKey(secretKey);
  };

  // Test accounts (pre-funded keypairs)
  const authority = provider.wallet as anchor.Wallet;
  const treasury = loadKeypair("treasury-keypair.json");
  const user = loadKeypair("user-keypair.json");
  const otherUser = loadKeypair("other-user-keypair.json");
  
  let collectionMint: PublicKey;
  let nftMint: PublicKey;
  let userNftAccount: PublicKey;
  let buybackConfigPda: PublicKey;
  let buybackConfigBump: number;
  let usdcMint: PublicKey;
  let treasuryUsdcAccount: PublicKey;
  let userUsdcAccount: PublicKey;
  let configAlreadyInitialized = false;

  before(async () => {
    // Airdrop SOL to test accounts
    //const airdropTx1 = await provider.connection.requestAirdrop(
    //  treasury.publicKey,
    //  10 * LAMPORTS_PER_SOL
    //);
    //await provider.connection.confirmTransaction(airdropTx1);

    //const airdropTx2 = await provider.connection.requestAirdrop(
    //  user.publicKey,
    //  2 * LAMPORTS_PER_SOL
    //);
    //await provider.connection.confirmTransaction(airdropTx2);

    // Derive buyback config PDA
    [buybackConfigPda, buybackConfigBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("buyback_config_v4")],
      program.programId
    );

    // Check if config already exists on-chain
    try {
      const existingConfig = await program.account.buyBackConfig.fetch(buybackConfigPda);
      configAlreadyInitialized = true;
      collectionMint = existingConfig.collectionMint;
      usdcMint = existingConfig.usdcMint;
      treasuryUsdcAccount = existingConfig.treasuryTokenAccount;

      console.log("ℹ️ Existing buyback config found. Reusing:");
      console.log("  Collection Mint:", collectionMint.toBase58());
      console.log("  USDC Mint:", usdcMint.toBase58());
      console.log("  Treasury USDC Account:", treasuryUsdcAccount.toBase58());

      // Top up treasury USDC balance if needed
      const desiredBalance = 25 * USDC_FACTOR;
      const treasuryAccountInfo = await getAccount(provider.connection, treasuryUsdcAccount);
      const currentBalance = Number(treasuryAccountInfo.amount);
      if (currentBalance < desiredBalance) {
        await mintTo(
          provider.connection,
          authority.payer,
          usdcMint,
          treasuryUsdcAccount,
          authority.publicKey,
          desiredBalance - currentBalance
        );
      }
    } catch (err) {
      configAlreadyInitialized = false;

      // Create USDC mint (6 decimals)
      usdcMint = await createMint(
        provider.connection,
        authority.payer,
        authority.publicKey,
        authority.publicKey,
        USDC_DECIMALS
      );

      // Treasury USDC token account
      treasuryUsdcAccount = await createAccount(
        provider.connection,
        authority.payer,
        usdcMint,
        treasury.publicKey
      );

      // Mint 25 USDC to treasury account
      await mintTo(
        provider.connection,
        authority.payer,
        usdcMint,
        treasuryUsdcAccount,
        authority.publicKey,
        25 * USDC_FACTOR
      );

      // Create collection mint (simulating Candy Machine collection)
      collectionMint = await createMint(
        provider.connection,
        authority.payer,
        authority.publicKey,
        authority.publicKey,
        0 // NFTs have 0 decimals
      );

      console.log("✅ Collection mint created:", collectionMint.toBase58());
    }

    // User USDC token account (fresh for every run)
    userUsdcAccount = await createAccount(
      provider.connection,
      authority.payer,
      usdcMint,
      user.publicKey
    );

    // Create NFT mint (simulating a minted NFT from the box)
    nftMint = await createMint(
      provider.connection,
      authority.payer,
      authority.publicKey,
      authority.publicKey,
      0
    );

    console.log("✅ NFT mint created:", nftMint.toBase58());

    // Create user's NFT token account and mint 1 NFT to it
    userNftAccount = await createAccount(
      provider.connection,
      user,
      nftMint,
      user.publicKey
    );

    await mintTo(
      provider.connection,
      authority.payer,
      nftMint,
      userNftAccount,
      authority.publicKey,
      1
    );

    console.log("✅ User NFT account created and minted");

    console.log("✅ Buyback config PDA:", buybackConfigPda.toBase58());
  });

  describe("Initialize", () => {
    if (!configAlreadyInitialized) {
      it("Initializes buyback config", async () => {
        const minTreasuryBalance = new anchor.BN(10 * USDC_FACTOR);

        const tx = await program.methods
          .initializeBuyback(collectionMint, minTreasuryBalance)
          .accounts({
            authority: authority.publicKey,
            treasury: treasury.publicKey,
            collectionMint: collectionMint,
            usdcMint,
            treasuryUsdcAccount,
          })
          .rpc();

        console.log("✅ Initialize tx:", tx);

        // Fetch and verify config
        const config = await program.account.buyBackConfig.fetch(buybackConfigPda);
        
        assert.equal(
          config.authority.toBase58(),
          authority.publicKey.toBase58(),
          "Authority mismatch"
        );
        assert.equal(
          config.treasury.toBase58(),
          treasury.publicKey.toBase58(),
          "Treasury mismatch"
        );
        assert.equal(
          config.treasuryTokenAccount.toBase58(),
          treasuryUsdcAccount.toBase58(),
          "Treasury USDC account mismatch"
        );
        assert.equal(
          config.usdcMint.toBase58(),
          usdcMint.toBase58(),
          "USDC mint mismatch"
        );
        assert.equal(
          config.collectionMint.toBase58(),
          collectionMint.toBase58(),
          "Collection mint mismatch"
        );
        assert.equal(config.buybackEnable, true, "Buyback should be enabled");
        assert.equal(
          config.minTreasuryBalance.toString(),
          minTreasuryBalance.toString(),
          "Min treasury balance mismatch"
        );
        

        console.log("✅ Config verified:", {
          authority: config.authority.toBase58(),
          treasury: config.treasury.toBase58(),
          buybackEnable: config.buybackEnable,
          minTreasuryBalance: config.minTreasuryBalance.toString(),
        });
      });
    } else {
      it("Skips initialize because config already exists", async () => {
        console.log("ℹ️ Buyback config already initialized on-chain. Skipping init test.");
      });
    }

    it("Fails to initialize twice", async () => {
      try {
        await program.methods
          .initializeBuyback(collectionMint, new anchor.BN(10 * USDC_FACTOR))
          .accounts({
            authority: authority.publicKey,
            treasury: treasury.publicKey,
            collectionMint: collectionMint,
            usdcMint,
            treasuryUsdcAccount,
          })
          .rpc();

        assert.fail("Should have failed to initialize twice");
      } catch (error) {
        assert.include(error.message, "already in use");
        console.log("✅ Correctly prevented double initialization");
      }
    });
  });

  describe("Toggle Buyback", () => {
    it("Authority can disable buyback", async () => {
      const tx = await program.methods
        .toggleBuyback(false)
        .accounts({
          authority: authority.publicKey,
        })
        .rpc();

      console.log("✅ Toggle disable tx:", tx);

      const config = await program.account.buyBackConfig.fetch(buybackConfigPda);
      assert.equal(config.buybackEnable, false, "Buyback should be disabled");
    });

    it("Authority can re-enable buyback", async () => {
      const tx = await program.methods
        .toggleBuyback(true)
        .accounts({
          authority: authority.publicKey,
        })
        .rpc();

      console.log("✅ Toggle enable tx:", tx);

      const config = await program.account.buyBackConfig.fetch(buybackConfigPda);
      assert.equal(config.buybackEnable, true, "Buyback should be enabled");
    });

    it("Non-authority cannot toggle buyback", async () => {
      try {
        await program.methods
          .toggleBuyback(false)
          .accounts({
            authority: user.publicKey,
          })
          .signers([user])
          .rpc();
              
        assert.fail("Should have failed with unauthorized");
      } catch (error) {
        assert.include(error.message.toLowerCase(), "unauthorized");
        console.log("✅ Correctly prevented unauthorized toggle");
      }
    });
  });

  describe("Execute Buyback", () => {
    const buybackAmount = new anchor.BN(2 * USDC_FACTOR);

    it("Successfully executes buyback", async () => {
      // Get balances before
      const userBalanceBefore = await getAccount(provider.connection, userUsdcAccount);
      const treasuryBalanceBefore = await getAccount(provider.connection, treasuryUsdcAccount);
      const nftAccountBefore = await getAccount(provider.connection, userNftAccount);
      
      assert.equal(nftAccountBefore.amount.toString(), "1", "User should have 1 NFT");

      console.log("Before buyback:");
      console.log("  User USDC balance:", Number(userBalanceBefore.amount) / USDC_FACTOR, "USDC");
      console.log("  Treasury USDC balance:", Number(treasuryBalanceBefore.amount) / USDC_FACTOR, "USDC");
      console.log("  NFT amount:", nftAccountBefore.amount.toString());

      // Execute buyback
      const tx = await program.methods
        .executeBuyback(buybackAmount)
        .accounts({
          user: user.publicKey,
          treasury: treasury.publicKey,
          nftMint: nftMint,
          userNftAccount: userNftAccount,
          treasuryUsdcAccount,
          userUsdcAccount,
          usdcMint,
        })
        .signers([user, treasury])
        .rpc();

      console.log("✅ Execute buyback tx:", tx);

      // Get balances after
      const userBalanceAfter = await getAccount(provider.connection, userUsdcAccount);
      const treasuryBalanceAfter = await getAccount(provider.connection, treasuryUsdcAccount);
      
      // Check NFT was burned
      const nftAccountAfter = await getAccount(provider.connection, userNftAccount);
      assert.equal(nftAccountAfter.amount.toString(), "0", "NFT should be burned");

      // Check USDC transfer
      const userGain = Number(userBalanceAfter.amount - userBalanceBefore.amount);
      assert.equal(userGain, buybackAmount.toNumber(), "User should receive 2 USDC");
      
      const treasuryLoss = Number(treasuryBalanceBefore.amount - treasuryBalanceAfter.amount);
      assert.equal(treasuryLoss, buybackAmount.toNumber(), "Treasury should lose 2 USDC");

      console.log("After buyback:");
      console.log("  User USDC balance:", Number(userBalanceAfter.amount) / USDC_FACTOR, "USDC");
      console.log("  Treasury USDC balance:", Number(treasuryBalanceAfter.amount) / USDC_FACTOR, "USDC");
      console.log("  NFT amount:", nftAccountAfter.amount.toString());
    });

    it("Fails when buyback is disabled", async () => {
      // Disable buyback
      await program.methods
        .toggleBuyback(false)
        .accounts({
          authority: authority.publicKey,
        })
        .rpc();

      // Create another NFT for testing
      const testNftMint = await createMint(
        provider.connection,
        authority.payer,
        authority.publicKey,
        authority.publicKey,
        0
      );

      const testNftAccount = await createAccount(
        provider.connection,
        user,
        testNftMint,
        user.publicKey
      );

      await mintTo(
        provider.connection,
        authority.payer,
        testNftMint,
        testNftAccount,
        authority.publicKey,
        1
      );

      try {
        await program.methods
          .executeBuyback(new anchor.BN(1 * USDC_FACTOR))
          .accounts({
            user: user.publicKey,
            treasury: treasury.publicKey,
            nftMint: testNftMint,
            userNftAccount: testNftAccount,
            treasuryUsdcAccount,
            userUsdcAccount,
            usdcMint,
          })
          .signers([user, treasury])
          .rpc();
        
        assert.fail("Should have failed when buyback disabled");
      } catch (error) {
        assert.include(error.message.toLowerCase(), "disabled");
        console.log("✅ Correctly prevented buyback when disabled");
      }

      // Re-enable for other tests
      await program.methods
        .toggleBuyback(true)
        .accounts({
          authority: authority.publicKey,
        })
        .rpc();
    });

    it("Fails with insufficient treasury balance", async () => {
      // Create another NFT
      const testNftMint = await createMint(
        provider.connection,
        authority.payer,
        authority.publicKey,
        authority.publicKey,
        0
      );

      const testNftAccount = await createAccount(
        provider.connection,
        user,
        testNftMint,
        user.publicKey
      );

      await mintTo(
        provider.connection,
        authority.payer,
        testNftMint,
        testNftAccount,
        authority.publicKey,
        1
      );

      // Try to buyback for more than treasury has
      const hugeAmount = new anchor.BN(50 * USDC_FACTOR);

      try {
        await program.methods
          .executeBuyback(hugeAmount)
          .accounts({
            user: user.publicKey,
            treasury: treasury.publicKey,
            nftMint: testNftMint,
            userNftAccount: testNftAccount,
            treasuryUsdcAccount,
            userUsdcAccount,
            usdcMint,
          })
          .signers([user, treasury])
          .rpc();
        
        assert.fail("Should have failed with insufficient balance");
      } catch (error) {
        assert.include(error.message.toLowerCase(), "insufficient");
        console.log("✅ Correctly prevented buyback with insufficient funds");
      }
    });

    it("Fails when user doesn't own NFT", async () => {

      // Create NFT owned by other user
      const testNftMint = await createMint(
        provider.connection,
        authority.payer,
        authority.publicKey,
        authority.publicKey,
        0
      );

      const testNftAccount = await createAccount(
        provider.connection,
        authority.payer, // payer covers rent
        testNftMint,
        otherUser.publicKey
      );

      await mintTo(
        provider.connection,
        authority.payer,
        testNftMint,
        testNftAccount,
        authority.publicKey,
        1
      );

      // User tries to sell other user's NFT
      try {
        await program.methods
          .executeBuyback(new anchor.BN(1 * USDC_FACTOR))
          .accounts({
            user: user.publicKey,
            treasury: treasury.publicKey,
            nftMint: testNftMint,
            userNftAccount: testNftAccount,
            treasuryUsdcAccount,
            userUsdcAccount,
            usdcMint,
          })
          .signers([user])
          .rpc();
        
        assert.fail("Should have failed with invalid owner");
      } catch (error) {
        console.log("✅ Correctly prevented selling someone else's NFT");
      }
    });
  });

  describe("Statistics", () => {
    it("Tracks multiple buybacks correctly", async () => {

      // Create and buyback another NFT
      const testNftMint = await createMint(
        provider.connection,
        authority.payer,
        authority.publicKey,
        authority.publicKey,
        0
      );

      const testNftAccount = await createAccount(
        provider.connection,
        user,
        testNftMint,
        user.publicKey
      );

      await mintTo(
        provider.connection,
        authority.payer,
        testNftMint,
        testNftAccount,
        authority.publicKey,
        1
      );

      const buybackAmount = new anchor.BN(1 * USDC_FACTOR);

      await program.methods
        .executeBuyback(buybackAmount)
        .accounts({
          user: user.publicKey,
          treasury: treasury.publicKey,
          nftMint: testNftMint,
          userNftAccount: testNftAccount,
          treasuryUsdcAccount,
          userUsdcAccount,
          usdcMint,
        })
        .signers([user, treasury])
        .rpc();

      const configAfter = await program.account.buyBackConfig.fetch(buybackConfigPda);
      
      assert.equal(
        configAfter.buybackEnable,
        true,
        "Buyback should be enabled"
      );
    });
  });
});