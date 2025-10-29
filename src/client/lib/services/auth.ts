import { apiClient } from "./api";
import { User, ConnectWalletRequest, UpdateProfileRequest } from "../types/api";

class AuthService {
  // Connect wallet to backend
  async connectWallet(
    walletAddress: string,
    signature?: string,
    message?: string
  ): Promise<{ user: User; message: string }> {
    const request: ConnectWalletRequest = {
      walletAddress,
      signature,
      message,
    };

    const response = await apiClient.post<{ user: User; message: string }>("/auth/connect", request);

    // Set wallet address in API client for future requests
    apiClient.setWalletAddress(walletAddress);

    // ApiClient returns the inner data already: { user, message }
    return response;
  }

  // Disconnect wallet
  async disconnectWallet(): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>("/auth/disconnect");

    // Clear wallet address from API client
    apiClient.setWalletAddress(null);

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
    updates: UpdateProfileRequest
  ): Promise<{ message: string }> {
    const response = await apiClient.put<{ message: string }>("/auth/profile", updates);
    return response;
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
