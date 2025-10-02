# SolSkins Frontend-Backend Integration TODO

## 🎯 **Project Status**
- ✅ **Backend**: Fully functional with wallet-based authentication
- ✅ **Database**: Seeded with realistic data (users, loot boxes, skins, transactions)
- ✅ **API Endpoints**: All 25+ endpoints working and tested
- 🔄 **Frontend**: Ready for backend integration

## 📋 **Integration TODO List**

### **Phase 1: Core Infrastructure** 🔧

#### 1.1 API Client Service
- [ ] Create `src/client/lib/api.ts` with centralized API communication
- [ ] Add axios/fetch wrapper with automatic auth headers
- [ ] Implement request/response interceptors
- [ ] Add centralized error handling and retry logic
- [ ] Create TypeScript interfaces for all API responses

#### 1.2 Wallet Authentication Integration
- [ ] Update `components/wallet-connect.tsx` to call `/auth/connect`
- [ ] Create user context/store for wallet session management
- [ ] Handle wallet disconnection with `/auth/disconnect`
- [ ] Add wallet signature verification for sensitive operations
- [ ] Implement session persistence across page reloads

#### 1.3 Error Handling & Loading States
- [ ] Add global error boundary for API errors
- [ ] Create loading states for all async operations
- [ ] Implement toast notifications for user feedback
- [ ] Add retry mechanisms for failed requests
- [ ] Create offline state handling

### **Phase 2: Core Features** 🎮

#### 2.1 Marketplace Integration
- [ ] Connect `app/marketplace/page.tsx` to `/marketplace/loot-boxes`
- [ ] Display real loot box data with prices and probabilities
- [ ] Implement search and filtering functionality
- [ ] Add featured loot boxes from `/marketplace/featured`
- [ ] Handle loot box details from `/marketplace/loot-boxes/:id`

#### 2.2 Case Opening Flow
- [ ] Update case opening logic to call `/cases/open`
- [ ] Implement polling for `/cases/opening/:id/status`
- [ ] Handle user decisions with `/cases/opening/:id/decision`
- [ ] Add proper loading states and animations
- [ ] Integrate with Solana wallet for payments
- [ ] Add case opening history from `/cases/openings`

#### 2.3 Inventory Management
- [ ] Connect `app/inventory/page.tsx` to `/inventory` endpoint
- [ ] Display user's skins with current prices
- [ ] Implement buyback functionality with `/inventory/:skinId/buyback`
- [ ] Add inventory value calculations
- [ ] Show individual skin details from `/inventory/:skinId`
- [ ] Add inventory filtering and sorting

#### 2.4 Transaction History
- [ ] Connect `app/history/page.tsx` to `/history/transactions`
- [ ] Display transaction list with filtering
- [ ] Show transaction details and summaries
- [ ] Add transaction search functionality
- [ ] Implement pagination for large transaction lists

### **Phase 3: Social Features** 👥

#### 3.1 Leaderboard Integration
- [ ] Connect `app/leaderboard/page.tsx` to `/leaderboard`
- [ ] Display user rankings with real data
- [ ] Add user rank display from `/leaderboard/rank`
- [ ] Implement different ranking metrics (inventory value, cases opened, profit)
- [ ] Add time period filtering (all-time, monthly, weekly)

#### 3.2 Activity Feed
- [ ] Connect `app/activity/page.tsx` to `/activity/recent`
- [ ] Display recent platform activity
- [ ] Show case openings, buybacks, and achievements
- [ ] Add activity filtering and pagination
- [ ] Implement real-time activity updates

### **Phase 4: Advanced Features** ⚡

#### 4.1 Real-time Updates
- [ ] Add WebSocket connection for live updates
- [ ] Real-time case opening results
- [ ] Live transaction notifications
- [ ] Activity feed updates
- [ ] Leaderboard position changes

#### 4.2 Admin Dashboard
- [ ] Create admin interface for platform management
- [ ] Connect to `/admin/stats/overview` for platform statistics
- [ ] Add user management from `/admin/users`
- [ ] Display transaction and case opening analytics
- [ ] Implement admin authentication

## 🛠 **Technical Implementation Details**

