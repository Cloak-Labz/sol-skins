import { Program, BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import {
  getProgram,
  loadAdminWallet,
  getConnection,
} from "../lib/solana/client";
import {
  getGlobalPDA,
  getBatchPDA,
  getBoxStatePDA,
  getVrfPendingPDA,
} from "../lib/solana/pda";
import crypto from "crypto";

export class VrfService {
  private program: Program;
  private isRunning: boolean = false;
  private pollInterval: number = 5000; // 5 seconds

  constructor() {
    this.program = getProgram();
  }

  /**
   * Start VRF monitoring service
   */
  start() {
    if (this.isRunning) {
      console.log("⚠️  VRF service already running");
      return;
    }

    this.isRunning = true;
    console.log("✅ VRF service started - monitoring pending VRF requests");
    this.monitorPendingVrfRequests();
  }

  /**
   * Stop VRF monitoring service
   */
  stop() {
    this.isRunning = false;
    console.log("🛑 VRF service stopped");
  }

  /**
   * Monitor and fulfill pending VRF requests
   */
  private async monitorPendingVrfRequests() {
    while (this.isRunning) {
      try {
        await this.processPendingRequests();
      } catch (error) {
        console.error("Error processing VRF requests:", error);
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, this.pollInterval));
    }
  }

  /**
   * Process all pending VRF requests
   */
  private async processPendingRequests() {
    try {
      // Get all VrfPending accounts
      // TODO: Update to match current program IDL
      // const pendingAccounts = await this.program.account.vrfPending.all();
      const pendingAccounts: any[] = [];

      if (pendingAccounts.length === 0) {
        return; // No pending requests
      }

      console.log(`📡 Found ${pendingAccounts.length} pending VRF request(s)`);

      for (const account of pendingAccounts) {
        try {
          await this.fulfillVrfRequest(
            account.publicKey,
            account.account as any
          );
        } catch (error: any) {
          console.error(
            `Error fulfilling VRF for ${account.publicKey.toBase58()}:`,
            error.message
          );
        }
      }
    } catch (error: unknown) {
      // Ignore "account not found" errors (expected if no pending requests)
      if (
        error instanceof Error &&
        !error.toString().includes("Account does not exist")
      ) {
        throw error;
      }
    }
  }

  /**
   * Fulfill a specific VRF request
   */
  private async fulfillVrfRequest(vrfPendingPDA: PublicKey, vrfPending: any) {
    const { boxMint, requestId, poolSize } = vrfPending;

    console.log(`🎲 Fulfilling VRF request for box: ${boxMint.toBase58()}`);
    console.log(`   Request ID: ${requestId.toString()}`);
    console.log(`   Pool Size: ${poolSize.toString()}`);

    // Generate secure randomness
    const randomness = this.generateRandomness();

    // Derive necessary PDAs
    const [globalPDA] = getGlobalPDA();
    const [boxStatePDA] = getBoxStatePDA(boxMint);

    // Get box state to find batch_id
    // TODO: Update to match current program IDL
    // const boxState = await this.program.account.boxState.fetch(boxStatePDA);
    const boxState = { batchId: new BN(0) }; // Placeholder
    const [batchPDA] = getBatchPDA(boxState.batchId);

    const adminWallet = loadAdminWallet();

    try {
      const tx = await this.program.methods
        .vrfCallback(requestId, Array.from(randomness))
        .accounts({
          global: globalPDA,
          batch: batchPDA,
          boxState: boxStatePDA,
          vrfPending: vrfPendingPDA,
          vrfAuthority: adminWallet.publicKey,
        })
        .rpc();

      console.log(`✅ VRF fulfilled! TX: ${tx}`);
      console.log(`   Box can now be revealed`);

      return tx;
    } catch (error: any) {
      console.error(`❌ Failed to fulfill VRF:`, error.message);
      throw error;
    }
  }

  /**
   * Generate secure randomness (32 bytes)
   */
  private generateRandomness(): Uint8Array {
    return crypto.randomBytes(32);
  }

  /**
   * Manually fulfill a VRF request (for testing)
   */
  async manualFulfill(boxAsset: PublicKey): Promise<string> {
    try {
      const [vrfPendingPDA] = getVrfPendingPDA(boxAsset);
      // TODO: Update to match current program IDL
      // const vrfPending = await this.program.account.vrfPending.fetch(vrfPendingPDA);
      const vrfPending = {}; // Placeholder

      return await this.fulfillVrfRequest(vrfPendingPDA, vrfPending);
    } catch (error: any) {
      throw new Error(`Failed to manually fulfill VRF: ${error.message}`);
    }
  }

  /**
   * Get all pending VRF requests
   */
  async getPendingRequests(): Promise<any[]> {
    try {
      // TODO: Update to match current program IDL
      // const pendingAccounts = await this.program.account.vrfPending.all();
      const pendingAccounts: any[] = [];
      return pendingAccounts.map((acc: any) => ({
        address: acc.publicKey.toBase58(),
        boxMint: acc.account.boxMint.toBase58(),
        requestId: acc.account.requestId.toString(),
        poolSize: acc.account.poolSize.toString(),
        requestTime: new Date(
          acc.account.requestTime.toNumber() * 1000
        ).toISOString(),
      }));
    } catch (error) {
      return [];
    }
  }
}

// Singleton instance
let vrfService: VrfService | null = null;

export function getVrfService(): VrfService {
  if (!vrfService) {
    vrfService = new VrfService();
  }
  return vrfService;
}

export function startVrfService(): VrfService {
  const service = getVrfService();
  service.start();
  return service;
}
