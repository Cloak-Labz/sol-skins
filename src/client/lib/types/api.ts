// Base API response structure
export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  error?: {
    message: string
    code?: string
    statusCode?: number
  }
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// User types
export interface User {
  id: string
  walletAddress: string
  username?: string
  email?: string
  tradeUrl?: string
  totalSpent: number | string
  totalEarned: number | string
  casesOpened: number
  createdAt: string
  lastLogin?: string
}

// Loot box types
export interface LootBoxType {
  id: string
  name: string
  description: string
  priceSol: string
  priceUsdc?: string
  priceUsd?: string | number
  solPriceUsd?: number
  imageUrl?: string
  rarity: 'Standard' | 'Premium' | 'Special' | 'Limited' | 'Legendary'
  isActive: boolean
  isFeatured: boolean
  chances: {
    common: string
    uncommon: string
    rare: string
    epic: string
    legendary: string
  }
  supply: {
    maxSupply?: number
    remainingSupply: number
    isSoldOut: boolean
  }
  createdAt: string
  updatedAt: string
}

export interface LootBoxTypeDetails extends LootBoxType {
  possibleSkins: {
    id: string
    weapon: string
    skinName: string
    rarity: string
    condition: string
    basePriceUsd: number
    imageUrl?: string
    weight: number
  }[]
}

export interface LootBoxFilters {
  search?: string
  sortBy?: 'featured' | 'price-low' | 'price-high' | 'name'
  filterBy?: 'all' | 'standard' | 'premium' | 'special' | 'limited' | 'legendary'
  page?: number
  limit?: number
}

// Skin types
export interface UserSkin {
  id: string
  name: string
  imageUrl?: string
  skinTemplate?: {
    weapon: string
    skinName: string
    rarity: string
    condition: string
    imageUrl?: string
    basePriceUsd?: number
  }
  currentPriceUsd?: number
  currentPrice?: number // Alias
  nftMintAddress: string
  mintAddress?: string // Alias
  openedAt?: string
  acquiredAt?: string // Alias
  createdAt?: string
  canSell?: boolean
  condition?: string
  status?: 'owned' | 'sold' | 'listed'
  isWaitingTransfer?: boolean
}

export interface InventorySummary {
  totalValue: number
  totalItems: number
  rarityBreakdown: {
    common: number
    uncommon: number
    rare: number
    epic: number
    legendary: number
  }
}

// Case opening types
export interface CaseOpening {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  vrfRequestId?: string
  randomnessSeed?: string
  skinResult?: {
    id: string
    weapon: string
    skinName: string
    rarity: string
    condition: string
    currentPriceUsd: number
    imageUrl?: string
    nftMintAddress: string
  }
  openedAt: string
  completedAt?: string
}

export interface OpenCaseRequest {
  lootBoxTypeId: string
  paymentMethod: 'SOL' | 'USDC'
}

export interface CaseDecisionRequest {
  decision: 'keep' | 'buyback'
}

// Transaction types
export interface Transaction {
  id: string
  type: 'open_case' | 'buyback' | 'payout'
  amountSol?: number
  amountUsd: number
  lootBoxType?: {
    name: string
  }
  resultSkin?: {
    weapon: string
    skinName: string
    rarity: string
    imageUrl?: string
  }
  txHash?: string
  status: 'pending' | 'confirmed' | 'failed'
  createdAt: string
  confirmedAt?: string
}

export interface TransactionSummary {
  totalSpent: number | string
  totalEarned: number | string
  netProfit: number
  casesOpened: number
  skinsOwned: number
  skinsSold: number
}

export interface TransactionFilters {
  search?: string
  type?: 'all' | 'open_case' | 'buyback' | 'payout'
  sortBy?: 'date' | 'amount-high' | 'amount-low'
  page?: number
  limit?: number
}

// Leaderboard types
export interface LeaderboardEntry {
  rank: number
  user: {
    id: string
    username?: string
    walletAddress: string
  }
  inventoryValue: number
  casesOpened: number
  totalSpent: number | string
  totalEarned: number | string
  netProfit: number
}

export interface LeaderboardFilters {
  period?: 'all-time' | 'monthly' | 'weekly'
  metric?: 'inventory-value' | 'cases-opened' | 'profit'
  limit?: number
}

// Activity types
export interface ActivityItem {
  id: string
  type: 'case_opened' | 'skin_sold' | 'rare_drop' | 'skin_claimed' | 'payout'
  user: {
    id: string
    username?: string
    walletAddress: string
  }
  skin?: {
    id: string
    weapon: string
    skinName: string
    rarity: string
    condition: string
    imageUrl?: string
    valueUsd: string
  }
  lootBox?: {
    id: string
    name: string
    rarity: string
  }
  amount?: {
    sol: number
    usd: number
  }
  timestamp: string
}

// Admin types
export interface AdminStats {
  users: {
    total: number
    active30d: number
    active7d: number
  }
  revenue: {
    totalSol: number
    totalUsd: number
    last30dSol: number
    last30dUsd: number
  }
  cases: {
    totalOpened: number
    last30d: number
    last7d: number
  }
  inventory: {
    totalNfts: number
    totalValueUsd: number
    buybacksSold: number
  }
}

// Auth types
export interface ConnectWalletRequest {
  walletAddress: string
  signature?: string
  message?: string
}

export interface ConnectWalletResponse {
  user: User
  message: string
}

export interface UpdateProfileRequest {
  username?: string
  email?: string
  tradeUrl?: string
}

// Buyback types
export interface BuybackRequest {
  minAcceptablePrice: number
}

export interface BuybackResponse {
  soldSkin: {
    id: string
    weapon: string
    skinName: string
    originalPrice: number
    buybackPrice: number
    buybackPercentage: number
  }
  transaction: {
    id: string
    amountUsdc: number
    txHash: string
    status: string
  }
}

// Leaderboard types
export interface LeaderboardEntry {
  rank: number
  user: {
    id: string
    username?: string
    walletAddress: string
  }
  inventoryValue: number
  casesOpened: number
  totalSpent: number | string
  totalEarned: number | string
  netProfit: number
}

export interface UserRank {
  rank: number
  totalUsers: number
  percentile: number
  metric: string
  value: number
}

export interface LeaderboardFilters {
  period?: 'all-time' | 'monthly' | 'weekly'
  metric?: 'inventory-value' | 'cases-opened' | 'profit'
  limit?: number
  page?: number
}
