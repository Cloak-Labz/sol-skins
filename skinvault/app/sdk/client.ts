import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  Connection,
  Transaction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Skinvault } from "../types/skinvault";

export class SkinVaultClient {
  constructor(
    public program: Program<Skinvault>,
    public connection: Connection,
    public wallet: anchor.Wallet
  ) {}

  static create(
    connection: Connection,
    wallet: anchor.Wallet,
    programId: PublicKey
  ): SkinVaultClient {
    const provider = new anchor.AnchorProvider(connection, wallet, {});
    // Note: In a real implementation, you'd load the IDL from a known source
    const program = new Program<Skinvault>(
      {} as any, // IDL would be loaded here
      programId,
      provider
    );
    return new SkinVaultClient(program, connection, wallet);
  }

  // PDA Helpers
  getGlobalPda(authority: PublicKey): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("skinvault"), authority.toBuffer()],
      this.program.programId
    );
    return pda;
  }

  getBatchPda(batchId: number): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("batch"), new BN(batchId).toArrayLike(Buffer, "le", 8)],
      this.program.programId
    );
    return pda;
  }

  getBoxStatePda(nftMint: PublicKey): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("box"), nftMint.toBuffer()],
      this.program.programId
    );
    return pda;
  }

  getPriceStorePda(inventoryHash: Uint8Array): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("price"), Buffer.from(inventoryHash)],
      this.program.programId
    );
    return pda;
  }

  getVrfPendingPda(nftMint: PublicKey): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vrf_pending"), nftMint.toBuffer()],
      this.program.programId
    );
    return pda;
  }

  async getTreasuryAta(
    globalPda: PublicKey,
    usdcMint: PublicKey
  ): Promise<PublicKey> {
    return await getAssociatedTokenAddress(usdcMint, globalPda, true);
  }

  // Instruction Methods
  async initialize(
    authority: Keypair,
    oraclePublicKey: PublicKey,
    usdcMint: PublicKey
  ): Promise<string> {
    const globalPda = this.getGlobalPda(authority.publicKey);
    const treasuryAta = await this.getTreasuryAta(globalPda, usdcMint);

    return await this.program.methods
      .initialize(oraclePublicKey)
      .accounts({
        global: globalPda,
        usdcMint: usdcMint,
        treasuryAta: treasuryAta,
        authority: authority.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([authority])
      .rpc();
  }

  async publishMerkleRoot(
    authority: Keypair,
    batchId: number,
    merkleRoot: Uint8Array,
    snapshotTime: number,
    totalItems: number
  ): Promise<string> {
    const globalPda = this.getGlobalPda(authority.publicKey);
    const batchPda = this.getBatchPda(batchId);

    return await this.program.methods
      .publishMerkleRoot(
        new BN(batchId),
        Array.from(merkleRoot),
        new BN(snapshotTime),
        new BN(totalItems)
      )
      .accounts({
        global: globalPda,
        batch: batchPda,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([authority])
      .rpc();
  }

  async mintBox(
    user: Keypair,
    batchId: number,
    nftMint: PublicKey,
    nftAta: PublicKey,
    metadataUri: string
  ): Promise<string> {
    const authority = this.wallet.publicKey;
    const globalPda = this.getGlobalPda(authority);
    const batchPda = this.getBatchPda(batchId);
    const boxStatePda = this.getBoxStatePda(nftMint);

    return await this.program.methods
      .mintBox(new BN(batchId), metadataUri)
      .accounts({
        global: globalPda,
        batch: batchPda,
        nftMint: nftMint,
        nftAta: nftAta,
        boxState: boxStatePda,
        payer: user.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([user])
      .rpc();
  }

  async openBox(
    owner: Keypair,
    nftMint: PublicKey,
    poolSize: number
  ): Promise<string> {
    const boxStatePda = this.getBoxStatePda(nftMint);
    const vrfPendingPda = this.getVrfPendingPda(nftMint);

    // Get batch ID from box state
    const boxAccount = await this.program.account.boxState.fetch(boxStatePda);
    const batchPda = this.getBatchPda(boxAccount.batchId.toNumber());

    return await this.program.methods
      .openBox(new BN(poolSize))
      .accounts({
        boxState: boxStatePda,
        batch: batchPda,
        vrfPending: vrfPendingPda,
        owner: owner.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([owner])
      .rpc();
  }

  async vrfCallback(
    requestId: number,
    randomness: Uint8Array,
    nftMint: PublicKey
  ): Promise<string> {
    const boxStatePda = this.getBoxStatePda(nftMint);
    const vrfPendingPda = this.getVrfPendingPda(nftMint);

    // Get batch ID and owner from box state
    const boxAccount = await this.program.account.boxState.fetch(boxStatePda);
    const batchPda = this.getBatchPda(boxAccount.batchId.toNumber());

    return await this.program.methods
      .vrfCallback(new BN(requestId), Array.from(randomness))
      .accounts({
        batch: batchPda,
        boxState: boxStatePda,
        vrfPending: vrfPendingPda,
        boxOwner: boxAccount.owner,
      })
      .rpc();
  }

  async assign(
    signer: Keypair,
    nftMint: PublicKey,
    inventoryIdHash: Uint8Array,
    merkleProof: Uint8Array[],
    backendSignature?: Uint8Array
  ): Promise<string> {
    const boxStatePda = this.getBoxStatePda(nftMint);

    // Get batch ID from box state
    const boxAccount = await this.program.account.boxState.fetch(boxStatePda);
    const batchPda = this.getBatchPda(boxAccount.batchId.toNumber());

    return await this.program.methods
      .assign(
        Array.from(inventoryIdHash),
        merkleProof.map((p) => Array.from(p)),
        backendSignature ? Array.from(backendSignature) : null
      )
      .accounts({
        batch: batchPda,
        boxState: boxStatePda,
        signer: signer.publicKey,
      })
      .signers([signer])
      .rpc();
  }

  async setPriceSigned(
    payer: Keypair,
    inventoryIdHash: Uint8Array,
    price: number,
    timestamp: number,
    signature: Uint8Array
  ): Promise<string> {
    const authority = this.wallet.publicKey;
    const globalPda = this.getGlobalPda(authority);
    const priceStorePda = this.getPriceStorePda(inventoryIdHash);

    return await this.program.methods
      .setPriceSigned(
        Array.from(inventoryIdHash),
        new BN(price),
        new BN(timestamp),
        Array.from(signature)
      )
      .accounts({
        global: globalPda,
        priceStore: priceStorePda,
        payer: payer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([payer])
      .rpc();
  }

  async sellBack(
    seller: Keypair,
    nftMint: PublicKey,
    usdcMint: PublicKey,
    userUsdcAta: PublicKey,
    minPrice: number
  ): Promise<string> {
    const authority = this.wallet.publicKey;
    const globalPda = this.getGlobalPda(authority);
    const treasuryAta = await this.getTreasuryAta(globalPda, usdcMint);
    const boxStatePda = this.getBoxStatePda(nftMint);

    // Get inventory hash from box state
    const boxAccount = await this.program.account.boxState.fetch(boxStatePda);
    const priceStorePda = this.getPriceStorePda(boxAccount.assignedInventory);

    return await this.program.methods
      .sellBack(new BN(minPrice))
      .accounts({
        global: globalPda,
        treasuryAta: treasuryAta,
        userAta: userUsdcAta,
        usdcMint: usdcMint,
        priceStore: priceStorePda,
        boxState: boxStatePda,
        seller: seller.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([seller])
      .rpc();
  }

  // Admin Methods
  async setOracle(
    authority: Keypair,
    newOraclePublicKey: PublicKey
  ): Promise<string> {
    const globalPda = this.getGlobalPda(authority.publicKey);

    return await this.program.methods
      .setOracle(newOraclePublicKey)
      .accounts({
        global: globalPda,
        authority: authority.publicKey,
      })
      .signers([authority])
      .rpc();
  }

  async toggleBuyback(authority: Keypair, enabled: boolean): Promise<string> {
    const globalPda = this.getGlobalPda(authority.publicKey);

    return await this.program.methods
      .toggleBuyback(enabled)
      .accounts({
        global: globalPda,
        authority: authority.publicKey,
      })
      .signers([authority])
      .rpc();
  }

  async depositTreasury(
    depositor: Keypair,
    amount: number,
    usdcMint: PublicKey,
    depositorAta: PublicKey
  ): Promise<string> {
    const authority = this.wallet.publicKey;
    const globalPda = this.getGlobalPda(authority);
    const treasuryAta = await this.getTreasuryAta(globalPda, usdcMint);

    return await this.program.methods
      .depositTreasury(new BN(amount))
      .accounts({
        global: globalPda,
        treasuryAta: treasuryAta,
        depositorAta: depositorAta,
        usdcMint: usdcMint,
        depositor: depositor.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([depositor])
      .rpc();
  }

  // Query Methods
  async getGlobalState(authority: PublicKey) {
    const globalPda = this.getGlobalPda(authority);
    return await this.program.account.global.fetch(globalPda);
  }

  async getBatchState(batchId: number) {
    const batchPda = this.getBatchPda(batchId);
    return await this.program.account.batch.fetch(batchPda);
  }

  async getBoxState(nftMint: PublicKey) {
    const boxStatePda = this.getBoxStatePda(nftMint);
    return await this.program.account.boxState.fetch(boxStatePda);
  }

  async getPriceState(inventoryHash: Uint8Array) {
    const priceStorePda = this.getPriceStorePda(inventoryHash);
    return await this.program.account.priceStore.fetch(priceStorePda);
  }

  async getTreasuryBalance(
    authority: PublicKey,
    usdcMint: PublicKey
  ): Promise<number> {
    const globalPda = this.getGlobalPda(authority);
    const treasuryAta = await this.getTreasuryAta(globalPda, usdcMint);
    const balance = await this.connection.getTokenAccountBalance(treasuryAta);
    return balance.value.uiAmount || 0;
  }

  // Event Listeners
  addEventListener(
    eventName: string,
    callback: (event: any, slot: number, signature: string) => void
  ) {
    return this.program.addEventListener(eventName, callback);
  }

  removeEventListener(listenerId: number) {
    return this.program.removeEventListener(listenerId);
  }
}
