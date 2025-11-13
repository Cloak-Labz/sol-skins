import { apiClient } from "./api.service";
import { User, ConnectWalletRequest, UpdateProfileRequest } from "../types/api";
import bs58 from "bs58";
import { PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";

class AuthService {
  // Connect wallet to backend
  async connectWallet(
    walletAddress: string,
    signature?: string,
    message?: string
  ): Promise<{ user: User; token: string; message: string }> {
    const request: ConnectWalletRequest = {
      walletAddress,
      signature,
      message,
    };

    const response = await apiClient.post<{ user: User; token: string; message: string }>("/auth/connect", request);

    // Set wallet address and JWT token in API client for future requests
    apiClient.setWalletAddress(walletAddress);
    if (response.token) {
      apiClient.setJwtToken(response.token);
    }

    // ApiClient returns the inner data already: { user, token, message }
    return response;
  }

  // Disconnect wallet
  async disconnectWallet(): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>("/auth/disconnect");

    // Clear wallet address and JWT token from API client
    apiClient.setWalletAddress(null);
    apiClient.setJwtToken(null);

    return response;
  }

  // Get user profile
  async getProfile(): Promise<User> {
    // ApiClient returns the inner data already (the user object)
    const response = await apiClient.get<User>("/auth/profile");
    return response;
  }

  // Update user profile
  async updateProfile(
    updates: UpdateProfileRequest,
    wallet?: any // Wallet adapter instance for signing
  ): Promise<{ message: string }> {
    // IMPORTANT: Refresh CSRF token before updating profile to prevent expiration errors
    // This ensures the token is fresh even if the user has been on the page for a while
    await apiClient.refreshCSRFToken();
    
    // For profile updates, we need wallet signature
    if (wallet && wallet.signMessage) {
      const walletAddress = apiClient.getWalletAddress();
      if (!walletAddress) {
        throw new Error('Wallet address not found');
      }

      // Generate message to sign
      const message = `Update profile for ${walletAddress}\n\nChanges:\n${JSON.stringify(updates, null, 2)}\n\nTimestamp: ${Date.now()}`;
      
      // Sign message
      // IMPORTANT: Different wallet adapters handle the prefix differently
      // Some add "\xFFsolana off-chain" automatically, others don't
      // We'll sign the raw message and let the backend try multiple verification strategies
      const messageBytes = new TextEncoder().encode(message);
      
      // Sign the message
      // Note: The wallet adapter's signMessage behavior varies by implementation
      // Some add prefix automatically, some don't
      const signatureResult = await wallet.signMessage(messageBytes);
      
      // Handle different return formats from wallet adapters
      // Some return Uint8Array directly, others return { signature: Uint8Array }
      // Some wallets return array-like objects with numeric indices
      let signatureBytes: Uint8Array;
      if (signatureResult instanceof Uint8Array) {
        signatureBytes = signatureResult;
      } else if (signatureResult && typeof signatureResult === 'object' && 'signature' in signatureResult) {
        signatureBytes = (signatureResult as any).signature;
      } else if (signatureResult && typeof signatureResult === 'object' && Array.isArray(signatureResult)) {
        // Handle array-like objects (some adapters return arrays)
        signatureBytes = new Uint8Array(signatureResult);
      } else if (signatureResult && typeof signatureResult === 'object' && signatureResult.length === 64) {
        // Handle array-like objects with length property
        signatureBytes = new Uint8Array(Array.from(signatureResult as any));
      } else {
        throw new Error('Invalid signature format from wallet');
      }
      
      // Validate signature length (Ed25519 signatures are always 64 bytes)
      if (signatureBytes.length !== 64) {
        throw new Error(`Invalid signature length: ${signatureBytes.length}, expected 64`);
      }
      
      // Use bs58 for Solana signature encoding (standard format)
      const signatureBase58 = bs58.encode(signatureBytes);
      
      // Add signature and message to updates
      // Backend will try multiple verification strategies (with/without prefix)
      // since different wallet adapters handle the prefix differently
      // IMPORTANT: walletAddress is added by apiClient interceptor, but we need to ensure it's in the body
      const requestData = {
        ...updates,
        walletAddress: walletAddress, // Explicitly add walletAddress for signature verification
        signature: signatureBase58,
        message: message, // Send original message, backend will handle prefix logic
      };
      
      const response = await apiClient.put<{ message: string }>("/auth/profile", requestData);
      return response;
    } else {
      // Fallback: try without signature (will fail if backend requires it)
      const response = await apiClient.put<{ message: string }>("/auth/profile", updates);
      return response;
    }
  }

  // Check if user is connected
  isConnected(): boolean {
    return apiClient.getWalletAddress() !== null;
  }

  // Get current wallet address
  getCurrentWalletAddress(): string | null {
    return apiClient.getWalletAddress();
  }
}

export const authService = new AuthService();
export default authService;
