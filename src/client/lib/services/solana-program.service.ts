import { Connection, PublicKey, SystemProgram, Keypair, Transaction } from '@solana/web3.js';
import { AnchorProvider, BN, Idl, Program } from '@coral-xyz/anchor';
import { WalletContextState } from '@solana/wallet-adapter-react';
import idlJson from '../solana/idl/skinvault.json';

// Type the IDL properly
interface SkinVaultIdl extends Idl {
  address: string;
  instructions: any[];
  accounts: any[];
  types: any[];
}

export class SolanaProgramService {
  private connection: Connection;
  private programId: PublicKey;
  private idl: Idl;

  constructor(rpcUrl: string, programId: string) {
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.idl = idlJson as SkinVaultIdl;
    // Use program ID from IDL instead of parameter
    this.programId = new PublicKey(this.idl.address);
  }

  public getGlobalPDA(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync([Buffer.from('global')], this.programId);
  }

  public async getGlobalState(): Promise<any> {
    try {
      const [globalPDA] = this.getGlobalPDA();
      const accountInfo = await this.connection.getAccountInfo(globalPDA);
      if (!accountInfo) {
        throw new Error('Global state account not found');
      }
      // For now, return basic account info - you'll need to deserialize properly
      return {
        address: globalPDA.toBase58(),
        data: accountInfo.data,
        lamports: accountInfo.lamports,
        currentBatch: 0 // Default fallback
      };
    } catch (error) {
      console.error('Error fetching global state:', error);
      throw error;
    }
  }

  public getBatchPDA(batchId: number): [PublicKey, number] {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(BigInt(batchId));
    return PublicKey.findProgramAddressSync([Buffer.from('batch'), buf], this.programId);
  }

  public async getBatchInfo(batchId: number): Promise<{ priceSol: number }> {
    try {
      const [batchPDA] = this.getBatchPDA(batchId);
      
      // Use Anchor program to properly fetch and deserialize the batch account
      const provider = new AnchorProvider(this.connection, {} as any, { commitment: 'confirmed' });
      const program = this.program(provider);
      
      const batchAccount = await program.account.batch.fetch(batchPDA);
      console.log('Batch account data:', batchAccount);
      
      return {
        priceSol: batchAccount.priceSol.toNumber()
      };
    } catch (error) {
      console.error('Error fetching batch info:', error);
      throw error;
    }
  }

  public getBoxPDA(owner: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync([Buffer.from('box'), owner.toBuffer()], this.programId);
  }

  public getVrfPendingPDA(boxMint: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync([Buffer.from('vrf_pending'), boxMint.toBuffer()], this.programId);
  }

  public async createBox(wallet: WalletContextState, params: { batchId: number; boxAsset: PublicKey }): Promise<string> {
    if (!wallet.publicKey || !wallet.signTransaction) throw new Error('Wallet not connected');
    const provider = new AnchorProvider(this.connection, wallet as any, { commitment: 'confirmed' });
    const program = this.program(provider);

    const [global] = this.getGlobalPDA();
    const [box] = this.getBoxPDA(params.boxAsset);

    const tx = await program.methods
      .createBox(new BN(params.batchId))
      .accounts({ 
        global, 
        boxState: box, 
        owner: wallet.publicKey,
        boxAsset: params.boxAsset,
        systemProgram: SystemProgram.programId 
      } as any)
      .rpc();
    return tx;
  }

  private program(provider: AnchorProvider): Program {
    console.log('Creating program with IDL:', this.idl);
    console.log('Program ID from IDL:', this.idl.address);
    console.log('IDL keys:', Object.keys(this.idl));
    console.log('IDL instructions:', this.idl.instructions);
    
    try {
      // Try the new Anchor 0.31.x constructor format
      const program = new Program(this.idl, provider);
      console.log('Program created successfully with new format');
      return program;
    } catch (error) {
      console.error('Error creating program with new format:', error);
      try {
        // Fallback to old format
        const program = new Program(this.idl, this.programId, provider);
        console.log('Program created successfully with old format');
        return program;
      } catch (fallbackError) {
        console.error('Error creating program with old format:', fallbackError);
        throw fallbackError;
      }
    }
  }

