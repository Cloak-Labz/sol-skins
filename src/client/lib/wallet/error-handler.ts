import { WalletError } from '@solana/wallet-adapter-base';
import { toast } from 'react-hot-toast';

/**
 * Handles wallet connection errors with user-friendly messages
 */
export function handleWalletError(error: WalletError | Error): void {
  console.error('Wallet error:', error);
  
  // Extract error name and message
  const errorName = 'name' in error ? error.name : 'Error';
  const errorMessage = error.message || 'Unknown error occurred';
  
  // Handle specific error types with user-friendly messages
  if (errorName === 'WalletNotReadyError') {
    toast.error('Wallet not installed. Please install Phantom or Solflare extension.');
  } 
  else if (errorName === 'WalletConnectionError') {
    if (errorMessage.includes('User rejected')) {
      toast.error('Connection rejected. Please try again.');
    } else if (errorMessage.includes('Unexpected error')) {
      toast.error('Please unlock your wallet and try again.');
    } else {
      toast.error('Failed to connect. Please refresh and try again.');
    }
  } 
  else if (errorName === 'WalletDisconnectedError') {
    // Don't show error on intentional disconnect
    console.log('Wallet disconnected');
  } 
  else if (errorName === 'WalletSignTransactionError') {
    toast.error('Transaction signing failed. Please try again.');
  } 
  else if (errorName === 'WalletSignMessageError') {
    toast.error('Message signing failed. Please try again.');
  }
  else if (errorName === 'WalletTimeoutError') {
    toast.error('Wallet connection timed out. Please try again.');
  }
  else if (errorName === 'WalletWindowClosedError') {
    toast.error('Wallet window was closed. Please try again.');
  }
  else if (errorName === 'WalletWindowBlockedError') {
    toast.error('Wallet popup was blocked. Please enable popups for this site.');
  }
  else if (errorMessage.includes('User rejected')) {
    toast.error('Action rejected by user.');
  } 
  else {
    // Only show toast for actual errors, not disconnects
    if (!errorMessage.includes('disconnect')) {
      toast.error(errorMessage || 'An error occurred with your wallet.');
    }
  }
}

/**
 * Handles transaction errors with user-friendly messages
 */
export function handleTransactionError(error: Error): void {
  console.error('Transaction error:', error);
  
  const errorMessage = error.message || 'Unknown transaction error';
  
  if (errorMessage.includes('insufficient funds')) {
    toast.error('Insufficient funds for this transaction.');
  }
  else if (errorMessage.includes('blockhash')) {
    toast.error('Transaction expired. Please try again.');
  }
  else if (errorMessage.includes('Signature verification failed')) {
    toast.error('Transaction signature verification failed.');
  }
  else if (errorMessage.includes('Transaction simulation failed')) {
    toast.error('Transaction simulation failed. Please try again.');
  }
  else {
    toast.error(`Transaction failed: ${errorMessage}`);
  }
}