import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Programs } from "../target/types/programs";
import { 
  Keypair, 
  LAMPORTS_PER_SOL, 
  PublicKey, 
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  createAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { assert } from "chai";

describe("Buyback Program", () => {
  // Configure the client
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Programs as Program<Programs>;
  
  // Test accounts
  const authority = provider.wallet as anchor.Wallet;
  const treasury = Keypair.generate();
  const user = Keypair.generate();
  
  let collectionMint: PublicKey;
  let nftMint: PublicKey;
  let userNftAccount: PublicKey;
  let buybackConfigPda: PublicKey;
  let buybackConfigBump: number;

  before(async () => {
    // Airdrop SOL to test accounts
    const airdropTx1 = await provider.connection.requestAirdrop(
      treasury.publicKey,
      10 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropTx1);

    const airdropTx2 = await provider.connection.requestAirdrop(
      user.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropTx2);

    // Create collection mint (simulating Candy Machine collection)
    collectionMint = await createMint(
      provider.connection,
      authority.payer,
      authority.publicKey,
      authority.publicKey,
      0 // NFTs have 0 decimals
    );

    console.log("✅ Collection mint created:", collectionMint.toBase58());

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

    // Derive buyback config PDA
    [buybackConfigPda, buybackConfigBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("buyback_config")],
      program.programId
    );

    console.log("✅ Buyback config PDA:", buybackConfigPda.toBase58());
  });

  describe("Initialize", () => {
    it("Initializes buyback config", async () => {
      const minTreasuryBalance = new anchor.BN(10 * LAMPORTS_PER_SOL);

      const tx = await program.methods
        .initializeBuyback(collectionMint, minTreasuryBalance)
        .accounts({
          authority: authority.publicKey,
          treasury: treasury.publicKey,
          collectionMint: collectionMint,
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

    it("Fails to initialize twice", async () => {
      try {
        await program.methods
          .initializeBuyback(collectionMint, new anchor.BN(LAMPORTS_PER_SOL))
          .accounts({
            authority: authority.publicKey,
            treasury: treasury.publicKey,
            collectionMint: collectionMint,
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
    const buybackAmount = new anchor.BN(0.5 * LAMPORTS_PER_SOL);

    it("Successfully executes buyback", async () => {
      // Get balances before
      const userBalanceBefore = await provider.connection.getBalance(user.publicKey);
      const treasuryBalanceBefore = await provider.connection.getBalance(treasury.publicKey);
      const nftAccountBefore = await getAccount(provider.connection, userNftAccount);
      
      assert.equal(nftAccountBefore.amount.toString(), "1", "User should have 1 NFT");

      console.log("Before buyback:");
      console.log("  User balance:", userBalanceBefore / LAMPORTS_PER_SOL, "SOL");
      console.log("  Treasury balance:", treasuryBalanceBefore / LAMPORTS_PER_SOL, "SOL");
      console.log("  NFT amount:", nftAccountBefore.amount.toString());

      // Execute buyback
      const tx = await program.methods
        .executeBuyback(buybackAmount)
        .accounts({
          user: user.publicKey,
          treasury: treasury.publicKey,
          nftMint: nftMint,
          userNftAccount: userNftAccount,
        })
        .signers([user, treasury])
        .rpc();

      console.log("✅ Execute buyback tx:", tx);

      // Get balances after
      const userBalanceAfter = await provider.connection.getBalance(user.publicKey);
      const treasuryBalanceAfter = await provider.connection.getBalance(treasury.publicKey);
      
      // Check NFT was burned
      const nftAccountAfter = await getAccount(provider.connection, userNftAccount);
      assert.equal(nftAccountAfter.amount.toString(), "0", "NFT should be burned");

      // Check SOL transfer (accounting for tx fees)
      const userGain = userBalanceAfter - userBalanceBefore;
      assert.isAbove(userGain, buybackAmount.toNumber() * 0.99, "User should receive ~0.5 SOL");
      
      const treasuryLoss = treasuryBalanceBefore - treasuryBalanceAfter;
      assert.approximately(
        treasuryLoss,
        buybackAmount.toNumber(),
        1000,
        "Treasury should lose 0.5 SOL"
      );

      console.log("After buyback:");
      console.log("  User balance:", userBalanceAfter / LAMPORTS_PER_SOL, "SOL");
      console.log("  Treasury balance:", treasuryBalanceAfter / LAMPORTS_PER_SOL, "SOL");
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
          .executeBuyback(new anchor.BN(0.1 * LAMPORTS_PER_SOL))
          .accounts({
            user: user.publicKey,
            treasury: treasury.publicKey,
            nftMint: testNftMint,
            userNftAccount: testNftAccount,
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
      const hugeAmount = new anchor.BN(100 * LAMPORTS_PER_SOL);

      try {
        await program.methods
          .executeBuyback(hugeAmount)
          .accounts({
            user: user.publicKey,
            treasury: treasury.publicKey,
            nftMint: testNftMint,
            userNftAccount: testNftAccount,
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
      const otherUser = Keypair.generate();
      
      // Airdrop to other user
      const airdrop = await provider.connection.requestAirdrop(
        otherUser.publicKey,
        1 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(airdrop);

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
        otherUser,
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
          .executeBuyback(new anchor.BN(0.1 * LAMPORTS_PER_SOL))
          .accounts({
            user: user.publicKey,
            treasury: treasury.publicKey,
            nftMint: testNftMint,
            userNftAccount: testNftAccount,
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

      const buybackAmount = new anchor.BN(0.3 * LAMPORTS_PER_SOL);

      await program.methods
        .executeBuyback(buybackAmount)
        .accounts({
          user: user.publicKey,
          treasury: treasury.publicKey,
          nftMint: testNftMint,
          userNftAccount: testNftAccount,
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