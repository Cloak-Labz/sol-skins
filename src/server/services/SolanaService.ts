import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js';
import { Program, AnchorProvider, web3, BN, Idl } from '@coral-xyz/anchor';
import { config } from '../config/env';
import bs58 from 'bs58';
import { logger } from '../middlewares/logger';
import * as fs from 'fs';
import * as path from 'path';

// Interfaces for instruction parameters
export interface InitializeParams {
  oraclePubkey: PublicKey;
  usdcMint: PublicKey;
}

export interface PublishMerkleRootParams {
  batchId: number;
  candyMachine: PublicKey;
  metadataUris: string[];
  merkleRoot: number[];
  snapshotTime: number;
}

export interface CreateBoxParams {
  batchId: number;
  userPubkey: PublicKey;
}

export interface OpenBoxParams {
  userPubkey: PublicKey;
  poolSize: number;
}

export class SolanaService {
  private connection: Connection;
  private programId: PublicKey;
  private provider!: AnchorProvider;
  private program!: Program;
  private adminKeypair!: Keypair;

  constructor() {
    this.connection = new Connection(config.solana.rpcUrl, 'confirmed');
    this.programId = new PublicKey(config.solana.programId);
    
    // Try to initialize, but don't fail if there are issues
    try {
      this.initializeProvider();
    } catch (error: any) {
      logger.warn('Solana service initialization failed - program features will be unavailable', {
        error: error.message,
      });
      logger.warn('The backend will still run, but Solana endpoints will not work');
      logger.warn('To fix: ensure IDL file exists and Anchor dependencies are compatible');
    }
  }

