'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { User } from '../types/api';
import { authService } from '../services';
import { apiClient } from '../services/api.service';

interface UserContextType {
  user: User | null;
  walletAddress: string | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  connectWallet: (address: string, signature?: string, message?: string) => Promise<void>;
  disconnectWallet: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start as loading to check session
  const [error, setError] = useState<string | null>(null);
  const [hasCheckedSession, setHasCheckedSession] = useState(false);

  const isConnected = walletAddress !== null;

  // Check for existing session on mount
  useEffect(() => {
    const checkExistingSession = async () => {
      // Only check once
      if (hasCheckedSession) return;

      setHasCheckedSession(true);

      // Check if we have a saved wallet address and token
      const savedWallet = apiClient.getWalletAddress();
      const savedToken = apiClient.getJwtToken();

      if (savedWallet && savedToken) {
        try {
          // Try to fetch user profile with existing session
          const userData = await authService.getProfile();
          setUser(userData);
          setWalletAddress(savedWallet);
        } catch (err) {
          // Session expired or invalid, clear it
          apiClient.setWalletAddress(null);
          apiClient.setJwtToken(null);
        }
      }

      setIsLoading(false);
    };

    checkExistingSession();
  }, [hasCheckedSession]);

  const connectWallet = async (address: string, signature?: string, message?: string) => {
    // Prevent multiple simultaneous connection attempts
    if (isLoading) {
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await authService.connectWallet(address, signature, message);
      
      setUser(response.user);
      setWalletAddress(address);
      
      // Update API client with wallet address
      apiClient.setWalletAddress(address);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect wallet';
      setError(errorMessage);
      // Don't throw - just show error to user
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectWallet = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      await authService.disconnectWallet();
      setUser(null);
      setWalletAddress(null);
      
      // Clear wallet address and JWT token from API client
      apiClient.setWalletAddress(null);
      apiClient.setJwtToken(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disconnect wallet';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    if (!walletAddress) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const userData = await authService.getProfile();
      setUser(userData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load user data';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value: UserContextType = useMemo(() => ({
    user,
    walletAddress,
    isConnected,
    isLoading,
    error,
    connectWallet,
    disconnectWallet,
    refreshUser,
    clearError,
  }), [user, walletAddress, isConnected, isLoading, error]);

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
