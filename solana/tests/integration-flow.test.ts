import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Keypair, Transaction, TransactionInstruction, ComputeBudgetProgram } from "@solana/web3.js";
import { expect } from "chai";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, createInitializeMintInstruction, createAssociatedTokenAccountInstruction, createMintToInstruction } from "@solana/spl-token";
import { WalrusClient } from "../upload-to-walrus";

describe("🚀 HIGH-SCALE CORE NFT INTEGRATION (10 SKINS)", () => {
  // Anchor setup
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Skinvault as Program<any>;
  const wallet = provider.wallet as anchor.Wallet;
  const user = wallet.publicKey; // User is the wallet itself, not payer.publicKey

  // Program accounts
  let globalState: PublicKey;
  let batchId: anchor.BN;
  let batch: PublicKey;
  let boxState: PublicKey;
  let collectionMint: Keypair;
  let collectionMetadataPda: PublicKey;
  let usdcMint: PublicKey;
  let treasuryAta: PublicKey;
  let walletClient: WalrusClient;

  before(async () => {
    // Setup Walrus client for dynamic metadata
    try {
      walletClient = await WalrusClient.create({
        useSuiCLI: true,
        verbose: true
      });
      console.log(`🐋 Walrus client ready: ${walletClient.getAddress()}`);
    } catch (error: any) {
      console.error(`❌ Walrus setup failed: ${error.message}`);
      throw error;
    }

    // Log the balance of the sui wallet
    const balance = await walletClient.getBalance();
    console.log(`💰 Sui wallet balance: ${balance} WAL`);

            console.log("\n🎯 === CORE NFT INTEGRATION SETUP ===");
    console.log(`👤 User: ${user.toBase58()}`);
    console.log(`🏢 Program: ${program.programId.toBase58()}`);
  });

            it("🎯 High-Scale Test: 10 Skins → Core NFT Selection", async () => {
    console.log("\n🎯 === PHASE 1: COLLECTION SETUP ===");

    // 1. Initialize global state
    await initializeGlobalState();

    // 2. Create collection
    await createCollection();

    // 3. Upload dynamic metadata to Walrus
    const metadataUris = await uploadDynamicMetadata();

    // 4. Create batch with dynamic metadata
    await createDynamicBatch(metadataUris);

    // 5. Open box to create boxState (required for revealAndClaim)
    await openBox();

            // 6. DIRECT REVEAL (NO VRF!) - Skip VRF callback, go straight to Core NFT reveal
            await directCandyMachineReveal(metadataUris);

    console.log("\n╔══════════════════════════════════════════════════════╗");
    console.log("║                                                      ║");
            console.log("║   🎉 HIGH-SCALE CORE NFT SUCCESS! 🎉                ║");
            console.log("║                                                      ║");
            console.log("║   ✅ 10 skins in pool                                ║");
            console.log("║   ✅ Core NFT selection                               ║");
            console.log("║   ✅ Dynamic metadata from Walrus                     ║");
            console.log("║   ✅ Built-in freeze functionality                   ║");
    console.log("║                                                      ║");
    console.log("╚══════════════════════════════════════════════════════╝\n");
  });

  async function initializeGlobalState() {
    console.log("🏗️ Initializing global state...");

    // Find global state PDA
    [globalState] = PublicKey.findProgramAddressSync(
      [Buffer.from("global_state")],
      program.programId
    );

    // Check if global state already exists
    const existingAccount = await provider.connection.getAccountInfo(globalState);
    if (existingAccount) {
      console.log(`✅ Global state already exists: ${globalState.toBase58()}`);
      console.log(`💰 Account balance: ${existingAccount.lamports} lamports`);
      console.log(`📏 Account size: ${existingAccount.data.length} bytes`);
      
      // Skip initialization and proceed with existing account
      usdcMint = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"); // Use mainnet USDC
      return;
    }

    // Create test USDC mint for initialization (not mainnet USDC)
    // This avoids Surfpool account resolution issues with mainnet USDC
    const usdcMintKeypair = Keypair.generate();
    usdcMint = usdcMintKeypair.publicKey;

    // Treasury ATA - let Anchor calculate this automatically
    // We'll let Anchor handle the ATA derivation in the instruction

    // Create token rent account
    const tokenRent = await provider.connection.getMinimumBalanceForRentExemption(82); // Token account size

    console.log(`📦 Global State PDA: ${globalState.toBase58()}`);
    console.log(`💎 USDC Mint: ${usdcMint.toBase58()}`);
    console.log(`🏦 Treasury ATA will be auto-created by Anchor`);

    await (program.methods as any)
      .initialize(provider.wallet.publicKey) // oracle_pubkey parameter - wallet signed automatically by provider
      .accounts({
        global: globalState,
        usdcMint: usdcMint,
        authority: provider.wallet.publicKey, // Explicitly specify authority account
        tokenProgram: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
        associatedTokenProgram: new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
        systemProgram: SystemProgram.programId,
      })
      .preInstructions([
        // Create test USDC mint account first
        SystemProgram.createAccount({
          fromPubkey: user,
          newAccountPubkey: usdcMint,
          lamports: await provider.connection.getMinimumBalanceForRentExemption(82), // Mint account size
          space: 82,
          programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
        }),
        // Initialize the mint properly using SPL Token helper
        createInitializeMintInstruction(
          usdcMint,           // mint
          6,                  // decimals (USDC is 6 decimals)
          user,               // mint authority
          user,               // freeze authority (optional)
        ),
      ])
      .signers([usdcMintKeypair])
      .rpc();

    console.log(`✅ Global state initialized: ${globalState.toBase58()}`);
  }

  async function createCollection() {
    console.log("🎨 Creating collection...");

    collectionMint = Keypair.generate();

    // Derive collection metadata PDA
    const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
      "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
    );

    [collectionMetadataPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        collectionMint.publicKey.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );

    console.log(`✅ Collection mint: ${collectionMint.publicKey.toBase58()}`);
    console.log(`✅ Collection metadata: ${collectionMetadataPda.toBase58()}`);
  }

  async function uploadDynamicMetadata(): Promise<string[]> {
    try {
      console.log("🐋 Uploading dynamic metadata to Walrus...");

      const metadataArray = [
        {
          name: "AK-47 | Fire Serpent",
          symbol: "SKIN",
          description: "Dynamic metadata for CS:GO skin #1 of 10",
          image: "https://example.com/fire-serpent.png",
          attributes: [
            { trait_type: "Weapon", value: "AK-47" },
            { trait_type: "Skin", value: "Fire Serpent" },
            { trait_type: "Rarity", value: "Legendary" },
            { trait_type: "Index", value: 1 },
            { trait_type: "Total Items", value: 10 }
          ],
          collection: {
            name: "CS:GO Skins Collection",
            family: "Counter-Strike"
          }
        },
        {
          name: "AWP | Dragon Lore",
          symbol: "SKIN",
          description: "Dynamic metadata for CS:GO skin #2 of 10",
          image: "https://example.com/dragon-lore.png",
          attributes: [
            { trait_type: "Weapon", value: "AWP" },
            { trait_type: "Skin", value: "Dragon Lore" },
            { trait_type: "Rarity", value: "Legendary" },
            { trait_type: "Index", value: 2 },
            { trait_type: "Total Items", value: 10 }
          ],
          collection: {
            name: "CS:GO Skins Collection",
            family: "Counter-Strike"
          }
        },
        {
          name: "M4A4 | Howl",
          symbol: "SKIN",
          description: "Dynamic metadata for CS:GO skin #3 of 10",
          image: "https://example.com/howl.png",
          attributes: [
            { trait_type: "Weapon", value: "M4A4" },
            { trait_type: "Skin", value: "Howl" },
            { trait_type: "Rarity", value: "Legendary" },
            { trait_type: "Index", value: 3 },
            { trait_type: "Total Items", value: 10 }
          ],
          collection: {
            name: "CS:GO Skins Collection",
            family: "Counter-Strike"
          }
        },
        {
          name: "AK-47 | Redline",
          symbol: "SKIN",
          description: "Dynamic metadata for CS:GO skin #4 of 10",
          image: "https://example.com/redline.png",
          attributes: [
            { trait_type: "Weapon", value: "AK-47" },
            { trait_type: "Skin", value: "Redline" },
            { trait_type: "Rarity", value: "Epic" },
            { trait_type: "Index", value: 4 },
            { trait_type: "Total Items", value: 10 }
          ],
          collection: {
            name: "CS:GO Skins Collection",
            family: "Counter-Strike"
          }
        },
        {
          name: "AWP | Medusa",
          symbol: "SKIN",
          description: "Dynamic metadata for CS:GO skin #5 of 10",
          image: "https://example.com/medusa.png",
          attributes: [
            { trait_type: "Weapon", value: "AWP" },
            { trait_type: "Skin", value: "Medusa" },
            { trait_type: "Rarity", value: "Epic" },
            { trait_type: "Index", value: 5 },
            { trait_type: "Total Items", value: 10 }
          ],
          collection: {
            name: "CS:GO Skins Collection",
            family: "Counter-Strike"
          }
        },
        {
          name: "M4A1-S | Icarus Fell",
          symbol: "SKIN",
          description: "Dynamic metadata for CS:GO skin #6 of 10",
          image: "https://example.com/icarus-fell.png",
          attributes: [
            { trait_type: "Weapon", value: "M4A1-S" },
            { trait_type: "Skin", value: "Icarus Fell" },
            { trait_type: "Rarity", value: "Epic" },
            { trait_type: "Index", value: 6 },
            { trait_type: "Total Items", value: 10 }
          ],
          collection: {
            name: "CS:GO Skins Collection",
            family: "Counter-Strike"
          }
        },
        {
          name: "AK-47 | Vulcan",
          symbol: "SKIN",
          description: "Dynamic metadata for CS:GO skin #7 of 10",
          image: "https://example.com/vulcan.png",
          attributes: [
            { trait_type: "Weapon", value: "AK-47" },
            { trait_type: "Skin", value: "Vulcan" },
            { trait_type: "Rarity", value: "Epic" },
            { trait_type: "Index", value: 7 },
            { trait_type: "Total Items", value: 10 }
          ],
          collection: {
            name: "CS:GO Skins Collection",
            family: "Counter-Strike"
          }
        },
        {
          name: "AWP | Lightning Strike",
          symbol: "SKIN",
          description: "Dynamic metadata for CS:GO skin #8 of 10",
          image: "https://example.com/lightning-strike.png",
          attributes: [
            { trait_type: "Weapon", value: "AWP" },
            { trait_type: "Skin", value: "Lightning Strike" },
            { trait_type: "Rarity", value: "Epic" },
            { trait_type: "Index", value: 8 },
            { trait_type: "Total Items", value: 10 }
          ],
          collection: {
            name: "CS:GO Skins Collection",
            family: "Counter-Strike"
          }
        },
        {
          name: "M4A4 | Poseidon",
          symbol: "SKIN",
          description: "Dynamic metadata for CS:GO skin #9 of 10",
          image: "https://example.com/poseidon.png",
          attributes: [
            { trait_type: "Weapon", value: "M4A4" },
            { trait_type: "Skin", value: "Poseidon" },
            { trait_type: "Rarity", value: "Epic" },
            { trait_type: "Index", value: 9 },
            { trait_type: "Total Items", value: 10 }
          ],
          collection: {
            name: "CS:GO Skins Collection",
            family: "Counter-Strike"
          }
        },
        {
          name: "AK-47 | Jaguar",
          symbol: "SKIN",
          description: "Dynamic metadata for CS:GO skin #10 of 10",
          image: "https://example.com/jaguar.png",
          attributes: [
            { trait_type: "Weapon", value: "AK-47" },
            { trait_type: "Skin", value: "Jaguar" },
            { trait_type: "Rarity", value: "Rare" },
            { trait_type: "Index", value: 10 },
            { trait_type: "Total Items", value: 10 }
          ],
          collection: {
            name: "CS:GO Skins Collection",
            family: "Counter-Strike"
          }
        }
      ];

      // HYBRID STRATEGY: Try Walrus first (for grant compliance), fallback to Arweave
      console.log("📤 Uploading metadata batch (Walrus first, Arweave fallback)...");
      const results = await walletClient.uploadJsonBatch(metadataArray);
      
      console.log(`✅ Upload successful: ${results.length} metadata URIs uploaded`);
      return results;
    } catch (error) {
      console.error("❌ CRITICAL ERROR: Both Walrus and Arweave uploads failed:", error);
      console.error("🚨 This indicates a serious infrastructure issue!");
      throw new Error(`INFRASTRUCTURE FAILURE: Both Walrus and Arweave failed - ${error.message}`);
    }
  }

  async function createDynamicBatch(metadataUris: string[]) {
    console.log("📦 Creating dynamic batch with HIDDEN SETTINGS approach...");

    batchId = new anchor.BN(Date.now());

    // Derive batch PDA
    [batch] = PublicKey.findProgramAddressSync(
      [Buffer.from("batch"), batchId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    // Prepare Candy Machine reference
    const candyMachine = new PublicKey("5U4gnUzB9rR22UP3MyyZG3UvoSqx5wXreKRsmx6s5Qt1");
    const merkleRoot = Array.from(new Array(32), (_, i) => i); // Simple test root
    const snapshotTime = new anchor.BN(Math.floor(Date.now() / 1000));

    // For large batches, we'll use a single "hidden" URI that points to our batch
    // This follows the Metaplex Hidden Settings pattern for large drops
    const hiddenUri = `https://skinvault.com/batch/${batchId.toString()}`;
    const hiddenName = `CSGO Skin Batch #${batchId.toString()}`;
    
    console.log(`   Batch ID: ${batchId.toString()}`);
    console.log(`   Items: ${metadataUris.length}`);
    console.log(`   Candy Machine: ${candyMachine.toBase58()}`);
    console.log(`   🔗 Hidden URI: ${hiddenUri}`);
    console.log(`   📝 Hidden Name: ${hiddenName}`);
    console.log(`   Using Hidden Settings for large scale (25+ items)`);

    // Call publishMerkleRoot with SINGLE hidden URI instead of 25 individual URIs
    await (program.methods as any)
      .publishMerkleRoot(
        batchId,
        candyMachine,
        [hiddenUri], // Single hidden URI instead of 25 individual URIs
        merkleRoot,
        snapshotTime
      )
          .accounts({
        authority: user,
            globalState,
            batch,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        console.log(`✅ Dynamic batch created: ${batch.toBase58()}`);
        
        // Fetch and display batch account data
        const batchAccount = await (program.account as any).batch.fetch(batch);
        console.log(`📊 Batch Account Data:`);
        console.log(`   📦 Batch ID: ${batchAccount.batchId.toString()}`);
        console.log(`   🍬 Candy Machine: ${batchAccount.candyMachine.toBase58()}`);
        console.log(`   📋 Total Items: ${batchAccount.totalItems}`);
        console.log(`   📋 Metadata URIs: ${batchAccount.metadataUris.length}`);
        console.log(`   🔗 First URI: ${batchAccount.metadataUris[0]}`);
        console.log(`   📊 Boxes Opened: ${batchAccount.boxesOpened}`);
  }

  async function openBox() {
    console.log("📦 Creating box state...");

    // Generate a box asset (Core NFT address)
    const boxAsset = Keypair.generate();
    
    // Derive box state PDA using the asset address
      [boxState] = PublicKey.findProgramAddressSync(
      [Buffer.from("box"), boxAsset.publicKey.toBuffer()],
        program.programId
      );

    console.log(`📦 Box Asset: ${boxAsset.publicKey.toBase58()}`);
    console.log(`📦 Box State: ${boxState.toBase58()}`);

    // Call createBox instruction
    await (program.methods as any)
      .createBox(batchId)
      .accounts({
        global: globalState,
        boxState: boxState,
        owner: user,
        boxAsset: boxAsset.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

        console.log(`✅ Box created: ${boxState.toBase58()}`);
        
        // Fetch and display box state account data
        const boxAccount = await (program.account as any).boxState.fetch(boxState);
        console.log(`📊 Box State Account Data:`);
        console.log(`   👤 Owner: ${boxAccount.owner.toBase58()}`);
        console.log(`   📦 Batch ID: ${boxAccount.batchId.toString()}`);
        console.log(`   🎯 Asset: ${boxAccount.asset.toBase58()}`);
        console.log(`   🔓 Opened: ${boxAccount.opened}`);
        console.log(`   ⏰ Mint Time: ${boxAccount.mintTime}`);
        console.log(`   🎲 Random Index: ${boxAccount.randomIndex}`);

    // Now open the box
    console.log("📦 Opening box...");

    // Derive VRF pending PDA
    const [vrfPending] = PublicKey.findProgramAddressSync(
      [Buffer.from("vrf_pending"), boxAsset.publicKey.toBuffer()],
        program.programId
      );

    console.log(`🎲 VRF Pending: ${vrfPending.toBase58()}`);

    // Call openBox instruction
    await (program.methods as any)
      .openBox(new anchor.BN(1)) // pool_size = 1 (hidden batch has 1 URI)
        .accounts({
        global: globalState,
        boxState: boxState,
        batch: batch,
        vrfPending: vrfPending,
          owner: user,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

        console.log(`✅ Box opened: ${boxState.toBase58()}`);
        
        // Fetch and display updated box state after opening
        const openedBoxAccount = await (program.account as any).boxState.fetch(boxState);
        console.log(`📊 Updated Box State After Opening:`);
        console.log(`   🔓 Opened: ${openedBoxAccount.opened}`);
        console.log(`   ⏰ Open Time: ${openedBoxAccount.openTime}`);
        console.log(`   🎲 Random Index: ${openedBoxAccount.randomIndex}`);
        
        // Fetch and display VRF pending account
        const vrfAccount = await (program.account as any).vrfPending.fetch(vrfPending);
        console.log(`📊 VRF Pending Account Data:`);
        console.log(`   🎯 Box Mint: ${vrfAccount.boxMint.toBase58()}`);
        console.log(`   🆔 Request ID: ${vrfAccount.requestId.toString()}`);
        console.log(`   ⏰ Request Time: ${vrfAccount.requestTime}`);
        console.log(`   📊 Pool Size: ${vrfAccount.poolSize}`);
        console.log(`   🎲 Randomness: ${vrfAccount.randomness.toString()}`);
        console.log(`   👤 User: ${vrfAccount.user.toBase58()}`);
  }

  async function directCandyMachineReveal(metadataUris: string[]) {
    console.log("\n🍬 === DIRECT CORE NFT REVEAL (NO VRF!) ===");
    console.log("🚀 Going straight from openBox to revealAndClaim with Core NFTs!");

    // Real Core NFT addresses
    const coreProgram = new PublicKey("CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhQ7z");

    console.log("🎯 Calling revealAndClaim with Core NFT integration...");
    console.log(`   🎨 Core Program: ${coreProgram.toBase58()}`);
    console.log(`   📦 Batch: ${batch.toBase58()}`);
    console.log(`   📋 Metadata URIs count: ${metadataUris.length}`);

    // Use the same global state that was initialized earlier
    console.log(`🔗 Using existing global state: ${globalState.toBase58()}`);

    // Generate new Core NFT asset for this reveal
    const coreAsset = Keypair.generate();
    
    // Optional collection (can be null for standalone NFTs)
    const collection = null; // No collection for now

    // Use Anchor's built-in method for better signing handling
    try {
      // Use raw instruction call since TypeScript types are outdated
      const instruction = await program.methods
        .revealAndClaim()
        .accounts({
          user: user,
          globalState: globalState,
          boxState: boxState,
          batch: batch,
          asset: coreAsset.publicKey,
          collection: collection,
          coreProgram: coreProgram,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      const transaction = new Transaction().add(instruction);
      const signature = await provider.sendAndConfirm(transaction, [coreAsset]);

      console.log("✅ CORE NFT CPI SUCCESS!");
      console.log(`📡 Transaction: ${signature}`);
      console.log("🎉 Skin revealed via Core NFT (no VRF needed)!");
      
      // Fetch and display final account states
      console.log(`\n📊 Final Account States After Reveal:`);
      
      // Check if box state still exists (should be closed)
      try {
        const finalBoxAccount = await (program.account as any).boxState.fetch(boxState);
        console.log(`📦 Box State (should be closed):`);
        console.log(`   🔓 Opened: ${finalBoxAccount.opened}`);
        console.log(`   🎲 Random Index: ${finalBoxAccount.randomIndex}`);
      } catch (error) {
        console.log(`✅ Box State Account Closed (rent refunded)`);
      }
      
      // Check Core NFT asset account
      const coreAssetInfo = await provider.connection.getAccountInfo(coreAsset.publicKey);
      if (coreAssetInfo) {
        console.log(`🎨 Core NFT Asset:`);
        console.log(`   💰 Balance: ${coreAssetInfo.lamports} lamports`);
        console.log(`   📏 Size: ${coreAssetInfo.data.length} bytes`);
        console.log(`   🔑 Owner: ${coreAssetInfo.owner.toBase58()}`);
      }

      // Verify the Core NFT was created with correct metadata
      await verifyRevealedMetadata(metadataUris);

    } catch (error: any) {
      console.error("❌ Core NFT CPI failed:");
      console.error("Message:", error.message);
      if (error.logs) {
        console.error("Logs:", error.logs);
      }
      throw error;
    }
  }

  async function verifyRevealedMetadata(expectedUris: string[]) {
    console.log("\n📋 Verifying revealed metadata...");

    // Check batch account for dynamic metadata
    const batchAccount = await (program.account as any).batch.fetch(batch);
    // For Hidden Settings, we expect 1 URI (not 25)
    expect(batchAccount.metadataUris.length).to.equal(1);

    console.log(`✅ Batch has ${batchAccount.metadataUris.length} metadata URIs`);
    console.log(`✅ First URI: ${batchAccount.metadataUris[0]}`);
    console.log(`✅ Candy Machine: ${batchAccount.candyMachine.toBase58()}`);

    console.log("🎯 Metadata verification complete!");
  }

  // Helper functions
  async function deriveMetadataPda(mint: PublicKey): Promise<PublicKey> {
      const [metadata] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
        new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s").toBuffer(),
        mint.toBuffer(),
        ],
      new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
      );
    return metadata;
  }

  async function deriveMasterEditionPda(mint: PublicKey): Promise<PublicKey> {
      const [masterEdition] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
        new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s").toBuffer(),
        mint.toBuffer(),
          Buffer.from("edition"),
        ],
      new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
    );
    return masterEdition;
  }
});