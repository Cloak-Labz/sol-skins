import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format currency values
export const formatCurrency = (value: number, currency: 'USD' | 'SOL' = 'USD'): string => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency === 'USD' ? 'USD' : 'USD', // SOL will be displayed as USD for now
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  return formatter.format(value);
};

// Format SOL values
export const formatSOL = (value: number): string => {
  return `${value.toFixed(4)} SOL`;
};

// Format percentages
export const formatPercentage = (value: number): string => {
  return `${value.toFixed(2)}%`;
};

// Format large numbers
export const formatNumber = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
};

// Get rarity color
export const getRarityColor = (rarity: string): string => {
  const colors = {
    'Common': '#B0B3B8',
    'Uncommon': '#4CAF50',
    'Rare': '#2196F3',
    'Epic': '#9C27B0',
    'Legendary': '#FF9800',
  };
  return colors[rarity as keyof typeof colors] || '#B0B3B8';
};

// Get rarity background color
export const getRarityBgColor = (rarity: string): string => {
  const colors = {
    'Common': 'bg-gray-100',
    'Uncommon': 'bg-green-100',
    'Rare': 'bg-blue-100',
    'Epic': 'bg-purple-100',
    'Legendary': 'bg-orange-100',
  };
  return colors[rarity as keyof typeof colors] || 'bg-gray-100';
};

// Get condition color
export const getConditionColor = (condition: string): string => {
  const colors = {
    'Factory New': '#4CAF50',
    'Minimal Wear': '#8BC34A',
    'Field-Tested': '#FFC107',
    'Well-Worn': '#FF9800',
    'Battle-Scarred': '#F44336',
  };
  return colors[condition as keyof typeof colors] || '#B0B3B8';
};

// Format date
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Format relative time
export const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h ago`;
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d ago`;
  } else {
    return formatDate(dateString);
  }
};

// Truncate wallet address
export const truncateWalletAddress = (address: string, start: number = 4, end: number = 4): string => {
  if (address.length <= start + end) return address;
  return `${address.slice(0, start)}...${address.slice(-end)}`;
};

// Generate random ID (for testing)
export const generateRandomId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

// Debounce function
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Sleep function for testing
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};
