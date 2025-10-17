import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { Wallet } from '@coral-xyz/anchor';
import fs from 'fs';
import path from 'path';
import { logger } from '../middlewares/logger';
import { AppError } from '../middlewares/errorHandler';
import bs58 from 'bs58';

export class SolanaService {
  private connection: Connection;
  private program: Program | null = null;
  private isInitialized: boolean = false;

  constructor() {
    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.initializeProvider();
  }

  private initializeProvider() {
    try {
      const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
      let walletKeypair: Keypair | null = null;
      if (adminPrivateKey && adminPrivateKey !== 'your-admin-private-key-here') {
        // Try JSON array
        try {
          if (adminPrivateKey.trim().startsWith('[')) {
            const arr = JSON.parse(adminPrivateKey);
            walletKeypair = Keypair.fromSecretKey(Uint8Array.from(arr));
          }
        } catch {}
        // Try base58
        if (!walletKeypair) {
          try {
            const decoded58 = bs58.decode(adminPrivateKey);
            walletKeypair = Keypair.fromSecretKey(Uint8Array.from(decoded58));
          } catch {}
        }
        // Try base64
        if (!walletKeypair) {
          try {
            const decoded64 = Buffer.from(adminPrivateKey, 'base64');
            walletKeypair = Keypair.fromSecretKey(Uint8Array.from(decoded64));
          } catch {}
        }
        if (!walletKeypair) {
          logger.warn('ADMIN_PRIVATE_KEY provided but could not be parsed; falling back to ephemeral keypair (read-only)');
        }
      }
      if (!walletKeypair) {
        logger.warn('ADMIN_PRIVATE_KEY not set; proceeding in read-only mode with an ephemeral keypair');
        walletKeypair = Keypair.generate();
      }

      const wallet = new Wallet(walletKeypair);
      const provider = new AnchorProvider(this.connection, wallet, {
        commitment: 'confirmed',
      });

      // Load IDL (support multiple possible locations depending on build/runtime)
      const repoRoot = path.resolve(__dirname, '../../../..');
      const candidateIdlPaths = [
        path.join(repoRoot, 'solana/target/idl/skinvault.json'),
        path.resolve(process.cwd(), 'solana/target/idl/skinvault.json'),
        path.resolve(process.cwd(), '../solana/target/idl/skinvault.json'),
        path.resolve(process.cwd(), '../../solana/target/idl/skinvault.json'),
        path.resolve(__dirname, '../../../solana/target/idl/skinvault.json'),
        path.resolve(__dirname, '../../solana/target/idl/skinvault.json'),
        path.resolve(__dirname, '../../../../solana/target/idl/skinvault.json'),
      ];
      const idlPath = candidateIdlPaths.find((p) => fs.existsSync(p));
      if (!idlPath) {
        logger.warn(`IDL file not found in expected locations: ${candidateIdlPaths.join(', ')}`);
        return;
      }

      logger.info(`Using IDL at: ${idlPath}`);

      const idl = JSON.parse(fs.readFileSync(idlPath, 'utf-8'));
      const programId = new PublicKey(idl.address || process.env.PROGRAM_ID || 'F6u8iKAKRFTYCmZU2uK2QDQqa9bbhfZ1YMHMNXZPp71m');

      // Skip Anchor Program for now - use direct RPC calls
      // The IDL is missing required type definitions for Anchor Program constructor
      this.program = null; // We'll use direct RPC calls instead
      this.isInitialized = true;

      logger.info('Solana service initialized successfully (using direct RPC calls)');
    } catch (error) {
      logger.error('Failed to initialize Solana service:', error);
      this.isInitialized = false;
    }
  }

  private ensureInitialized() {
    if (!this.isInitialized) {
      this.initializeProvider();
    }
    if (!this.isInitialized) {
      throw new AppError('Solana service not initialized', 500);
    }
  }

  async getGlobalState(): Promise<any> {
    this.ensureInitialized();

    try {
      const [globalPDA] = this.getGlobalPDA();
      // Use direct RPC call instead of Anchor Program
      const accountInfo = await this.connection.getAccountInfo(globalPDA);
      if (!accountInfo) {
        throw new Error('Global state account not found');
      }
      // For now, return basic account info - you'll need to deserialize properly
      return { 
        address: globalPDA.toBase58(),
        data: accountInfo.data,
        lamports: accountInfo.lamports 
      };
    } catch (error) {
      logger.error('Error fetching global state:', error);
      throw new AppError('Failed to fetch global state', 500);
    }
  }