  private initializeProvider() {
    try {
      // Load admin keypair from environment or file
      const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
      
      // Validate the private key is not a placeholder
      if (!adminPrivateKey || 
          adminPrivateKey.includes('your_') || 
          adminPrivateKey.includes('_here') ||
          adminPrivateKey.length < 32) {
        throw new Error(
          'Invalid ADMIN_PRIVATE_KEY. ' +
          'Please set a valid base58 encoded private key in your .env file. ' +
          'Generate one with: solana-keygen new'
        );
      }

      this.adminKeypair = Keypair.fromSecretKey(bs58.decode(adminPrivateKey));

      // Create provider
      const wallet = {
        publicKey: this.adminKeypair.publicKey,
        signTransaction: async (tx: Transaction) => {
          tx.partialSign(this.adminKeypair);
          return tx;
        },
        signAllTransactions: async (txs: Transaction[]) => {
          return txs.map(tx => {
            tx.partialSign(this.adminKeypair);
            return tx;
          });
        },
      };

      this.provider = new AnchorProvider(this.connection, wallet as any, {
        commitment: 'confirmed',
      });

      // Load IDL - For Anchor 0.31.x, use JSON but with proper typing
      const idlPath = path.join(__dirname, '../../../solana/target/idl/skinvault.json');
      
      if (!fs.existsSync(idlPath)) {
        throw new Error(
          `IDL file not found at ${idlPath}. ` +
          'Please build the Anchor program first: cd solana && anchor build'
        );
      }
      
      // Load JSON IDL
      const idlJson = JSON.parse(fs.readFileSync(idlPath, 'utf-8'));
      
      // For Anchor 0.31.x: Use the JSON directly without type parameter
      // The Program constructor no longer infers from the IDL argument
      this.program = new Program(idlJson, this.programId, this.provider);

      logger.info('Solana service initialized', {
        programId: this.programId.toString(),
        admin: this.adminKeypair.publicKey.toString(),
      });
    } catch (error: any) {
      logger.error('Failed to initialize Solana service', { 
        error: error.message,
        stack: error.stack,
        hint: 'Check your .env file and IDL compatibility'
      });
      throw error;
    }
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
   * Initialize the global state
   */
  public async initializeGlobalState(params: InitializeParams): Promise<string> {
    try {
      const [globalPDA] = this.getGlobalPDA();

      // Check if already initialized
      try {
        const globalState = await this.program.account.global.fetch(globalPDA);
        logger.info('Global state already initialized', { globalPDA: globalPDA.toString() });
        return globalPDA.toString();
      } catch (e) {
        // Not initialized, proceed
      }

      // Get treasury ATA PDA
      const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCwuBvf9Ss623VQ5DA');
      const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

      const [treasuryATA] = PublicKey.findProgramAddressSync(
        [
          globalPDA.toBuffer(),
          TOKEN_PROGRAM_ID.toBuffer(),
          params.usdcMint.toBuffer(),
        ],
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      logger.info('Initializing global state', {
        globalPDA: globalPDA.toString(),
        authority: this.adminKeypair.publicKey.toString(),
        oracle: params.oraclePubkey.toString(),
        usdcMint: params.usdcMint.toString(),
        treasuryATA: treasuryATA.toString(),
      });

      const tx = await this.program.methods
        .initialize(params.oraclePubkey)
        .accounts({
          global: globalPDA,
          usdcMint: params.usdcMint,
          treasuryAta: treasuryATA,
          authority: this.adminKeypair.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc();

      logger.info('Global state initialized successfully', {
        signature: tx,
        globalPDA: globalPDA.toString(),
      });

      return tx;
    } catch (error) {
      logger.error('Failed to initialize global state', { error });
      throw error;
    }
  }

  /**
   * Publish a Merkle root for a batch
   */
  public async publishMerkleRoot(params: PublishMerkleRootParams): Promise<string> {
    try {
      const [globalPDA] = this.getGlobalPDA();
      const [batchPDA] = this.getBatchPDA(params.batchId);

      logger.info('Publishing Merkle root', {
        batchId: params.batchId,
        batchPDA: batchPDA.toString(),
        candyMachine: params.candyMachine.toString(),
        metadataCount: params.metadataUris.length,
      });

      const tx = await this.program.methods
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
          authority: this.adminKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc();

      logger.info('Merkle root published successfully', {
        signature: tx,
        batchPDA: batchPDA.toString(),
      });

      return tx;
    } catch (error) {
      logger.error('Failed to publish Merkle root', { error });
      throw error;
    }
  }

  /**
   * Create a box for a user
   */
  public async createBox(params: CreateBoxParams): Promise<string> {
    try {
      const [globalPDA] = this.getGlobalPDA();
      const [boxPDA] = this.getBoxPDA(params.userPubkey);
      const [batchPDA] = this.getBatchPDA(params.batchId);

      logger.info('Creating box', {
        batchId: params.batchId,
        user: params.userPubkey.toString(),
        boxPDA: boxPDA.toString(),
      });

      const tx = await this.program.methods
        .createBox(new BN(params.batchId))
        .accounts({
          global: globalPDA,
          boxState: boxPDA,
          batch: batchPDA,
          owner: params.userPubkey,
          systemProgram: SystemProgram.programId,
        } as any)
        .signers([this.adminKeypair])
        .rpc();

      logger.info('Box created successfully', {
        signature: tx,
        boxPDA: boxPDA.toString(),
      });

      return tx;
    } catch (error) {
      logger.error('Failed to create box', { error });
      throw error;
    }
  }

  /**
   * Get global state
   */
  public async getGlobalState(): Promise<any> {
    try {
      const [globalPDA] = this.getGlobalPDA();
      const globalState = await this.program.account.global.fetch(globalPDA);
      return globalState;
    } catch (error) {
      logger.error('Failed to fetch global state', { error });
      throw error;
    }
  }

  /**
   * Get batch state
   */
  public async getBatchState(batchId: number): Promise<any> {
    try {
      const [batchPDA] = this.getBatchPDA(batchId);
      const batchState = await this.program.account.batch.fetch(batchPDA);
      return batchState;
    } catch (error) {
      logger.error('Failed to fetch batch state', { error, batchId });
      throw error;
    }
  }

  /**
   * Get box state for a user
   */
  public async getBoxState(userPubkey: PublicKey): Promise<any> {
    try {
      const [boxPDA] = this.getBoxPDA(userPubkey);
      const boxState = await this.program.account.boxState.fetch(boxPDA);
      return boxState;
    } catch (error) {
      logger.error('Failed to fetch box state', { error, user: userPubkey.toString() });
      throw error;
    }
  }

  /**
   * Get program address
   */
  public getProgramId(): PublicKey {
    return this.programId;
  }

  /**
   * Get connection
   */
  public getConnection(): Connection {
    return this.connection;
  }

  /**
   * Get admin public key
   */
  public getAdminPublicKey(): PublicKey {
    return this.adminKeypair.publicKey;
  }
}
