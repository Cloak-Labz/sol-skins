# Off-Chain Architecture Design

## Overview

This is a simplified implementation that mocks Solana program interactions and handles randomization off-chain. Perfect for rapid development and testing without blockchain complexity.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Off-Chain Flow                            │
└─────────────────────────────────────────────────────────────┘

1. User Opens Pack
   ├─> Frontend: Deduct user balance (USDC)
   ├─> Backend: Create CaseOpening record
   ├─> Backend: Off-chain randomization
   ├─> Backend: Select skin from pack pool
   ├─> Backend: Mock NFT mint (store in DB)
   └─> Frontend: Show reveal animation

2. User Decides
   ├─> Keep NFT
   │   └─> Save to user inventory
   │
   └─> Sell Back (Buyback)
       ├─> Calculate buyback price (85%)
       ├─> Credit user wallet
       ├─> Return NFT to pack pool
       └─> Record transaction

3. User Claims NFT (Future)
   └─> Actually mint NFT on-chain
       └─> Transfer to user wallet
```

## Data Flow

### Opening a Pack

```typescript
POST /api/v1/cases/open
Body: {
  packId: "pack_123",
  userId: "user_456"
}

Response: {
  openingId: "opening_789",
  status: "revealing",
  skin: {
    id: "skin_001",
    name: "AK-47 | Redline",
    rarity: "Classified",
    condition: "Field-Tested",
    price: 25.50,
    imageUrl: "https://..."
  }
}
```

### Buyback Flow

```typescript
POST /api/v1/inventory/:skinId/buyback
Body: {
  userId: "user_456"
}

Response: {
  transactionId: "tx_999",
  buybackPrice: 21.68, // 85% of $25.50
  credited: true,
  skinReturned: true
}
```

## Database Schema Changes

### CaseOpenings Table
```sql
CREATE TABLE case_openings (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  pack_id UUID REFERENCES packs(id),
  skin_id UUID REFERENCES skins(id),
  opened_at TIMESTAMP,
  decision VARCHAR(20), -- 'pending', 'keep', 'sell'
  decided_at TIMESTAMP,
  random_seed VARCHAR(100), -- For provable fairness
  random_value DECIMAL,
  status VARCHAR(20) -- 'revealing', 'decided', 'completed'
);
```

### UserSkins Table (Updated)
```sql
ALTER TABLE user_skins ADD COLUMN source VARCHAR(20); -- 'opened', 'bought'
ALTER TABLE user_skins ADD COLUMN opening_id UUID REFERENCES case_openings(id);
ALTER TABLE user_skins ADD COLUMN claimed BOOLEAN DEFAULT false; -- If minted on-chain
ALTER TABLE user_skins ADD COLUMN nft_mint VARCHAR(100); -- Actual NFT mint address (null if not claimed)
```

### Packs Table
```sql
CREATE TABLE packs (
  id UUID PRIMARY KEY,
  name VARCHAR(100),
  description TEXT,
  price DECIMAL,
  image_url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP
);
```

### PackSkins Table (Pool)
```sql
CREATE TABLE pack_skins (
  id UUID PRIMARY KEY,
  pack_id UUID REFERENCES packs(id),
  skin_template_id UUID REFERENCES skin_templates(id),
  drop_rate DECIMAL, -- Probability weight
  available_count INT, -- How many available in pool
  total_opened INT DEFAULT 0 -- How many have been opened
);
```

## Mock Services

### 1. Mock Solana Service (`src/server/services/mockSolana.service.ts`)

```typescript
/**
 * Mocks all Solana program interactions
 * No actual blockchain calls - everything in DB
 */
class MockSolanaService {
  // Mock NFT minting
  async mintNFT(skin: Skin): Promise<string> {
    // Generate fake mint address
    return `mock_${Date.now()}_${Math.random().toString(36)}`;
  }

  // Mock transfer
  async transferNFT(mint: string, to: string): Promise<string> {
    return `mock_tx_${Date.now()}`;
  }

  // Mock buyback
  async executeBuyback(mint: string, price: number): Promise<string> {
    return `mock_tx_${Date.now()}`;
  }
}
```

### 2. Off-Chain Randomization (`src/server/services/randomization.service.ts`)

```typescript
/**
 * Provably fair randomization using crypto
 */
class RandomizationService {
  async generateRandom(seed: string): Promise<number> {
    const hash = crypto
      .createHash('sha256')
      .update(seed + Date.now().toString())
      .digest('hex');

    // Convert to 0-1 range
    return parseInt(hash.substring(0, 16), 16) / Math.pow(2, 64);
  }

  selectSkinFromPool(
    random: number,
    pool: PackSkin[]
  ): PackSkin {
    // Weighted random selection
    const totalWeight = pool.reduce((sum, ps) => sum + ps.dropRate, 0);
    let cumulative = 0;

    for (const skin of pool) {
      cumulative += skin.dropRate / totalWeight;
      if (random <= cumulative) {
        return skin;
      }
    }

    return pool[pool.length - 1]; // Fallback
  }
}
```

## API Implementation

### Case Opening Controller

```typescript
// src/server/controllers/cases.controller.ts

