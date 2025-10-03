import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Skinvault } from "../target/types/skinvault";
import { Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { createMint, mintTo, getAccount, TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccount } from "@solana/spl-token";
import { assert } from "chai";

describe("SkinVault Core Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Skinvault as Program<Skinvault>;
  const connection = provider.connection;

  const MPL_CORE_PROGRAM_ID = new PublicKey("CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d");
  
  let authority: Keypair, oracle: Keypair, user: Keypair;
  let usdcMint: PublicKey, globalState: PublicKey, treasuryAta: PublicKey, userUsdcAta: PublicKey;
  let collection: Keypair, asset: Keypair, vrfPending: PublicKey, boxState: PublicKey;

  before(async () => {
    authority = Keypair.generate();
    oracle = Keypair.generate();
    user = Keypair.generate();
    collection = Keypair.generate();

    // Airdrop
    await connection.confirmTransaction(await connection.requestAirdrop(authority.publicKey, 5 * LAMPORTS_PER_SOL));
    await connection.confirmTransaction(await connection.requestAirdrop(oracle.publicKey, 2 * LAMPORTS_PER_SOL));
    await connection.confirmTransaction(await connection.requestAirdrop(user.publicKey, 2 * LAMPORTS_PER_SOL));

    // Create USDC mint
    usdcMint = await createMint(connection, authority, authority.publicKey, null, 6);

    // PDAs
    [globalState] = PublicKey.findProgramAddressSync([Buffer.from("global")], program.programId);
    treasuryAta = await getAssociatedTokenAddress(usdcMint, globalState, true);
    userUsdcAta = await getAssociatedTokenAddress(usdcMint, user.publicKey);
  });

  describe("Setup", () => {
    it("Initialize program", async () => {
      await program.methods
        .initialize(oracle.publicKey)
        .accountsPartial({ authority: authority.publicKey, usdcMint })
        .signers([authority])
        .rpc();

      const state = await program.account.global.fetch(globalState);
      assert.equal(state.authority.toBase58(), authority.publicKey.toBase58());
    });

    it("Fund treasury", async () => {
      const depositorAta = await createAssociatedTokenAccount(connection, authority, usdcMint, authority.publicKey);
      await mintTo(connection, authority, usdcMint, depositorAta, authority, 100_000 * 1_000_000);
      
      await program.methods
        .depositTreasury(new anchor.BN(100_000 * 1_000_000))
        .accountsPartial({ 
          depositor: authority.publicKey,
          depositorAta,
          treasuryAta,
          usdcMint
        })
        .signers([authority])
        .rpc();
    });

    it("Create user USDC account", async () => {
      await createAssociatedTokenAccount(connection, user, usdcMint, user.publicKey);
      await mintTo(connection, user, usdcMint, userUsdcAta, authority, 1000 * 1_000_000);
    });
  });

  describe("Flow: Open Box → Sell Immediately", () => {
    it("User opens box", async () => {
      [vrfPending] = PublicKey.findProgramAddressSync(
        [Buffer.from("vrf_pending"), user.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .openBox(new anchor.BN(3))
        .accountsPartial({ owner: user.publicKey })
        .signers([user])
        .rpc();

      const vrf = await program.account.vrfPending.fetch(vrfPending);
      assert.equal(vrf.randomness.toString(), "0");
    });

    it("Oracle provides randomness", async () => {
      const vrf = await program.account.vrfPending.fetch(vrfPending);
      const randomness = Array.from({ length: 32 }, () => Math.floor(Math.random() * 256));

      await program.methods
        .vrfCallback(vrf.requestId, randomness)
        .accountsPartial({ global: globalState, vrfPending, vrfAuthority: oracle.publicKey })
        .signers([oracle])
        .rpc();

      const vrfAfter = await program.account.vrfPending.fetch(vrfPending);
      assert.notEqual(vrfAfter.randomness.toString(), "0");
    });

    it("User reveals and claims NFT", async () => {
      asset = Keypair.generate();
      
      [boxState] = PublicKey.findProgramAddressSync(
        [Buffer.from("box"), asset.publicKey.toBuffer()],
        program.programId
      );

      try {
        await program.methods
          .revealAndClaim()
          .accountsPartial({
            user: user.publicKey,
            globalState,
            vrfPending,
            boxState,
            collection: PublicKey.default,
            asset: asset.publicKey,
            coreProgram: MPL_CORE_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([user, asset])
          .rpc({ skipPreflight: true });
        
        console.log("✅ NFT minted + BoxState created");
      } catch (e: any) {
        if (e.message?.includes("AccountNotExecutable")) {
          console.log("⚠️  Core program not deployed (localnet - use devnet for full test)");
        } else throw e;
      }

      const vrfAccount = await connection.getAccountInfo(vrfPending);
      if (!vrfAccount) console.log("✅ VRF closed");
    });

    it("Set price oracle", async () => {
      // Get the actual inventory hash from BoxState (or use default if not created)
      let skinHash;
      try {
        const box = await program.account.boxState.fetch(boxState);
        skinHash = Array.from(box.assignedInventory);
      } catch {
        skinHash = new Array(32).fill(0);
      }
      
      const price = new anchor.BN(50 * 1_000_000);
      const slot = await connection.getSlot();
      const blockTime = await connection.getBlockTime(slot);
      const timestamp = new anchor.BN(blockTime || Math.floor(Date.now() / 1000));
      const signature = Array.from({ length: 64 }, () => 42);

      const [priceStore] = PublicKey.findProgramAddressSync(
        [Buffer.from("price"), Buffer.from(skinHash)],
        program.programId
      );

      await program.methods
        .setPriceSigned(skinHash, price, timestamp, signature)
        .accountsPartial({
          global: globalState,
          priceStore,
          payer: oracle.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([oracle])
        .rpc();

      console.log("✅ Price set: 50 USDC");
    });

    it("User sells NFT back to platform", async () => {
      try {
        const minPrice = new anchor.BN(49 * 1_000_000);
        let skinHash;
        try {
          const box = await program.account.boxState.fetch(boxState);
          skinHash = Array.from(box.assignedInventory);
        } catch {
          console.log("⚠️  BoxState not created (localnet limitation)");
          return;
        }

        const [priceStore] = PublicKey.findProgramAddressSync(
          [Buffer.from("price"), Buffer.from(skinHash)],
          program.programId
        );
        
        await program.methods
          .sellBack(minPrice)
          .accountsPartial({
            global: globalState,
            treasuryAta,
            userAta: userUsdcAta,
            usdcMint,
            priceStore,
            boxState,
            asset: asset.publicKey,
            collection: PublicKey.default,
            coreProgram: MPL_CORE_PROGRAM_ID,
            seller: user.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([user])
          .rpc({ skipPreflight: true });

        const box = await program.account.boxState.fetch(boxState);
        assert.equal(box.redeemed, true);
        console.log("✅ NFT burned, user paid");
      } catch (e: any) {
        if (e.message?.includes("AccountNotExecutable")) {
          console.log("⚠️  Burn requires devnet (Core program)");
        } else throw e;
      }
    });
  });

  describe("Admin Functions", () => {
    it("Toggle buyback", async () => {
      await program.methods
        .toggleBuyback(false)
        .accountsPartial({ authority: authority.publicKey })
        .signers([authority])
        .rpc();

      let state = await program.account.global.fetch(globalState);
      assert.equal(state.buybackEnabled, false);

      await program.methods
        .toggleBuyback(true)
        .accountsPartial({ authority: authority.publicKey })
        .signers([authority])
        .rpc();

      state = await program.account.global.fetch(globalState);
      assert.equal(state.buybackEnabled, true);
    });

    it("Emergency pause", async () => {
      await program.methods
        .emergencyPause(true)
        .accountsPartial({ authority: authority.publicKey })
        .signers([authority])
        .rpc();

      let state = await program.account.global.fetch(globalState);
      assert.equal(state.paused, true);

      await program.methods
        .emergencyPause(false)
        .accountsPartial({ authority: authority.publicKey })
        .signers([authority])
        .rpc();

      state = await program.account.global.fetch(globalState);
      assert.equal(state.paused, false);
    });

    it("Update oracle", async () => {
      const newOracle = Keypair.generate();

      await program.methods
        .setOracle(newOracle.publicKey)
        .accountsPartial({ authority: authority.publicKey })
        .signers([authority])
        .rpc();

      const state = await program.account.global.fetch(globalState);
      assert.equal(state.oraclePubkey.toBase58(), newOracle.publicKey.toBase58());

      // Restore
      await program.methods
        .setOracle(oracle.publicKey)
        .accountsPartial({ authority: authority.publicKey })
        .signers([authority])
        .rpc();
    });

    it("Withdraw treasury", async () => {
      const amount = new anchor.BN(1000 * 1_000_000);
      const receiverAta = await getAssociatedTokenAddress(usdcMint, authority.publicKey);
      
      await program.methods
        .withdrawTreasury(amount)
        .accountsPartial({ 
          authority: authority.publicKey,
          treasuryAta,
          recipientAta: receiverAta,
          usdcMint
        })
        .signers([authority])
        .rpc();

      console.log("✅ Treasury withdrawal successful");
    });
  });
});
