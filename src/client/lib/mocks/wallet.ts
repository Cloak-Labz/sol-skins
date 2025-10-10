import { mockDelay } from "@/lib/config/mock";
import { PublicKey, Transaction } from "@solana/web3.js";
import { MOCK_CONFIG } from "@/lib/config/mock";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

// Mock wallet data
export const MOCK_WALLET = {
  publicKey: new PublicKey("5iF1vyxpqeYqWL4fKhSnFyFw5VzBTjRqDEpkiFta3uEm"),
  balance: 10.5 * LAMPORTS_PER_SOL,
  recentTransactions: [
    {
      signature: "mock-signature-1",
      blockTime: Date.now() / 1000 - 3600,
      amount: 0.5 * LAMPORTS_PER_SOL,
      type: "transfer",
      status: "confirmed"
    },
    {
      signature: "mock-signature-2",
      blockTime: Date.now() / 1000 - 7200,
      amount: 1.2 * LAMPORTS_PER_SOL,
      type: "case-opening",
      status: "confirmed"
    }
  ]
};

// Mock NFT data
export const MOCK_NFTS = [
  {
    mint: new PublicKey("7nE1GmnMmDKiycFkpHF7mKtxt356FQzVonZqBWsTWZNf"),
    name: "AK-47 | Redline",
    image: "/assets/skins/ak47-redline.png",
    attributes: {
      rarity: "Covert",
      wear: "Factory New",
      weapon: "AK-47"
    }
  },
  {
    mint: new PublicKey("3iF1vyxpqeYqWL4fKhSnFyFw5VzBTjRqDEpkiFta3uEm"),
    name: "AWP | Dragon Lore",
    image: "/assets/skins/awp-dragonlore.png",
    attributes: {
      rarity: "Legendary",
      wear: "Minimal Wear",
      weapon: "AWP"
    }
  }
];

/**
 * Mock Solana Wallet Service
 * Simulates Solana wallet interactions for frontend testing
 */
export const mockSolanaWalletService = {
  /**
   * Get wallet balance
   */
  async getBalance(): Promise<number> {
    await mockDelay("SHORT");
    return MOCK_WALLET.balance;
  },

  /**
   * Send SOL transaction
   */
  async sendSol(
    recipient: string,
    amount: number,
    memo?: string
  ): Promise<{ signature: string; status: string }> {
    await mockDelay("MEDIUM");
    
    // Simulate transaction failure if amount is too large
    if (amount > MOCK_WALLET.balance) {
      throw new Error("Insufficient funds for transaction");
    }
    
    // Simulate network error randomly (10% chance)
    if (Math.random() < 0.1) {
      throw new Error("Network error: could not connect to Solana cluster");
    }
    
    return {
      signature: `mock-tx-${Date.now()}`,
      status: "confirmed"
    };
  },

  /**
   * Create and open a loot box
   */
  async createAndOpenBox(
    batchId: number,
    price: number
  ): Promise<{ boxAsset: string; status: string; result?: any }> {
    await mockDelay("LONG");
    
    // Simulate transaction
    if (price > MOCK_WALLET.balance) {
      throw new Error("Insufficient funds to create box");
    }
    
    // Generate random box asset
    const boxAsset = `box-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Simulate VRF delay
    await mockDelay("LONG");
    
    // Random result (success 90% of the time)
    const success = Math.random() < 0.9;
    
    if (!success) {
      throw new Error("VRF fulfillment failed");
    }
    
    return {
      boxAsset,
      status: "fulfilled",
      result: {
        skinId: Math.floor(Math.random() * 100),
        rarity: Math.random() < 0.2 ? "Legendary" : "Common"
      }
    };
  },

  /**
   * Get user's NFTs
   */
  async getUserNFTs(): Promise<typeof MOCK_NFTS> {
    await mockDelay("MEDIUM");
    return MOCK_NFTS;
  },

  /**
   * Sign message for wallet authentication
   */
  async signMessage(message: string): Promise<{ signature: string; publicKey: string }> {
    await mockDelay("SHORT");
    
    return {
      signature: `mock-signature-${Date.now()}`,
      publicKey: MOCK_WALLET.publicKey.toString()
    };
  },

  /**
   * Get recent transactions
   */
  async getRecentTransactions(): Promise<typeof MOCK_WALLET.recentTransactions> {
    await mockDelay("MEDIUM");
    return MOCK_WALLET.recentTransactions;
  }
};