export class CasesController {
  async openCase(req: Request, res: Response) {
    const { packId } = req.body;
    const userId = req.user.id;

    // 1. Validate pack exists and is active
    const pack = await packRepository.findById(packId);
    if (!pack || !pack.active) {
      return res.status(404).json({ error: 'Pack not found' });
    }

    // 2. Check user balance
    const user = await userRepository.findById(userId);
    if (user.balance < pack.price) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // 3. Deduct balance
    await userRepository.updateBalance(userId, -pack.price);

    // 4. Get pack skin pool
    const pool = await packSkinsRepository.findByPackId(packId);

    // 5. Generate random and select skin
    const seed = `${userId}_${packId}_${Date.now()}`;
    const randomValue = await randomizationService.generateRandom(seed);
    const selectedSkin = randomizationService.selectSkinFromPool(randomValue, pool);

    // 6. Create case opening record
    const opening = await caseOpeningsRepository.create({
      userId,
      packId,
      skinId: selectedSkin.skinTemplateId,
      randomSeed: seed,
      randomValue,
      status: 'revealing',
    });

    // 7. Get skin details
    const skin = await skinTemplateRepository.findById(selectedSkin.skinTemplateId);

    return res.json({
      success: true,
      data: {
        openingId: opening.id,
        skin: {
          id: skin.id,
          name: skin.name,
          rarity: skin.rarity,
          condition: skin.condition,
          price: skin.price,
          imageUrl: skin.imageUrl,
        },
      },
    });
  }

  async makeDecision(req: Request, res: Response) {
    const { openingId } = req.params;
    const { decision } = req.body; // 'keep' or 'sell'
    const userId = req.user.id;

    const opening = await caseOpeningsRepository.findById(openingId);

    if (opening.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (decision === 'keep') {
      // Add to user inventory (mock NFT)
      const mockMint = await mockSolanaService.mintNFT(opening.skin);

      await userSkinsRepository.create({
        userId,
        skinTemplateId: opening.skinId,
        openingId: opening.id,
        source: 'opened',
        nftMint: mockMint,
        claimed: false,
      });

      await caseOpeningsRepository.update(openingId, {
        decision: 'keep',
        decidedAt: new Date(),
        status: 'completed',
      });

      return res.json({ success: true, action: 'kept' });
    }

    if (decision === 'sell') {
      // Buyback
      const skin = await skinTemplateRepository.findById(opening.skinId);
      const buybackPrice = skin.price * 0.85;

      // Credit user
      await userRepository.updateBalance(userId, buybackPrice);

      // Record transaction
      await transactionRepository.create({
        userId,
        type: 'buyback',
        amount: buybackPrice,
        skinId: skin.id,
      });

      await caseOpeningsRepository.update(openingId, {
        decision: 'sell',
        decidedAt: new Date(),
        status: 'completed',
      });

      return res.json({
        success: true,
        action: 'sold',
        buybackPrice,
      });
    }
  }
}
```

## Frontend Changes

### Mock Wallet Connection

```typescript
// src/client/lib/mockWallet.ts

export class MockWalletService {
  private mockBalance = 1000; // Mock USDC

  async getBalance(): Promise<number> {
    return this.mockBalance;
  }

  async transfer(amount: number): Promise<string> {
    this.mockBalance -= amount;
    return `mock_tx_${Date.now()}`;
  }
}
```

### Updated Case Opening Flow

```typescript
// src/client/components/CaseOpening.tsx

const openCase = async (packId: string) => {
  // No blockchain interaction needed
  const response = await fetch('/api/v1/cases/open', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ packId }),
  });

  const { openingId, skin } = await response.json();

  // Show reveal animation
  setRevealing(true);
  setTimeout(() => {
    setRevealedSkin(skin);
    setRevealing(false);
  }, 3000);
};

const makeDecision = async (decision: 'keep' | 'sell') => {
  await fetch(`/api/v1/cases/opening/${openingId}/decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decision }),
  });

  if (decision === 'sell') {
    toast.success(`Sold for $${buybackPrice}!`);
  } else {
    toast.success('Added to inventory!');
  }
};
```

## Benefits

✅ **Fast Development**
- No blockchain delays
- Instant testing
- Easy debugging

✅ **Cost Effective**
- No SOL/gas fees
- No devnet setup
- No RPC costs

✅ **Full Control**
- Adjust drop rates easily
- Test edge cases
- Mock any scenario

✅ **User Experience**
- Instant feedback
- No wallet popups
- Smooth animations

✅ **Future Proof**
- Can add real blockchain later
- NFT claiming as upgrade path
- Gradual migration possible

## Migration Path (Future)

When ready for real blockchain:

1. **Keep mock by default**
2. **Add "Claim NFT" feature**
   - User clicks "Claim" on inventory item
   - Actually mint NFT on-chain
   - Update `claimed` flag
3. **Gradual rollout**
   - Start with small items
   - Test thoroughly
   - Scale up

## Configuration

```typescript
// .env
MOCK_MODE=true
MOCK_NFT_MINTING=true
MOCK_BUYBACK=true
ENABLE_REAL_BLOCKCHAIN=false
```

This gives flexibility to switch between mock and real implementation.