  public async openBox(wallet: WalletContextState, params: { batchId: number; poolSize: number; boxAsset: PublicKey; treasury: PublicKey }): Promise<string> {
    if (!wallet.publicKey || !wallet.signTransaction) throw new Error('Wallet not connected');
    const provider = new AnchorProvider(this.connection, wallet as any, { commitment: 'confirmed' });
    const program = this.program(provider);

    // Get batch price from blockchain
    const batchInfo = await this.getBatchInfo(params.batchId);
    const paymentAmount = batchInfo.priceSol;
    
    console.log('Fetched batch info:', batchInfo);
    console.log('Payment amount being sent:', paymentAmount);

    const [global] = this.getGlobalPDA();
    const [batch] = this.getBatchPDA(params.batchId);
    const [box] = this.getBoxPDA(params.boxAsset);
    const [vrfPending] = this.getVrfPendingPDA(params.boxAsset);

    try {
      const tx = await program.methods
        .openBox(new BN(params.poolSize), new BN(paymentAmount))
        .accounts({ 
          global, 
          boxState: box, 
          batch, 
          vrfPending,
          owner: wallet.publicKey,
          treasury: params.treasury,
          systemProgram: SystemProgram.programId 
        } as any)
        .rpc();
      return tx;
    } catch (error: any) {
      // Handle specific payment errors
      if (error.message?.includes('InvalidPaymentAmount')) {
        throw new Error(`Payment amount ${paymentAmount} lamports does not match batch price`);
      }
      if (error.message?.includes('insufficient funds')) {
        throw new Error('Insufficient SOL balance to open pack');
      }
      if (error.message?.includes('InvalidAccountData')) {
        throw new Error('Invalid batch data - batch may not exist or be corrupted');
      }
      throw error;
    }
  }

  public async testInitialize(wallet: WalletContextState): Promise<string> {
    if (!wallet.publicKey || !wallet.signTransaction) throw new Error('Wallet not connected');
    const provider = new AnchorProvider(this.connection, wallet as any, { commitment: 'confirmed' });
    const program = this.program(provider);

    const [global] = this.getGlobalPDA();
    
    // Devnet USDC mint
    const usdcMint = new PublicKey('Gh9ZwEmdLJ8DscKNTkTqVBVDM8E5MNVNY3L9pfWoySAs');
    
    // Get treasury ATA PDA
    const [treasuryAta] = PublicKey.findProgramAddressSync(
      [global.toBuffer(), Buffer.from('associated_token'), usdcMint.toBuffer()],
      new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')
    );

    const tx = await program.methods
      .initialize()
      .accounts({ 
        global, 
        usdcMint,
        treasuryAta,
        authority: wallet.publicKey,
        tokenProgram: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
        associatedTokenProgram: new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'),
        systemProgram: SystemProgram.programId 
      } as any)
      .rpc();
    return tx;
  }

  public async createBatch(wallet: WalletContextState, params: { 
    batchId: number; 
    candyMachine: PublicKey; 
    metadataUris: string[]; 
    merkleRoot: number[];
    priceSol: number;
  }): Promise<string> {
    if (!wallet.publicKey || !wallet.signTransaction) throw new Error('Wallet not connected');
    const provider = new AnchorProvider(this.connection, wallet as any, { commitment: 'confirmed' });
    const program = this.program(provider);

    const [global] = this.getGlobalPDA();
    const [batch] = this.getBatchPDA(params.batchId);
    
    // Convert merkle root array to bytes
    const merkleRootBytes = new Uint8Array(params.merkleRoot);
    
    const tx = await program.methods
      .publishMerkleRoot(
        new BN(params.batchId),
        params.candyMachine,
        params.metadataUris,
        Array.from(merkleRootBytes),
        new BN(Math.floor(Date.now() / 1000)),
        new BN(params.priceSol)
      )
      .accounts({ 
        global, 
        batch,
        authority: wallet.publicKey,
        systemProgram: SystemProgram.programId 
      } as any)
      .rpc();
    return tx;
  }

  public async revealAndClaim(wallet: WalletContextState, params: { batchId: number; boxAsset: PublicKey }): Promise<{ signature: string; asset: string }> {
    if (!wallet.publicKey || !wallet.signTransaction) throw new Error('Wallet not connected');
    const provider = new AnchorProvider(this.connection, wallet as any, { commitment: 'confirmed' });
    const program = this.program(provider);

    const [global] = this.getGlobalPDA();
    const [batch] = this.getBatchPDA(params.batchId);
    const [box] = this.getBoxPDA(params.boxAsset);
    const asset = Keypair.generate();
    const CORE_PROGRAM_ID = new PublicKey('CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d');
    
    // Use a mock collection for now (can be made optional later)
    const collection = new PublicKey('11111111111111111111111111111111');

    console.log('Reveal and claim accounts:', {
      globalState: global.toString(),
      batch: batch.toString(),
      boxState: box.toString(),
      asset: asset.publicKey.toString(),
      collection: collection.toString(),
      user: wallet.publicKey.toString(),
      coreProgram: CORE_PROGRAM_ID.toString()
    });

    try {
      const sig = await program.methods
        .revealAndClaim()
        .accounts({ 
          globalState: global, 
          batch, 
          boxState: box, 
          asset: asset.publicKey, 
          collection,
          user: wallet.publicKey, 
          coreProgram: CORE_PROGRAM_ID, 
          systemProgram: SystemProgram.programId 
        } as any)
        .signers([asset])
        .rpc();

      return { signature: sig, asset: asset.publicKey.toBase58() };
    } catch (error) {
      console.error('Reveal and claim error details:', error);
      throw error;
    }
  }

