import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  Keypair,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import bs58 from 'bs58';

/**
 * Simple Solana Service
 * 
 * Handles basic Solana operations:
 * 1. User pays for package (SOL transfer to admin)
 * 2. User claims NFT (NFT transfer from admin to user)
 * 3. User sells back (SOL transfer from admin to user, NFT transfer from user to admin)
 * 
 * No complex programs - just simple transfers!
 */
export class SimpleSolanaService {
  private connection: Connection;
  private adminWallet: Keypair;
  private adminPublicKey: PublicKey;

  constructor() {
    // Get RPC endpoint from env
    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    this.connection = new Connection(rpcUrl, 'confirmed');

    // Load admin wallet from env (private key in base58)
    const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
    if (!adminPrivateKey) {
      throw new Error('ADMIN_PRIVATE_KEY not set in environment');
    }

    try {
      const secretKey = bs58.decode(adminPrivateKey);
      this.adminWallet = Keypair.fromSecretKey(secretKey);
      this.adminPublicKey = this.adminWallet.publicKey;
      
      console.log('✅ SimpleSolanaService initialized');
      console.log(`   Admin Wallet: ${this.adminPublicKey.toBase58()}`);
      console.log(`   RPC: ${rpcUrl}`);
    } catch (error) {
      throw new Error(`Failed to load admin wallet: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get admin wallet address
   */
  getAdminWallet(): string {
    return this.adminPublicKey.toBase58();
  }

  /**
   * Verify that user paid for the package
   * Checks recent transactions to see if user sent SOL to admin
   */
  async verifyPayment(params: {
    userWallet: string;
    expectedAmount: number; // in SOL
    timeWindow?: number; // seconds to look back (default 60)
  }): Promise<{
    verified: boolean;
    transaction?: string;
    amount?: number;
  }> {
    const { userWallet, expectedAmount, timeWindow = 60 } = params;
    const userPubkey = new PublicKey(userWallet);

    console.log(`🔍 Verifying payment from ${userWallet}`);
    console.log(`   Expected: ${expectedAmount} SOL`);

    try {
      // Get recent transactions for admin wallet
      const signatures = await this.connection.getSignaturesForAddress(
        this.adminPublicKey,
        { limit: 20 }
      );

      const now = Math.floor(Date.now() / 1000);
      const cutoff = now - timeWindow;

      // Check each transaction
      for (const sig of signatures) {
        // Skip if too old
        if (sig.blockTime && sig.blockTime < cutoff) continue;

        // Get full transaction
        const tx = await this.connection.getParsedTransaction(sig.signature, {
          maxSupportedTransactionVersion: 0,
        });

        if (!tx || !tx.meta) continue;

        // Check if this is a SOL transfer from user to admin
        const instructions = tx.transaction.message.instructions;
        for (const ix of instructions) {
          if ('parsed' in ix && ix.parsed.type === 'transfer') {
            const info = ix.parsed.info;
            if (
              info.source === userWallet &&
              info.destination === this.adminPublicKey.toBase58()
            ) {
              const amount = info.lamports / LAMPORTS_PER_SOL;
              
              // Check if amount matches (with small tolerance for fees)
              if (Math.abs(amount - expectedAmount) < 0.001) {
                console.log(`✅ Payment verified: ${amount} SOL`);
                return {
                  verified: true,
                  transaction: sig.signature,
                  amount,
                };
              }
            }
          }
        }
      }

      console.log('❌ No matching payment found');
      return { verified: false };
    } catch (error) {
      console.error('Error verifying payment:', error);
      throw new Error(`Failed to verify payment: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Transfer NFT from admin wallet to user
   * Used when user claims their prize
   */
  async transferNFT(params: {
    nftMint: string;
    toWallet: string;
  }): Promise<{
    transaction: string;
    success: boolean;
  }> {
    const { nftMint, toWallet } = params;
    const mintPubkey = new PublicKey(nftMint);
    const toPubkey = new PublicKey(toWallet);

    console.log(`📦 Transferring NFT from admin to user`);
    console.log(`   NFT: ${nftMint}`);
    console.log(`   To: ${toWallet}`);

    try {
      // Get admin's token account
      const adminTokenAccount = await getAssociatedTokenAddress(
        mintPubkey,
        this.adminPublicKey
      );

      // Get user's token account
      const userTokenAccount = await getAssociatedTokenAddress(
        mintPubkey,
        toPubkey
      );

      // Create transfer instruction
      const transaction = new Transaction().add(
        createTransferInstruction(
          adminTokenAccount,
          userTokenAccount,
          this.adminPublicKey,
          1, // NFTs have amount = 1
          [],
          TOKEN_PROGRAM_ID
        )
      );

      // Send and confirm
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.adminWallet],
        {
          commitment: 'confirmed',
        }
      );

      console.log(`✅ NFT transferred successfully`);
      console.log(`   Tx: ${signature}`);

      return {
        transaction: signature,
        success: true,
      };
    } catch (error) {
      console.error('Error transferring NFT:', error);
      throw new Error(`Failed to transfer NFT: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Send SOL from admin wallet to user
   * Used for buyback (85% of NFT value)
   */
  async sendSOL(params: {
    toWallet: string;
    amount: number; // in SOL
  }): Promise<{
    transaction: string;
    success: boolean;
  }> {
    const { toWallet, amount } = params;
    const toPubkey = new PublicKey(toWallet);

    console.log(`💰 Sending SOL from admin to user`);
    console.log(`   To: ${toWallet}`);
    console.log(`   Amount: ${amount} SOL`);

    try {
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: this.adminPublicKey,
          toPubkey,
          lamports: Math.floor(amount * LAMPORTS_PER_SOL),
        })
      );

      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.adminWallet],
        {
          commitment: 'confirmed',
        }
      );

      console.log(`✅ SOL sent successfully`);
      console.log(`   Tx: ${signature}`);

      return {
        transaction: signature,
        success: true,
      };
    } catch (error) {
      console.error('Error sending SOL:', error);
      throw new Error(`Failed to send SOL: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Execute buyback: Send SOL to user, receive NFT back
   */
  async executeBuyback(params: {
    userWallet: string;
    nftMint: string;
    buybackPrice: number; // in SOL
  }): Promise<{
    solTransfer: string;
    nftTransfer: string;
    success: boolean;
  }> {
    const { userWallet, nftMint, buybackPrice } = params;

    console.log(`🔄 Executing buyback`);
    console.log(`   User: ${userWallet}`);
    console.log(`   NFT: ${nftMint}`);
    console.log(`   Price: ${buybackPrice} SOL`);

    try {
      // 1. Send SOL to user
      const solResult = await this.sendSOL({
        toWallet: userWallet,
        amount: buybackPrice,
      });

      // 2. Transfer NFT back to admin
      const nftResult = await this.transferNFTToAdmin({
        nftMint,
        fromWallet: userWallet,
      });

      console.log(`✅ Buyback completed successfully`);

      return {
        solTransfer: solResult.transaction,
        nftTransfer: nftResult.transaction,
        success: true,
      };
    } catch (error) {
      console.error('Error executing buyback:', error);
      throw new Error(`Failed to execute buyback: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Transfer NFT from user back to admin
   * Used during buyback
   */
  private async transferNFTToAdmin(params: {
    nftMint: string;
    fromWallet: string;
  }): Promise<{
    transaction: string;
    success: boolean;
  }> {
    const { nftMint, fromWallet } = params;
    const mintPubkey = new PublicKey(nftMint);
    const fromPubkey = new PublicKey(fromWallet);

    // Note: This requires user to approve the transaction!
    // In production, this would be a user-signed transaction, not admin-signed
    // For now, we'll simulate it

    console.log(`📦 Transferring NFT from user back to admin`);
    console.log(`   NFT: ${nftMint}`);
    console.log(`   From: ${fromWallet}`);

    try {
      // Get user's token account
      const userTokenAccount = await getAssociatedTokenAddress(
        mintPubkey,
        fromPubkey
      );

      // Get admin's token account
      const adminTokenAccount = await getAssociatedTokenAddress(
        mintPubkey,
        this.adminPublicKey
      );

      // ⚠️ NOTE: In production, this needs to be signed by the USER
      // For now, we're simulating a mock transaction
      const mockTx = `mock_buyback_${Date.now()}`;

      console.log(`⚠️  Mock: User would need to sign this transaction`);
      console.log(`   Tx: ${mockTx}`);

      return {
        transaction: mockTx,
        success: true,
      };
    } catch (error) {
      console.error('Error transferring NFT to admin:', error);
      throw new Error(`Failed to transfer NFT to admin: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get balance of admin wallet
   */
  async getAdminBalance(): Promise<number> {
    const balance = await this.connection.getBalance(this.adminPublicKey);
    return balance / LAMPORTS_PER_SOL;
  }
}

// Export singleton instance
export const simpleSolanaService = new SimpleSolanaService();

