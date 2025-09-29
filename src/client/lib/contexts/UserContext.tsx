'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types/api';
import { authService } from '../services';

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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConnected = walletAddress !== null;

  // Load user data when wallet is connected
  useEffect(() => {
    if (walletAddress && !user) {
      refreshUser();
    }
  }, [walletAddress]);

  const connectWallet = async (address: string, signature?: string, message?: string) => {
    // Prevent multiple simultaneous connection attempts
    if (isLoading) {
      console.log('Connection already in progress, skipping...');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await authService.connectWallet(address, signature, message);
      setUser(response.user);
      setWalletAddress(address);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect wallet';
      setError(errorMessage);
      throw err;
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

  const value: UserContextType = {
    user,
    walletAddress,
    isConnected,
    isLoading,
    error,
    connectWallet,
    disconnectWallet,
    refreshUser,
    clearError,
  };

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