  /**
   * Combined method that executes createBox + openBox + revealAndClaim in a single transaction
   * This provides better UX as user only needs to sign once
   */
  public async openPackComplete(wallet: WalletContextState, params: { 
    batchId: number; 
    poolSize: number; 
    boxAsset: PublicKey;
    treasury: PublicKey;
  }): Promise<{ signature: string; asset: string }> {
    if (!wallet.publicKey || !wallet.signTransaction) throw new Error('Wallet not connected');
    const provider = new AnchorProvider(this.connection, wallet as any, { commitment: 'confirmed' });
    const program = this.program(provider);

    const [global] = this.getGlobalPDA();
    const [batch] = this.getBatchPDA(params.batchId);
    const [box] = this.getBoxPDA(params.boxAsset);
    const [vrfPending] = this.getVrfPendingPDA(params.boxAsset);
    const asset = Keypair.generate();
    const CORE_PROGRAM_ID = new PublicKey('CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d');
    const collection = new PublicKey('11111111111111111111111111111111');

    console.log('Combined open pack accounts:', {
      globalState: global.toString(),
      batch: batch.toString(),
      boxState: box.toString(),
      vrfPending: vrfPending.toString(),
      asset: asset.publicKey.toString(),
      collection: collection.toString(),
      user: wallet.publicKey.toString(),
      treasury: params.treasury.toString(),
      coreProgram: CORE_PROGRAM_ID.toString()
    });

    try {
      // Build transaction with all 3 instructions
      const tx = await program.methods
        .createBox(new BN(params.batchId))
        .accounts({ 
          global, 
          boxState: box, 
          owner: wallet.publicKey,
          boxAsset: params.boxAsset,
          systemProgram: SystemProgram.programId 
        } as any)
        .instruction();

      // Get batch price from blockchain
      const batchInfo = await this.getBatchInfo(params.batchId);
      const paymentAmount = batchInfo.priceSol;
      
      console.log('💰 Payment Details:', {
        batchId: params.batchId,
        paymentAmount: paymentAmount,
        paymentInSOL: paymentAmount / 1_000_000_000,
        from: wallet.publicKey.toString(),
        to: params.treasury.toString()
      });

      const openTx = await program.methods
        .openBox(new BN(params.poolSize), new BN(paymentAmount))
        .accounts({ 
          global, 
          boxState: box, 
          batch, 
          vrfPending,
          owner: wallet.publicKey,
          treasury: params.treasury,
          systemProgram: SystemProgram.programId 
        } as any)
        .instruction();

      const revealTx = await program.methods
        .revealAndClaim()
        .accounts({ 
          globalState: global, 
          batch, 
          boxState: box, 
          asset: asset.publicKey, 
          collection,
          user: wallet.publicKey, 
          coreProgram: CORE_PROGRAM_ID, 
          systemProgram: SystemProgram.programId 
        } as any)
        .instruction();

      // Combine all instructions into a single transaction
      const combinedTx = new Transaction()
        .add(tx)
        .add(openTx)
        .add(revealTx);

      // Helper to (re)prepare, sign and send
      const sendWithFreshBlockhash = async (): Promise<string> => {
        const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('finalized');
        combinedTx.recentBlockhash = blockhash;
        combinedTx.feePayer = wallet.publicKey!;

        // First, partial sign with additional signer(s)
        combinedTx.partialSign(asset);
        // Then, wallet signs
        const walletSigned = await wallet.signTransaction!(combinedTx);

        const raw = walletSigned.serialize();
        const sig = await this.connection.sendRawTransaction(raw, {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
          maxRetries: 3,
        });

        // Confirm to avoid stale blockhash race
        await this.connection.confirmTransaction(
          { signature: sig, blockhash, lastValidBlockHeight },
          'confirmed'
        );
        
        console.log('✅ Transaction confirmed:', {
          signature: sig,
          paymentAmount: paymentAmount,
          paymentInSOL: paymentAmount / 1_000_000_000,
          treasury: params.treasury.toString()
        });
        
        return sig;
      };

      // Try once, retry on blockhash error
      try {
        const signature = await sendWithFreshBlockhash();
        return { signature, asset: asset.publicKey.toBase58() };
      } catch (e: any) {
        const message = String(e?.message || '').toLowerCase();
        if (message.includes('blockhash not found') || message.includes('expired')) {
          const signature = await sendWithFreshBlockhash();
          return { signature, asset: asset.publicKey.toBase58() };
        }
        // Attempt to simulate for better logs before throwing
        try {
          const sim = await this.connection.simulateTransaction(combinedTx, { sigVerify: false });
          console.error('Simulation logs:', sim?.value?.logs || []);
        } catch {}
        throw e;
      }
    } catch (error) {
      console.error('Combined open pack error details:', error);
      throw error;
    }
  }
}