### **API Client Structure**
```typescript
// src/client/lib/api.ts
class ApiClient {
  private baseURL = 'http://localhost:3002/api/v1';
  private walletAddress: string | null = null;
  
  // Authentication
  async connectWallet(walletAddress: string, signature?: string, message?: string)
  async disconnectWallet()
  
  // Marketplace
  async getLootBoxes(filters?: LootBoxFilters)
  async getLootBoxById(id: string)
  async getFeaturedLootBoxes()
  
  // Case Opening
  async openCase(lootBoxTypeId: string, paymentMethod: 'SOL' | 'USDC')
  async getCaseOpeningStatus(id: string)
  async makeCaseDecision(id: string, decision: 'keep' | 'buyback')
  async getUserCaseOpenings()
  
  // Inventory
  async getInventory(filters?: InventoryFilters)
  async getInventoryValue()
  async getSkinDetails(skinId: string)
  async sellSkin(skinId: string, minAcceptablePrice?: number)
  
  // History
  async getTransactions(filters?: TransactionFilters)
  async getTransactionById(id: string)
  async getTransactionSummary()
  
  // Social
  async getLeaderboard(filters?: LeaderboardFilters)
  async getUserRank(metric?: string)
  async getRecentActivity(limit?: number)
  async getActivityStats()
}
```

### **State Management**
```typescript
// src/client/contexts/UserContext.tsx
interface UserContextType {
  user: User | null;
  walletAddress: string | null;
  isConnected: boolean;
  connectWallet: (address: string) => Promise<void>;
  disconnectWallet: () => void;
  refreshUser: () => Promise<void>;
}
```

### **Component Updates Needed**

#### **Marketplace Page** (`app/marketplace/page.tsx`)
- Replace mock data with API calls
- Add loading states for loot box fetching
- Implement search and filtering
- Add error handling for API failures

#### **Case Opening** (`app/open/[id]/page.tsx`)
- Connect to backend case opening flow
- Add real-time status updates
- Implement user decision handling
- Add proper error states

#### **Inventory Page** (`app/inventory/page.tsx`)
- Display real user skins from API
- Add buyback functionality
- Show current skin values
- Implement inventory filtering

#### **History Page** (`app/history/page.tsx`)
- Display real transaction data
- Add transaction filtering
- Show transaction details
- Implement pagination

#### **Leaderboard Page** (`app/leaderboard/page.tsx`)
- Show real user rankings
- Add ranking metrics selection
- Display user's current rank
- Implement time period filtering

#### **Activity Page** (`app/activity/page.tsx`)
- Display recent platform activity
- Add activity filtering
- Show real-time updates
- Implement activity pagination

## 🚀 **Getting Started**

### **Step 1: API Client Setup**
1. Create `src/client/lib/api.ts`
2. Add TypeScript interfaces for all API responses
3. Implement authentication handling
4. Add error handling and retry logic

### **Step 2: Authentication Integration**
1. Update wallet connection component
2. Create user context for state management
3. Add session persistence
4. Handle wallet disconnection

### **Step 3: Page-by-Page Integration**
1. Start with Marketplace (easiest)
2. Move to Inventory (user-specific)
3. Add Case Opening flow
4. Connect History and Leaderboard
5. Add Activity feed

### **Step 4: Advanced Features**
1. Add real-time updates
2. Implement admin dashboard
3. Add offline support
4. Optimize performance

## 📊 **Current Backend Status**

### **✅ Working Endpoints**
- **Authentication**: `/auth/connect`, `/auth/profile`
- **Marketplace**: `/marketplace/loot-boxes`, `/marketplace/featured`
- **Case Opening**: `/cases/open`, `/cases/opening/:id/status`
- **Inventory**: `/inventory`, `/inventory/value`, `/inventory/:skinId`
- **History**: `/history/transactions`, `/history/summary`
- **Social**: `/leaderboard`, `/leaderboard/rank`, `/activity/recent`
- **Admin**: `/admin/stats/overview`, `/admin/users`

### **📈 Test Data Available**
- **3 Users** with different wallet addresses
- **6 Loot Box Types** with various rarities and prices
- **25+ Skin Templates** with different weapons and rarities
- **12 Transactions** showing case openings and buybacks
- **3 User Skins** in inventory with current values
- **Real Statistics** for leaderboard and admin dashboard

## 🎯 **Next Steps**

1. **Start with API Client** - Create the foundation
2. **Integrate Authentication** - Connect wallet to backend
3. **Update Marketplace** - Display real loot boxes
4. **Add Case Opening** - Full case opening flow
5. **Connect Inventory** - Show user's skins
6. **Add Social Features** - Leaderboard and activity

---

**Ready to start integration? Let's begin with the API client setup!** 🚀
