import type { User, UpdateProfileRequest } from "../types/api";

export function getMockUser(): User {
  return {
    id: "mock-user-1",
    walletAddress: "SoL4MockAddre55...ABCD",
    username: "MockUser",
    email: "mock@solskins.io",
    totalSpent: 128734.23,
    totalEarned: 153201.77,
    casesOpened: 842,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 120).toISOString(),
    lastLogin: new Date().toISOString(),
  };
}

export function updateMockUser(_: UpdateProfileRequest): { message: string } {
  return { message: "Mock profile updated" };
}
