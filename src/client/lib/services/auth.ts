import { apiClient } from "./api";
import { User, ConnectWalletRequest, UpdateProfileRequest } from "../types/api";
import { ENABLE_PROFILE_MOCK } from "../featureFlags";
import { getMockUser, updateMockUser } from "./auth.mock";

class AuthService {
  // Connect wallet to backend
  async connectWallet(
    walletAddress: string,
    signature?: string,
    message?: string
  ): Promise<{ user: User; message: string }> {
    if (ENABLE_PROFILE_MOCK) {
      // Simulate connecting by returning a mock user and setting api client wallet
      apiClient.setWalletAddress(walletAddress);
      return {
        user: { ...getMockUser(), walletAddress },
        message: "mock-connected",
      };
    }
    const request: ConnectWalletRequest = {
      walletAddress,
      signature,
      message,
    };

    const response = await apiClient.post("/auth/connect", request);

    // Set wallet address in API client for future requests
    apiClient.setWalletAddress(walletAddress);

    // ApiClient returns the inner data already: { user, message }
    return response;
  }

  // Disconnect wallet
  async disconnectWallet(): Promise<{ message: string }> {
    if (ENABLE_PROFILE_MOCK) {
      apiClient.setWalletAddress(null);
      return { message: "mock-disconnected" };
    }
    const response = await apiClient.post("/auth/disconnect");

    // Clear wallet address from API client
    apiClient.setWalletAddress(null);

    return response.data;
  }

  // Get user profile
  async getProfile(): Promise<User> {
    if (ENABLE_PROFILE_MOCK) {
      return getMockUser();
    }
    // ApiClient returns the inner data already (the user object)
    const response = await apiClient.get("/auth/profile");
    return response;
  }

  // Update user profile
  async updateProfile(
    updates: UpdateProfileRequest
  ): Promise<{ message: string }> {
    if (ENABLE_PROFILE_MOCK) {
      return updateMockUser(updates);
    }
    const response = await apiClient.put("/auth/profile", updates);
    return response.data;
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
