import { Keypair } from '@solana/web3.js';
import crypto from 'crypto';

/**
 * Mock Solana Service
 *
 * Simulates all Solana blockchain interactions without actual on-chain calls.
 * Perfect for development, testing, and rapid iteration.
 *
 * When MOCK_MODE=false, this can be replaced with real SolanaService.
 */
export class MockSolanaService {
  private readonly mockMode: boolean;

  constructor() {
    this.mockMode = process.env.MOCK_MODE !== 'false';
  }

  /**
   * Mock NFT minting
   * Generates a fake mint address that looks like a real Solana address
   */
  async mintNFT(metadata: {
    name: string;
    symbol: string;
    uri: string;
    sellerFeeBasisPoints?: number;
  }): Promise<{
    mint: string;
    transaction: string;
  }> {
    if (!this.mockMode) {
      throw new Error('Mock mode is disabled. Use real SolanaService.');
    }

    // Generate fake but valid-looking Solana address
    const fakeKeypair = Keypair.generate();
    const mint = fakeKeypair.publicKey.toBase58();

    // Generate fake transaction signature
    const txHash = crypto.randomBytes(32).toString('base64url');

    console.log(`🎨 [MOCK] Minted NFT: ${metadata.name}`);
    console.log(`   Mint: ${mint}`);
    console.log(`   URI: ${metadata.uri}`);
    console.log(`   Tx: ${txHash}`);

    // Simulate network delay
    await this.delay(100);

    return {
      mint,
      transaction: txHash,
    };
  }

  /**
   * Mock NFT transfer
   */
  async transferNFT(
    mint: string,
    from: string,
    to: string
  ): Promise<{
    transaction: string;
  }> {
    if (!this.mockMode) {
      throw new Error('Mock mode is disabled. Use real SolanaService.');
    }

    const txHash = crypto.randomBytes(32).toString('base64url');

    console.log(`📤 [MOCK] Transferred NFT`);
    console.log(`   Mint: ${mint}`);
    console.log(`   From: ${from}`);
    console.log(`   To: ${to}`);
    console.log(`   Tx: ${txHash}`);

    await this.delay(100);

    return {
      transaction: txHash,
    };
  }

  /**
   * Mock buyback execution
   * Simulates burning NFT and transferring USDC
   */
  async executeBuyback(params: {
    nftMint: string;
    userWallet: string;
    buybackPrice: number;
  }): Promise<{
    transaction: string;
    burned: boolean;
    credited: number;
  }> {
    if (!this.mockMode) {
      throw new Error('Mock mode is disabled. Use real SolanaService.');
    }

    const txHash = crypto.randomBytes(32).toString('base64url');

    console.log(`💰 [MOCK] Executed Buyback`);
    console.log(`   NFT: ${params.nftMint}`);
    console.log(`   User: ${params.userWallet}`);
    console.log(`   Price: $${params.buybackPrice}`);
    console.log(`   Tx: ${txHash}`);

    await this.delay(150);

    return {
      transaction: txHash,
      burned: true,
      credited: params.buybackPrice,
    };
  }

  /**
   * Mock balance check
   */
  async getBalance(wallet: string, mint?: string): Promise<number> {
    if (!this.mockMode) {
      throw new Error('Mock mode is disabled. Use real SolanaService.');
    }

    // Return fake balance
    const fakeBalance = 1000 + Math.random() * 500;

    console.log(`💵 [MOCK] Balance check: ${wallet}`);
    console.log(`   Balance: ${fakeBalance.toFixed(2)} ${mint ? 'USDC' : 'SOL'}`);

    return fakeBalance;
  }

  /**
   * Mock transaction confirmation
   */
  async confirmTransaction(signature: string): Promise<boolean> {
    if (!this.mockMode) {
      throw new Error('Mock mode is disabled. Use real SolanaService.');
    }

    console.log(`✅ [MOCK] Transaction confirmed: ${signature}`);

    await this.delay(50);

    return true;
  }

  /**
   * Get mock account info
   */
  async getAccountInfo(address: string): Promise<{
    exists: boolean;
    owner?: string;
    data?: any;
  }> {
    if (!this.mockMode) {
      throw new Error('Mock mode is disabled. Use real SolanaService.');
    }

    // Simulate account existing
    return {
      exists: true,
      owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      data: {
        mock: true,
      },
    };
  }

  /**
   * Generate mock wallet address
   */
  generateMockWallet(): string {
    const keypair = Keypair.generate();
    return keypair.publicKey.toBase58();
  }

  /**
   * Check if running in mock mode
   */
  isMockMode(): boolean {
    return this.mockMode;
  }

  /**
   * Simulate network delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const mockSolanaService = new MockSolanaService();
