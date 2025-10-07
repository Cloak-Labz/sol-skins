import { 
  PublicKey, 
  Transaction, 
  SystemProgram,
  Connection,
  Keypair,
} from '@solana/web3.js';
import { Program, AnchorProvider, BN, Idl } from '@coral-xyz/anchor';
import { WalletContextState } from '@solana/wallet-adapter-react';

// Import IDL - load it properly for Anchor 0.31.x
import skinvaultIdlJson from '../solana/idl/skinvault.json';

export interface OpenBoxParams {
  poolSize: number;
}

export interface RevealAndClaimParams {
  // Add any necessary params
}

export class SolanaProgramService {
  private connection: Connection;
  private programId: PublicKey;
  private idl: Idl;

  constructor(rpcUrl: string, programId: string) {
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.programId = new PublicKey(programId);
    // Cast the JSON to Idl type for Anchor 0.31.x
    this.idl = skinvaultIdlJson as Idl;
  }

  /**
   * Get the Global state PDA address
   */
  public getGlobalPDA(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('global')],
      this.programId
    );
  }

  /**
   * Get the Box state PDA address for a user
   */
  public getBoxPDA(userPubkey: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('box'), userPubkey.toBuffer()],
      this.programId
    );
  }

  /**
   * Get the Batch PDA address for a batch ID
   */
  public getBatchPDA(batchId: number): [PublicKey, number] {
    const batchIdBuffer = Buffer.alloc(8);
    batchIdBuffer.writeBigUInt64LE(BigInt(batchId));
    
    return PublicKey.findProgramAddressSync(
      [Buffer.from('batch'), batchIdBuffer],
      this.programId
    );
  }

  /**
   * Open a box (client-side transaction)
   */
  public async openBox(
    wallet: WalletContextState,
    params: OpenBoxParams
  ): Promise<string> {
    if (!wallet.publicKey || !wallet.signTransaction) {
      throw new Error('Wallet not connected');
    }

    try {
      // Create provider
      const provider = new AnchorProvider(
        this.connection,
        wallet as any,
        { commitment: 'confirmed' }
      );

      // Initialize program
      const program = new Program(this.idl, provider);

      const [globalPDA] = this.getGlobalPDA();
      const [boxPDA] = this.getBoxPDA(wallet.publicKey);

      // Get box state to determine batch
      const boxState = await program.account.boxState.fetch(boxPDA);
      const batchId = (boxState as any).batchId;
      const [batchPDA] = this.getBatchPDA(batchId);

      console.log('Opening box...', {
        user: wallet.publicKey.toString(),
        boxPDA: boxPDA.toString(),
        batchPDA: batchPDA.toString(),
        poolSize: params.poolSize,
      });

      // Create VRF request PDA (this would need to be generated based on your VRF implementation)
      // For now, using a placeholder
      const vrfRequestPDA = Keypair.generate().publicKey;

      const tx = await program.methods
        .openBox(new BN(params.poolSize))
        .accounts({
          global: globalPDA,
          boxState: boxPDA,
          batch: batchPDA,
          vrfRequest: vrfRequestPDA,
          owner: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc();

      console.log('Box opened successfully!', { signature: tx });
      return tx;
    } catch (error) {
      console.error('Failed to open box:', error);
      throw error;
    }
  }

  /**
   * Reveal and claim NFT after box opening
   */
  public async revealAndClaim(
    wallet: WalletContextState
  ): Promise<string> {
    if (!wallet.publicKey || !wallet.signTransaction) {
      throw new Error('Wallet not connected');
    }

    try {
      // Create provider
      const provider = new AnchorProvider(
        this.connection,
        wallet as any,
        { commitment: 'confirmed' }
      );

      // Initialize program
      const program = new Program(this.idl, provider);

      const [globalPDA] = this.getGlobalPDA();
      const [boxPDA] = this.getBoxPDA(wallet.publicKey);

      // Get box state
      const boxState = await program.account.boxState.fetch(boxPDA);
      const batchId = (boxState as any).batchId;
      const [batchPDA] = this.getBatchPDA(batchId);

      // Get batch state for candy machine
      const batchState = await program.account.batch.fetch(batchPDA);
      const candyMachine = (batchState as any).candyMachine;

      console.log('Revealing and claiming NFT...', {
        user: wallet.publicKey.toString(),
        boxPDA: boxPDA.toString(),
        batchPDA: batchPDA.toString(),
        candyMachine: candyMachine.toString(),
      });

      // Create asset account (new NFT)
      const assetKeypair = Keypair.generate();

      // Metaplex Core program ID
      const CORE_PROGRAM_ID = new PublicKey('CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d');

      const tx = await program.methods
        .revealAndClaim()
        .accounts({
          globalState: globalPDA,
          batch: batchPDA,
          boxState: boxPDA,
          asset: assetKeypair.publicKey,
          candyMachine: candyMachine,
          owner: wallet.publicKey,
          coreProgram: CORE_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        } as any)
        .signers([assetKeypair])
        .rpc();

      console.log('NFT revealed and claimed successfully!', {
        signature: tx,
        asset: assetKeypair.publicKey.toString(),
      });

      return tx;
    } catch (error) {
      console.error('Failed to reveal and claim NFT:', error);
      throw error;
    }
  }

  /**
   * Get box state for a user
   */
  public async getBoxState(userPubkey: PublicKey): Promise<any> {
    try {
      const provider = new AnchorProvider(
        this.connection,
        {} as any,
        { commitment: 'confirmed' }
      );

      const program = new Program(this.idl, provider);

      const [boxPDA] = this.getBoxPDA(userPubkey);
      const boxState = await program.account.boxState.fetch(boxPDA);
      return boxState;
    } catch (error) {
      console.error('Failed to fetch box state:', error);
      throw error;
    }
  }

  /**
   * Get batch state
   */
  public async getBatchState(batchId: number): Promise<any> {
    try {
      const provider = new AnchorProvider(
        this.connection,
        {} as any,
        { commitment: 'confirmed' }
      );

      const program = new Program(this.idl, provider);

      const [batchPDA] = this.getBatchPDA(batchId);
      const batchState = await program.account.batch.fetch(batchPDA);
      return batchState;
    } catch (error) {
      console.error('Failed to fetch batch state:', error);
      throw error;
    }
  }

  /**
   * Get connection
   */
  public getConnection(): Connection {
    return this.connection;
  }

  /**
   * Get program ID
   */
  public getProgramId(): PublicKey {
    return this.programId;
  }

  // ============================================
  // ADMIN FUNCTIONS
  // ============================================

  /**
   * Initialize global state (ADMIN ONLY)
   */
  public async initializeGlobalState(
    wallet: WalletContextState,
    oraclePubkey: PublicKey,
    usdcMint: PublicKey
  ): Promise<string> {
    if (!wallet.publicKey || !wallet.signTransaction) {
      throw new Error('Wallet not connected');
    }

    try {
      const provider = new AnchorProvider(
        this.connection,
        wallet as any,
        { commitment: 'confirmed' }
      );

      const program = new Program(this.idl, provider);

      const [globalPDA] = this.getGlobalPDA();
      
      // Get treasury ATA PDA
      const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCwuBvf9Ss623VQ5DA');
      const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

      const [treasuryATA] = PublicKey.findProgramAddressSync(
        [
          globalPDA.toBuffer(),
          TOKEN_PROGRAM_ID.toBuffer(),
          usdcMint.toBuffer(),
        ],
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      console.log('Initializing global state...', {
        globalPDA: globalPDA.toString(),
        authority: wallet.publicKey.toString(),
        oracle: oraclePubkey.toString(),
        treasuryATA: treasuryATA.toString(),
      });

      const tx = await program.methods
        .initialize(oraclePubkey)
        .accounts({
          global: globalPDA,
          usdcMint: usdcMint,
          treasuryAta: treasuryATA,
          authority: wallet.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc();

      console.log('Global state initialized!', { signature: tx });
      return tx;
    } catch (error) {
      console.error('Failed to initialize global state:', error);
      throw error;
    }
  }

  /**
   * Publish Merkle root for a batch (ADMIN ONLY)
   */
  public async publishMerkleRoot(
    wallet: WalletContextState,
    params: {
      batchId: number;
      candyMachine: PublicKey;
      metadataUris: string[];
      merkleRoot: number[];
      snapshotTime: number;
    }
  ): Promise<string> {
    if (!wallet.publicKey || !wallet.signTransaction) {
      throw new Error('Wallet not connected');
    }

    try {
      const provider = new AnchorProvider(
        this.connection,
        wallet as any,
        { commitment: 'confirmed' }
      );

      const program = new Program(this.idl, provider);

      const [globalPDA] = this.getGlobalPDA();
      const [batchPDA] = this.getBatchPDA(params.batchId);

      console.log('Publishing Merkle root...', {
        batchId: params.batchId,
        batchPDA: batchPDA.toString(),
        candyMachine: params.candyMachine.toString(),
      });

      const tx = await program.methods
        .publishMerkleRoot(
          new BN(params.batchId),
          params.candyMachine,
          params.metadataUris,
          params.merkleRoot,
          new BN(params.snapshotTime)
        )
        .accounts({
          batch: batchPDA,
          global: globalPDA,
          authority: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc();

      console.log('Merkle root published!', { signature: tx });
      return tx;
    } catch (error) {
      console.error('Failed to publish Merkle root:', error);
      throw error;
    }
  }

  /**
   * Create a box for a user (ADMIN ONLY)
   */
  public async createBoxForUser(
    wallet: WalletContextState,
    batchId: number,
    userPubkey: PublicKey
  ): Promise<string> {
    if (!wallet.publicKey || !wallet.signTransaction) {
      throw new Error('Wallet not connected');
    }

    try {
      const provider = new AnchorProvider(
        this.connection,
        wallet as any,
        { commitment: 'confirmed' }
      );

      const program = new Program(this.idl, provider);

      const [globalPDA] = this.getGlobalPDA();
      const [boxPDA] = this.getBoxPDA(userPubkey);
      const [batchPDA] = this.getBatchPDA(batchId);

      console.log('Creating box...', {
        batchId,
        user: userPubkey.toString(),
        boxPDA: boxPDA.toString(),
      });

      const tx = await program.methods
        .createBox(new BN(batchId))
        .accounts({
          global: globalPDA,
          boxState: boxPDA,
          batch: batchPDA,
          owner: userPubkey,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc();

      console.log('Box created!', { signature: tx });
      return tx;
    } catch (error) {
      console.error('Failed to create box:', error);
      throw error;
    }
  }

  /**
   * Check if connected wallet is the admin
   * Checks both program upgrade authority AND global state authority
   */
  public async isAdmin(walletPubkey: PublicKey): Promise<boolean> {
    try {
      // Method 1: Check program upgrade authority (works even before initialization)
      const programAccountInfo = await this.connection.getAccountInfo(this.programId);
      if (programAccountInfo) {
        // Get ProgramData account address
        const PROGRAM_DATA_OFFSET = 4; // Skip discriminator
        const programDataAddress = new PublicKey(
          programAccountInfo.data.slice(PROGRAM_DATA_OFFSET, PROGRAM_DATA_OFFSET + 32)
        );
        
        // Fetch program data account
        const programDataInfo = await this.connection.getAccountInfo(programDataAddress);
        if (programDataInfo) {
          // Upgrade authority is at offset 13 (1 byte for slot + 8 bytes for slot + 1 byte for option + 3 bytes padding)
          const UPGRADE_AUTHORITY_OFFSET = 13;
          const upgradeAuthority = new PublicKey(
            programDataInfo.data.slice(UPGRADE_AUTHORITY_OFFSET, UPGRADE_AUTHORITY_OFFSET + 32)
          );
          
          console.log('Program upgrade authority:', upgradeAuthority.toString());
          console.log('Connected wallet:', walletPubkey.toString());
          
          if (upgradeAuthority.toString() === walletPubkey.toString()) {
            console.log('✅ Wallet matches program upgrade authority');
            return true;
          }
        }
      }

      // Method 2: Check global state authority (if initialized)
      const globalState = await this.getGlobalState();
      if (globalState?.authority) {
        const isGlobalAdmin = globalState.authority.toString() === walletPubkey.toString();
        console.log('Global state authority check:', isGlobalAdmin);
        return isGlobalAdmin;
      }

      console.log('❌ Wallet does not match program authority');
      return false;
    } catch (error) {
      console.error('Failed to check admin status:', error);
      return false;
    }
  }

  /**
   * Get global state (no wallet needed for reading)
   */
  public async getGlobalState(): Promise<any> {
    try {
      const [globalPDA] = this.getGlobalPDA();
      
      // Check if account exists first
      const accountInfo = await this.connection.getAccountInfo(globalPDA);
      if (!accountInfo) {
        console.log('Global state not initialized yet');
        return null;
      }

      // Create minimal provider for read-only operations
      const dummyWallet = {
        publicKey: PublicKey.default,
        signTransaction: async (tx: Transaction) => tx,
        signAllTransactions: async (txs: Transaction[]) => txs,
      };

      const provider = new AnchorProvider(
        this.connection,
        dummyWallet as any,
        { commitment: 'confirmed' }
      );

      const program = new Program(this.idl, provider);
      const globalState = await program.account.global.fetch(globalPDA);
      return globalState;
    } catch (error) {
      console.error('Failed to fetch global state:', error);
      return null;
    }
  }
}
