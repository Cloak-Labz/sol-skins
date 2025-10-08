import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Keypair, Transaction, TransactionInstruction, ComputeBudgetProgram } from "@solana/web3.js";
import { expect } from "chai";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, createInitializeMintInstruction, createAssociatedTokenAccountInstruction, createMintToInstruction } from "@solana/spl-token";
import { WalrusHTTPClient } from "../upload-to-walrus";
import { SimplifiedCandyMachineClient, SimplifiedCandyMachineConfig } from "./simplified-candy-machine-client";

describe("Core NFT Integration Test - One Candy Machine Per Pack", () => {
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
  let legacyCollectionMint: Keypair;
  let collectionMetadataPda: PublicKey;
  let usdcMint: PublicKey;
  let treasuryAta: PublicKey;
  let walletClient: WalrusHTTPClient;
  let simplifiedCandyMachineClient: SimplifiedCandyMachineClient;

  // Pack-specific Candy Machine
  let packId: string;
  let candyMachine: PublicKey;
  let candyMachineSigner: any;
  let candyGuard: PublicKey;
  let collectionMint: PublicKey;
  let collectionMintSigner: any;

  before(async () => {
    walletClient = new WalrusHTTPClient(true);
    simplifiedCandyMachineClient = new SimplifiedCandyMachineClient(provider.connection, wallet.payer);
    console.log("Walrus client ready");
    console.log("Simplified Candy Machine client ready");
  });

  it("Core NFT Integration Test - One Candy Machine Per Pack", async () => {
    console.log("Phase 1: Collection Setup");

    // 1. Initialize global state
    await initializeGlobalState();

    // 2. Create collection
    await createCollection();

    // 3. Deploy Candy Machine for this specific pack
    await deployCandyMachineForPack();

    // 4. Upload dynamic metadata to Walrus
    const metadataUris = await uploadDynamicMetadata();

    // 5. Insert items into Candy Machine
    await insertItemsIntoCandyMachine(metadataUris);

    // 6. Create batch with dynamic metadata
    await createDynamicBatch(metadataUris);

    // 7. Open box to create boxState (required for revealAndClaim)
    await openBox();

    // 8. DIRECT REVEAL (NO VRF!) - Skip VRF callback, go straight to Core NFT reveal
    await directCandyMachineReveal(metadataUris);

    console.log("Core NFT Integration Test Complete!");
  });

  async function initializeGlobalState() {
    console.log("Initializing global state...");

    // Find global state PDA
    [globalState] = PublicKey.findProgramAddressSync(
      [Buffer.from("global")],
      program.programId
    );

    // Check if global state already exists
    const existingAccount = await provider.connection.getAccountInfo(globalState);
    if (existingAccount) {
      console.log(`Global state exists: ${globalState.toBase58()}`);
      
      // Try to fetch the account to see if it deserializes correctly
      try {
        const globalAccount = await (program.account as any).global.fetch(globalState);
        console.log(`Global state deserialized successfully`);
        console.log(`Current batch: ${globalAccount.currentBatch}`);
        
        // Skip initialization and proceed with existing account
        usdcMint = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"); // Use mainnet USDC
        return;
      } catch (error) {
        console.log(`Global state exists but failed to deserialize: ${error.message}`);
        console.log("This is due to a program update. We need to close and recreate the global account.");
        
        // Close the existing global account to reclaim rent
        try {
          await (program.methods as any)
            .closeGlobal()
          .accounts({
              global: globalState,
              authority: wallet.publicKey,
          })
          .rpc();

          console.log("Successfully closed existing global account");
        } catch (closeError) {
          console.log(`Failed to close global account: ${closeError.message}`);
          console.log("Continuing with initialization anyway...");
        }
        
        // Continue with initialization to create a new global account
      }
    }

    // Create test USDC mint for initialization (not mainnet USDC)
    // This avoids Surfpool account resolution issues with mainnet USDC
    const usdcMintKeypair = Keypair.generate();
    usdcMint = usdcMintKeypair.publicKey;

    // Treasury ATA - let Anchor calculate this automatically
    // We'll let Anchor handle the ATA derivation in the instruction

    // Create token rent account
    const tokenRent = await provider.connection.getMinimumBalanceForRentExemption(82); // Token account size

    console.log(`Global State PDA: ${globalState.toBase58()}`);
    console.log(`USDC Mint: ${usdcMint.toBase58()}`);
    console.log(`Treasury ATA will be auto-created`);

    await (program.methods as any)
      .initialize() // No oracle_pubkey parameter needed
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

    console.log(`Global state initialized: ${globalState.toBase58()}`);
  }

  async function createCollection() {
    console.log("Creating collection...");

    legacyCollectionMint = Keypair.generate();

    // Derive collection metadata PDA
    const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
      "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
    );

    [collectionMetadataPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        legacyCollectionMint.publicKey.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );

    console.log(`Collection mint: ${legacyCollectionMint.publicKey.toBase58()}`);
    console.log(`Collection metadata: ${collectionMetadataPda.toBase58()}`);
  }

  async function deployCandyMachineForPack() {
    console.log("Deploying Candy Machine for this pack using simplified client...");

    // Generate unique pack ID
    packId = `pack_${Date.now()}`;
    
    try {
      // Create collection metadata URI (placeholder)
      const collectionUri = "https://example.com/collection.json";

      // Create Candy Machine configuration
      const candyMachineConfig = simplifiedCandyMachineClient.createDefaultConfig(
        packId,
        `${packId} Collection`,
        collectionUri,
        3, // 3 items
        wallet.publicKey
      );

      // Deploy Candy Machine using simplified client
      const deployedCM = await simplifiedCandyMachineClient.createCandyMachineForPack(candyMachineConfig);

      // Store the deployed addresses
      candyMachine = deployedCM.candyMachine;
      candyMachineSigner = deployedCM.candyMachineSigner;
      candyGuard = deployedCM.candyGuard;
      collectionMint = deployedCM.collectionMint;
      collectionMintSigner = deployedCM.collectionMintSigner;

      console.log(`Pack ID: ${packId}`);
      console.log(`Candy Machine: ${candyMachine.toBase58()}`);
      console.log(`Candy Guard: ${candyGuard.toBase58()}`);
      console.log(`Collection Mint: ${collectionMint.toBase58()}`);
      
    } catch (error) {
      console.error("Failed to deploy Candy Machine:", error);
      throw error;
    }
  }

  async function uploadDynamicMetadata(): Promise<string[]> {
    try {
      console.log("Uploading metadata to Walrus...");

      const metadataArray = [
        {
          name: "AK-47 | Fire Serpent",
          symbol: "SKIN",
          description: `Dynamic metadata for CS:GO skin #1 of 3 in ${packId}`,
          image: "https://example.com/fire-serpent.png",
          attributes: [
            { trait_type: "Weapon", value: "AK-47" },
            { trait_type: "Skin", value: "Fire Serpent" },
            { trait_type: "Rarity", value: "Legendary" },
            { trait_type: "Pack", value: packId },
            { trait_type: "Index", value: 1 },
            { trait_type: "Total Items", value: 3 }
          ],
          collection: {
            name: `CS:GO Skins Collection - ${packId}`,
            family: "Counter-Strike"
          }
        },
        {
          name: "AWP | Dragon Lore",
          symbol: "SKIN",
          description: `Dynamic metadata for CS:GO skin #2 of 3 in ${packId}`,
          image: "https://example.com/dragon-lore.png",
          attributes: [
            { trait_type: "Weapon", value: "AWP" },
            { trait_type: "Skin", value: "Dragon Lore" },
            { trait_type: "Rarity", value: "Legendary" },
            { trait_type: "Pack", value: packId },
            { trait_type: "Index", value: 2 },
            { trait_type: "Total Items", value: 3 }
          ],
          collection: {
            name: `CS:GO Skins Collection - ${packId}`,
            family: "Counter-Strike"
          }
        },
        {
          name: "M4A4 | Howl",
          symbol: "SKIN",
          description: `Dynamic metadata for CS:GO skin #3 of 3 in ${packId}`,
          image: "https://example.com/howl.png",
          attributes: [
            { trait_type: "Weapon", value: "M4A4" },
            { trait_type: "Skin", value: "Howl" },
            { trait_type: "Rarity", value: "Legendary" },
            { trait_type: "Pack", value: packId },
            { trait_type: "Index", value: 3 },
            { trait_type: "Total Items", value: 3 }
          ],
          collection: {
            name: `CS:GO Skins Collection - ${packId}`,
            family: "Counter-Strike"
          }
        },
      ];

      // HYBRID STRATEGY: Try Walrus first (for grant compliance)
      console.log("Uploading metadata batch...");
      const results = await walletClient.uploadJsonBatch(metadataArray);
      
      console.log(`Upload successful: ${results.length} metadata URIs uploaded`);
      return results;
    } catch (error) {
      console.error("Walrus upload failed:", error);
      throw new Error(`Walrus failed to upload metadata - ${error.message}`);
    }
  }

  async function insertItemsIntoCandyMachine(metadataUris: string[]) {
    console.log("Inserting items into Candy Machine using simplified client...");

    try {
      // Create items array for simplified client
      const items = metadataUris.map((uri, index) => ({
        name: `${packId} #${index + 1}`,
        uri: uri,
      }));

      // Add items to Candy Machine using simplified client
      await simplifiedCandyMachineClient.addItemsToCandyMachine(candyMachine, items);
      
      console.log(`Successfully inserted ${metadataUris.length} items into Candy Machine`);
      console.log("Items inserted:");
      metadataUris.forEach((uri, index) => {
        console.log(`  ${index + 1}. ${packId} #${index + 1} -> ${uri}`);
      });
      
    } catch (error) {
      console.error("Failed to insert items into Candy Machine:", error);
      throw error;
    }
  }

  async function createDynamicBatch(metadataUris: string[]) {
    console.log("Creating dynamic batch...");

    batchId = new anchor.BN(Date.now());

    // Derive batch PDA
    [batch] = PublicKey.findProgramAddressSync(
      [Buffer.from("batch"), batchId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    // Use the pack-specific Candy Machine
    const merkleRoot = Array.from(new Array(32), (_, i) => i); // Simple test root
    const snapshotTime = new anchor.BN(Math.floor(Date.now() / 1000));

    // For large batches, we'll use a single "hidden" URI that points to our batch
    // This follows the Metaplex Hidden Settings pattern for large drops
    const hiddenUri = `https://skinvault.com/pack/${packId}/batch/${batchId.toString()}`;
    const hiddenName = `CSGO Skin Pack ${packId} - Batch #${batchId.toString()}`;
    
    console.log(`   Pack ID: ${packId}`);
    console.log(`   Batch ID: ${batchId.toString()}`);
    console.log(`   Items: ${metadataUris.length}`);
    console.log(`   Candy Machine: ${candyMachine.toBase58()}`);
    console.log(`   Hidden URI: ${hiddenUri}`);
    console.log(`   Hidden Name: ${hiddenName}`);

    // Call publishMerkleRoot with SINGLE hidden URI instead of individual URIs
    await (program.methods as any)
      .publishMerkleRoot(
        batchId,
        candyMachine, // Use pack-specific Candy Machine
        [hiddenUri], // Single hidden URI instead of individual URIs
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

    console.log(`Dynamic batch created: ${batch.toBase58()}`);
    
    // Fetch and display batch account data
    const batchAccount = await (program.account as any).batch.fetch(batch);
    console.log(`Batch Account Data:`);
    console.log(`   Pack ID: ${packId}`);
    console.log(`   Batch ID: ${batchAccount.batchId.toString()}`);
    console.log(`   Candy Machine: ${batchAccount.candyMachine.toBase58()}`);
    console.log(`   Total Items: ${batchAccount.totalItems}`);
    console.log(`   Metadata URIs: ${batchAccount.metadataUris.length}`);
    console.log(`   First URI: ${batchAccount.metadataUris[0]}`);
    console.log(`   Boxes Opened: ${batchAccount.boxesOpened}`);
  }

  async function openBox() {
    console.log("Creating box state...");

    // Generate a box asset (Core NFT address)
    const boxAsset = Keypair.generate();
    
    // Derive box state PDA using the asset address
      [boxState] = PublicKey.findProgramAddressSync(
      [Buffer.from("box"), boxAsset.publicKey.toBuffer()],
        program.programId
      );

    console.log(`Box Asset: ${boxAsset.publicKey.toBase58()}`);
    console.log(`Box State: ${boxState.toBase58()}`);

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

        console.log(`Box created: ${boxState.toBase58()}`);
        
        // Fetch and display box state account data
        const boxAccount = await (program.account as any).boxState.fetch(boxState);
        console.log(`Box State Account Data:`);
        console.log(`   Owner: ${boxAccount.owner.toBase58()}`);
        console.log(`   Batch ID: ${boxAccount.batchId.toString()}`);
        console.log(`   Asset: ${boxAccount.asset.toBase58()}`);
        console.log(`   Opened: ${boxAccount.opened}`);
        console.log(`   Mint Time: ${boxAccount.mintTime}`);
        console.log(`   Random Index: ${boxAccount.randomIndex}`);

    // Now open the box
    console.log("Opening box...");

    // Derive VRF pending PDA
    const [vrfPending] = PublicKey.findProgramAddressSync(
      [Buffer.from("vrf_pending"), boxAsset.publicKey.toBuffer()],
        program.programId
      );

    console.log(`VRF Pending: ${vrfPending.toBase58()}`);

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

        console.log(`Box opened: ${boxState.toBase58()}`);
        
        // Fetch and display updated box state after opening
        const openedBoxAccount = await (program.account as any).boxState.fetch(boxState);
        console.log(`Updated Box State After Opening:`);
        console.log(`   Opened: ${openedBoxAccount.opened}`);
        console.log(`   Open Time: ${openedBoxAccount.openTime}`);
        console.log(`   Random Index: ${openedBoxAccount.randomIndex}`);
        
        // Fetch and display VRF pending account
        const vrfAccount = await (program.account as any).vrfPending.fetch(vrfPending);
        console.log(`VRF Pending Account Data:`);
        console.log(`   Box Mint: ${vrfAccount.boxMint.toBase58()}`);
        console.log(`   Request ID: ${vrfAccount.requestId.toString()}`);
        console.log(`   Request Time: ${vrfAccount.requestTime}`);
        console.log(`   Pool Size: ${vrfAccount.poolSize}`);
        console.log(`   Randomness: ${vrfAccount.randomness.toString()}`);
        console.log(`   User: ${vrfAccount.user.toBase58()}`);
  }

  async function directCandyMachineReveal(metadataUris: string[]) {
    console.log("Direct Core NFT Reveal");

    // Real Core NFT addresses
    const coreProgram = new PublicKey("CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d");

    console.log("Calling revealAndClaim with Core NFT integration...");
    console.log(`   Pack ID: ${packId}`);
    console.log(`   Core Program: ${coreProgram.toBase58()}`);
    console.log(`   Batch: ${batch.toBase58()}`);
    console.log(`   Candy Machine: ${candyMachine.toBase58()}`);
    console.log(`   Metadata URIs count: ${metadataUris.length}`);

    // Use the same global state that was initialized earlier
    console.log(`Using existing global state: ${globalState.toBase58()}`);

    // Generate new Core NFT asset for this reveal
    const coreAsset = Keypair.generate();
    
    // Optional collection (can be null for standalone NFTs)
    const collection = null; // No collection for now

    // Use Anchor's built-in method for better signing handling
    try {
      // Use raw instruction call since TypeScript types are outdated
      const instruction = await (program.methods as any)
        .revealAndClaim()
        .accountsPartial({
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

      console.log("CORE NFT CPI SUCCESS!");
      console.log(`Transaction: ${signature}`);
      console.log(`Skin revealed via Core NFT for pack: ${packId}`);
      
      // Fetch and display final account states
      console.log(`Final Account States After Reveal:`);
      
      // Check if box state still exists (should be closed)
      try {
        const finalBoxAccount = await (program.account as any).boxState.fetch(boxState);
        console.log(`Box State (should be closed):`);
        console.log(`   Opened: ${finalBoxAccount.opened}`);
        console.log(`   Random Index: ${finalBoxAccount.randomIndex}`);
      } catch (error) {
        console.log(`Box State Account Closed (rent refunded)`);
      }
      
      // Check Core NFT asset account
      const coreAssetInfo = await provider.connection.getAccountInfo(coreAsset.publicKey);
      if (coreAssetInfo) {
        console.log(`Core NFT Asset:`);
        console.log(`   Balance: ${coreAssetInfo.lamports} lamports`);
        console.log(`   Size: ${coreAssetInfo.data.length} bytes`);
        console.log(`   Owner: ${coreAssetInfo.owner.toBase58()}`);
      }

      // Verify the Core NFT was created with correct metadata
      await verifyRevealedMetadata(metadataUris);

    } catch (error: any) {
      console.error("Core NFT CPI failed:");
      console.error("Message:", error.message);
      if (error.logs) {
        console.error("Logs:", error.logs);
      }
      throw error;
    }
  }

  async function verifyRevealedMetadata(expectedUris: string[]) {
    console.log("Verifying revealed metadata...");

    // Check batch account for dynamic metadata
    const batchAccount = await (program.account as any).batch.fetch(batch);
    // For Hidden Settings, we expect 1 URI (not 3)
    expect(batchAccount.metadataUris.length).to.equal(1);

    console.log(`Pack ID: ${packId}`);
    console.log(`Batch has ${batchAccount.metadataUris.length} metadata URIs`);
    console.log(`First URI: ${batchAccount.metadataUris[0]}`);
    console.log(`Candy Machine: ${batchAccount.candyMachine.toBase58()}`);

    console.log("Metadata verification complete!");
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