  async getBatchState(batchId: number): Promise<any> {
    this.ensureInitialized();

    try {
      const [batchPDA] = this.getBatchPDA(batchId);
      // Use direct RPC call instead of Anchor Program
      const accountInfo = await this.connection.getAccountInfo(batchPDA);
      if (!accountInfo) {
        throw new Error('Batch state account not found');
      }
      // For now, return basic account info - you'll need to deserialize properly
      return { 
        address: batchPDA.toBase58(),
        data: accountInfo.data,
        lamports: accountInfo.lamports,
        batchId // Add batchId for reference
      };
    } catch (error) {
      logger.error('Error fetching batch state:', error);
      throw new AppError('Failed to fetch batch state', 500);
    }
  }

  async getBoxState(boxAsset: PublicKey): Promise<any> {
    this.ensureInitialized();

    try {
      const [boxPDA] = this.getBoxPDA(boxAsset);
      const boxState = await this.program.account.boxState.fetch(boxPDA);
      return boxState;
    } catch (error) {
      logger.error('Error fetching box state:', error);
      throw new AppError('Failed to fetch box state', 500);
    }
  }

  private getGlobalPDA(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('global')],
      new PublicKey(process.env.PROGRAM_ID || 'F6u8iKAKRFTYCmZU2uK2QDQqa9bbhfZ1YMHMNXZPp71m')
    );
  }

  private getBatchPDA(batchId: number): [PublicKey, number] {
    // Seed is batchId as 8-byte LE per Anchor convention for u64 seeds
    const batchSeed = Buffer.alloc(8);
    batchSeed.writeBigUInt64LE(BigInt(batchId));
    return PublicKey.findProgramAddressSync(
      [Buffer.from('batch'), batchSeed],
      new PublicKey(process.env.PROGRAM_ID || 'F6u8iKAKRFTYCmZU2uK2QDQqa9bbhfZ1YMHMNXZPp71m')
    );
  }

  private getBoxPDA(boxAsset: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('box'), boxAsset.toBuffer()],
      new PublicKey(process.env.PROGRAM_ID || 'F6u8iKAKRFTYCmZU2uK2QDQqa9bbhfZ1YMHMNXZPp71m')
    );
  }

  async initializeGlobalState(): Promise<string> {
    if (!this.isInitialized || !this.program) {
      throw new AppError('Solana service not initialized', 500);
    }

    try {
      const [globalPDA] = this.getGlobalPDA();
      const tx = await this.program.methods
        .initializeGlobalState()
        .accounts({
          global: globalPDA,
          authority: this.program.provider.wallet.publicKey,
          systemProgram: require('@solana/web3.js').SystemProgram.programId,
        })
        .rpc();

      return tx;
    } catch (error) {
      logger.error('Error initializing global state:', error);
      throw new AppError('Failed to initialize global state', 500);
    }
  }

  async publishMerkleRoot(batchId: number, merkleRoot: number[]): Promise<string> {
    if (!this.isInitialized || !this.program) {
      throw new AppError('Solana service not initialized', 500);
    }

    try {
      const [globalPDA] = this.getGlobalPDA();
      const [batchPDA] = this.getBatchPDA(batchId);
      
      const tx = await this.program.methods
        .publishMerkleRoot(batchId, merkleRoot)
        .accounts({
          global: globalPDA,
          batch: batchPDA,
          authority: this.program.provider.wallet.publicKey,
          systemProgram: require('@solana/web3.js').SystemProgram.programId,
        })
        .rpc();

      return tx;
    } catch (error) {
      logger.error('Error publishing merkle root:', error);
      throw new AppError('Failed to publish merkle root', 500);
    }
  }

  async createBox(batchId: number, boxAsset: PublicKey): Promise<string> {
    if (!this.isInitialized || !this.program) {
      throw new AppError('Solana service not initialized', 500);
    }

    try {
      const [globalPDA] = this.getGlobalPDA();
      const [batchPDA] = this.getBatchPDA(batchId);
      const [boxPDA] = this.getBoxPDA(boxAsset);
      
      const tx = await this.program.methods
        .createBox(batchId, boxAsset)
        .accounts({
          global: globalPDA,
          batch: batchPDA,
          boxState: boxPDA,
          authority: this.program.provider.wallet.publicKey,
          systemProgram: require('@solana/web3.js').SystemProgram.programId,
        })
        .rpc();

      return tx;
    } catch (error) {
      logger.error('Error creating box:', error);
      throw new AppError('Failed to create box', 500);
    }
  }
}
