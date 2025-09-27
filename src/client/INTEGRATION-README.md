# SolSkins Frontend Integration

## 🎯 **Integration Status**
- ✅ **Base Structure**: Created API client, services, and types
- ✅ **TypeScript Interfaces**: Complete type definitions for all API responses
- ✅ **Services Layer**: Authentication, marketplace, cases, inventory, history, social
- ✅ **User Context**: State management for wallet connection
- ✅ **Utilities**: Common functions for formatting and display

## 📁 **Project Structure**

```
src/client/
├── lib/
│   ├── services/           # API service layer
│   │   ├── api.ts         # Base API client
│   │   ├── auth.ts        # Authentication service
│   │   ├── marketplace.ts # Marketplace service
│   │   ├── cases.ts       # Case opening service
│   │   ├── inventory.ts   # Inventory service
│   │   ├── history.ts     # Transaction history service
│   │   ├── social.ts      # Leaderboard & activity service
│   │   └── index.ts       # Service exports
│   ├── types/             # TypeScript interfaces
│   │   └── api.ts         # All API response types
│   ├── contexts/          # React contexts
│   │   └── UserContext.tsx # User state management
│   └── utils/             # Utility functions
│       └── index.ts       # Common utilities
├── components/            # React components
├── app/                   # Next.js app directory
└── .env.local            # Environment configuration
```

## 🚀 **Services Overview**

### **API Client** (`lib/services/api.ts`)
- Centralized HTTP client with axios
- Automatic wallet address injection
- Error handling and retry logic
- Request/response interceptors

### **Authentication Service** (`lib/services/auth.ts`)
- `connectWallet()` - Connect wallet to backend
- `disconnectWallet()` - Disconnect wallet
- `getProfile()` - Get user profile
- `updateProfile()` - Update user profile

### **Marketplace Service** (`lib/services/marketplace.ts`)
- `getLootBoxes()` - Get loot boxes with filters
- `getLootBoxById()` - Get specific loot box details
- `getFeaturedLootBoxes()` - Get featured loot boxes

### **Case Opening Service** (`lib/services/cases.ts`)
- `openCase()` - Open a case
- `getCaseOpeningStatus()` - Check opening status
- `makeCaseDecision()` - Make keep/buyback decision
- `getUserCaseOpenings()` - Get user's case openings

### **Inventory Service** (`lib/services/inventory.ts`)
- `getInventory()` - Get user inventory
- `getInventoryValue()` - Get inventory value
- `getSkinDetails()` - Get specific skin details
- `sellSkin()` - Sell skin via buyback

### **History Service** (`lib/services/history.ts`)
- `getTransactions()` - Get transaction history
- `getTransactionById()` - Get specific transaction
- `getTransactionSummary()` - Get transaction summary

### **Social Service** (`lib/services/social.ts`)
- `getLeaderboard()` - Get leaderboard
- `getUserRank()` - Get user's rank
- `getRecentActivity()` - Get recent activity
- `getActivityStats()` - Get activity statistics

## 🎮 **Usage Examples**

### **Authentication**
```typescript
import { useUser } from '@/lib/contexts/UserContext';
import { authService } from '@/lib/services';

// In a component
const { user, isConnected, connectWallet, disconnectWallet } = useUser();

// Connect wallet
await connectWallet('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU');

// Disconnect wallet
await disconnectWallet();
```

### **Marketplace**
```typescript
import { marketplaceService } from '@/lib/services';

// Get loot boxes
const { lootBoxes, pagination } = await marketplaceService.getLootBoxes({
  search: 'weapon',
  sortBy: 'price-low',
  filterBy: 'premium',
  page: 1,
  limit: 20
});

// Get specific loot box
const lootBox = await marketplaceService.getLootBoxById('uuid');
```

### **Case Opening**
```typescript
import { casesService } from '@/lib/services';

// Open a case
const result = await casesService.openCase({
  lootBoxTypeId: 'uuid',
  paymentMethod: 'SOL'
});

// Check status
const status = await casesService.getCaseOpeningStatus(result.caseOpeningId);

// Make decision
await casesService.makeCaseDecision(result.caseOpeningId, {
  decision: 'keep'
});
```

### **Inventory**
```typescript
import { inventoryService } from '@/lib/services';

// Get inventory
const { skins, summary } = await inventoryService.getInventory({
  sortBy: 'price-high',
  filterBy: 'rare'
});

// Sell skin
const result = await inventoryService.sellSkin('skin-id', {
  minAcceptablePrice: 100
});
```

## 🔧 **Configuration**

### **Environment Variables** (`.env.local`)
```bash
NEXT_PUBLIC_API_URL=http://localhost:3002/api/v1
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_SOLANA_NETWORK=devnet
```

### **TypeScript Configuration**
All types are exported from `@/lib/types/api` and can be imported:
```typescript
import { User, LootBoxType, Transaction } from '@/lib/types/api';
```

## 🎯 **Next Steps**

### **Phase 1: Component Integration**
1. Update `components/wallet-connect.tsx` to use `authService`
2. Add `UserProvider` to `app/layout.tsx`
3. Update marketplace page to use `marketplaceService`
4. Add loading states and error handling

### **Phase 2: Feature Integration**
1. Connect case opening flow to `casesService`
2. Update inventory page with `inventoryService`
3. Connect history page to `historyService`
4. Add leaderboard and activity integration

### **Phase 3: Advanced Features**
1. Add real-time updates with WebSocket
2. Implement offline support
3. Add performance optimizations
4. Create admin dashboard

## 🧪 **Testing**

### **Backend API Status**
- ✅ All endpoints working and tested
- ✅ Database seeded with realistic data
- ✅ Wallet authentication functional
- ✅ Real user data available for testing

### **Test Data Available**
- **3 Users** with different wallet addresses
- **6 Loot Box Types** with various rarities
- **25+ Skin Templates** with different weapons
- **12 Transactions** showing case openings and buybacks
- **3 User Skins** in inventory

## 🚀 **Ready to Integrate!**

The foundation is complete! You can now start integrating the services into your React components. Start with the marketplace page and work your way through each feature.

**Happy coding!** 🎮
