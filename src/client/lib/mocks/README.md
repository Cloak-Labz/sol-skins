# Mock Data System

This directory contains a comprehensive mock data system for testing the Dust3 frontend without requiring a backend server.

## Quick Start

### Enabling/Disabling Mock Mode

Edit `src/client/lib/config/mock.ts` and toggle the `ENABLE_MOCK` flag:

```typescript
export const MOCK_CONFIG = {
  ENABLE_MOCK: true,  // Set to false to use real backend API
  DELAYS: {
    SHORT: 300,
    MEDIUM: 800,
    LONG: 1500,
  },
};
```

### What's Mocked

All API integrations **except wallet connection** are mocked when `ENABLE_MOCK` is `true`:

- ✅ **Inventory Service** - User skins, inventory summary, buyback
- ✅ **Marketplace Service** - Loot boxes, skin marketplace listings
- ✅ **Social Service** - Activity feed, leaderboard
- ✅ **History Service** - Transaction history
- ✅ **Loot Box Service** - Available packs, opening packs
- ✅ **User Profile Service** - User stats, profile updates
- ❌ **Wallet Connection** - Always uses real Solana wallet adapter

## File Structure

```
lib/mocks/
├── README.md          # This file
├── data.ts            # Mock data (users, skins, loot boxes, etc.)
└── services.ts        # Mock service implementations

lib/config/
└── mock.ts            # Configuration toggle and delay helpers

lib/services/
├── inventory.ts       # Integrated with mock
├── marketplace.ts     # Integrated with mock
├── social.ts          # Integrated with mock
├── history.ts         # Integrated with mock
├── cases.ts           # Integrated with mock
├── skinMarketplace.ts # Integrated with mock
├── leaderboard.ts     # Integrated with mock
└── auth.ts            # Integrated with mock
```

## Mock Data

### Users
- 3 mock users with different stats and inventory
- User #1 (CryptoGamer): 47 cases opened, $1,250.75 inventory value
- User #2 (SkinCollector): 35 cases, $890.50 inventory
- User #3 (ProTrader): 28 cases, $675.25 inventory

### Skins
- 3 skins in inventory (AK-47 Neon Rider, AWP Dragon Lore, M4A4 Howl)
- Different rarities: legendary, epic, rare
- Varied conditions: Factory New, Minimal Wear, Field-Tested

### Loot Boxes
- Starter Pack: $5.99 (common to rare skins)
- Premium Pack: $19.99 (rare to epic skins)
- Legendary Pack: $49.99 (guaranteed epic or legendary)

### Activity
- 4 mock activity items (case openings, buybacks)
- Includes user info, skin details, timestamp

### Leaderboard
- 5 ranked players with stats
- Cases opened, inventory value, total spent

### Marketplace Listings
- 2 active skin listings
- Different prices and sellers

## Customizing Mock Data

Edit `src/client/lib/mocks/data.ts` to customize:

```typescript
// Add more users
export const MOCK_USERS = [
  {
    id: "4",
    username: "YourUsername",
    walletAddress: "YOUR_WALLET_ADDRESS",
    createdAt: new Date().toISOString(),
  },
  // ...
];

// Add more skins
export const MOCK_SKINS: UserSkin[] = [
  {
    id: "skin-4",
    weapon: "Glock-18",
    skinName: "Fade",
    // ...
  },
  // ...
];
```

## Customizing Delays

Edit `src/client/lib/config/mock.ts` to adjust API response delays:

```typescript
export const MOCK_CONFIG = {
  ENABLE_MOCK: true,
  DELAYS: {
    SHORT: 500,    // Quick operations (previously 300ms)
    MEDIUM: 1200,  // Normal operations (previously 800ms)
    LONG: 2000,    // Slow operations (previously 1500ms)
  },
};
```

## Testing Workflow

1. **Development without Backend**
   ```bash
   # Set ENABLE_MOCK to true
   npm run dev
   ```
   All data will be served from mock services with realistic delays.

2. **Testing with Real Backend**
   ```bash
   # Set ENABLE_MOCK to false
   # Start backend server
   npm run dev
   ```
   Frontend will make real API calls to backend.

3. **Mixed Mode** (not recommended)
   You can selectively enable/disable mocks by editing individual service files, but it's easier to use the global toggle.

## How It Works

Each service file checks `MOCK_CONFIG.ENABLE_MOCK` before making API calls:

```typescript
// Example from inventory.ts
async getInventory(filters?: InventoryFilters) {
  if (MOCK_CONFIG.ENABLE_MOCK) {
    return mockInventoryService.getInventory(filters);
  }

  // Real API call
  const response = await apiClient.get('/inventory');
  return response.data;
}
```

Mock services simulate realistic delays using `mockDelay()`:

```typescript
async getInventory(params?: any) {
  await mockDelay("MEDIUM");  // 800ms delay
  return {
    skins: MOCK_SKINS,
    summary: { totalValue: 1250.75, totalItems: 3 },
  };
}
```

## Wallet Integration

**Important**: Wallet connection is NOT mocked. The Solana wallet adapter always functions normally, allowing you to:

- Connect real wallets (Phantom, Solflare, etc.)
- Sign transactions
- Test wallet-gated features

This allows realistic testing of wallet interactions while using mock data for everything else.

## API Response Format

All mock services return data in the same format as the real API:

```typescript
// Successful response
{
  success: true,
  data: { ... }
}

// Or just the data object for some endpoints
{
  skins: [...],
  summary: { ... },
  pagination: { ... }
}
```

## Troubleshooting

### Mock data not loading
- Check that `MOCK_CONFIG.ENABLE_MOCK` is `true`
- Clear browser cache and `.next` folder
- Restart dev server

### API errors in console
- Expected behavior when backend is not running
- Verify `ENABLE_MOCK` is `true` to suppress errors
- Mock services don't make network requests

### Wallet not connecting
- Wallet connection is NOT mocked
- Install a Solana wallet extension (Phantom, Solflare)
- Check browser console for wallet-specific errors

## Future Enhancements

Potential improvements:

- [ ] Mock data persistence (localStorage)
- [ ] Dynamic mock data generation
- [ ] Mock data reset/seed functionality
- [ ] Per-service mock toggles
- [ ] Mock analytics/error scenarios
