# SolSkins API Testing Guide

Este guia fornece exemplos de curl para testar todos os endpoints da API SolSkins.

## Configuração Base

```bash
export API_BASE="http://localhost:4000/api/v1"
export AUTH_TOKEN="your_jwt_token_here"
```

## Autenticação

### 1. Conectar Wallet

```bash
# POST /auth/connect
curl -X POST "$API_BASE/auth/connect" \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "signature": "signature_from_wallet_signing",
    "message": "Login to SolSkins"
  }'
```

**Resposta esperada:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "walletAddress": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
      "username": null,
      "totalSpent": 0,
      "totalEarned": 0,
      "casesOpened": 0
    },
    "sessionToken": "jwt_token",
    "expiresAt": "2024-01-20T10:30:00Z"
  }
}
```

### 2. Desconectar

```bash
# POST /auth/disconnect
curl -X POST "$API_BASE/auth/disconnect" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

## Marketplace

### 3. Listar Loot Boxes

```bash
# GET /marketplace/loot-boxes
curl -X GET "$API_BASE/marketplace/loot-boxes" \
  -H "Authorization: Bearer $AUTH_TOKEN"

# Com filtros
curl -X GET "$API_BASE/marketplace/loot-boxes?search=weapon&sortBy=price-low&filterBy=premium&page=1&limit=10" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

**Resposta esperada:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Weapon Case",
      "description": "Contains various weapon skins",
      "priceSol": 2.5,
      "priceUsdc": 25.00,
      "imageUrl": "https://...",
      "rarity": "Standard",
      "isActive": true,
      "isFeatured": true,
      "chances": {
        "common": 79.92,
        "uncommon": 15.98,
        "rare": 3.2,
        "epic": 0.64,
        "legendary": 0.26
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 6,
    "totalPages": 1
  }
}
```

### 4. Detalhes do Loot Box

```bash
# GET /marketplace/loot-boxes/:id
curl -X GET "$API_BASE/marketplace/loot-boxes/uuid-here" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

## Abertura de Casos

### 5. Abrir Caso

```bash
# POST /cases/open
curl -X POST "$API_BASE/cases/open" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "lootBoxTypeId": "uuid",
    "paymentMethod": "SOL"
  }'
```

**Resposta esperada:**
```json
{
  "success": true,
  "data": {
    "caseOpeningId": "uuid",
    "nftMintAddress": "new_nft_mint_address",
    "vrfRequestId": "vrf_request_123",
    "transactionId": "uuid",
    "estimatedCompletionTime": "2024-01-15T14:35:00Z"
  }
}
```

### 6. Status da Abertura

```bash
# GET /cases/opening/:id/status
curl -X GET "$API_BASE/cases/opening/uuid-here/status" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

**Resposta esperada:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "completed",
    "vrfRequestId": "vrf_request_123",
    "randomnessSeed": "0x...",
    "skinResult": {
      "id": "uuid",
      "weapon": "AK-47",
      "skinName": "Redline",
      "rarity": "Rare",
      "condition": "Field-Tested",
      "currentPriceUsd": 45.20,
      "imageUrl": "https://...",
      "nftMintAddress": "nft_mint_address"
    },
    "openedAt": "2024-01-15T14:30:00Z",
    "completedAt": "2024-01-15T14:32:00Z"
  }
}
```

### 7. Decisão Pós-Abertura

```bash
# POST /cases/opening/:id/decision
curl -X POST "$API_BASE/cases/opening/uuid-here/decision" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "decision": "keep"
  }'

# Ou para vender
curl -X POST "$API_BASE/cases/opening/uuid-here/decision" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "decision": "buyback"
  }'
```

## Inventário

### 8. Listar Inventário

```bash
# GET /inventory
curl -X GET "$API_BASE/inventory" \
  -H "Authorization: Bearer $AUTH_TOKEN"

# Com filtros
curl -X GET "$API_BASE/inventory?search=ak47&sortBy=price-high&filterBy=rare&page=1&limit=20" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

**Resposta esperada:**
```json
{
  "success": true,
  "data": {
    "skins": [
      {
        "id": "uuid",
        "weapon": "AK-47",
        "skinName": "Redline",
        "rarity": "Rare",
        "condition": "Field-Tested",
        "currentPriceUsd": 45.20,
        "imageUrl": "https://...",
        "nftMintAddress": "nft_mint_address",
        "openedAt": "2024-01-15T14:30:00Z",
        "canSell": true
      }
    ],
    "summary": {
      "totalValue": 2893.70,
      "totalItems": 5,
      "rarityBreakdown": {
        "common": 1,
        "uncommon": 0,
        "rare": 2,
        "epic": 1,
        "legendary": 1
      }
    }
  }
}
```

### 9. Buyback de Skin

```bash
# POST /inventory/:skinId/buyback
curl -X POST "$API_BASE/inventory/uuid-here/buyback" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "minAcceptablePrice": 38.42
  }'
```

## Histórico

### 10. Histórico de Transações

```bash
# GET /history/transactions
curl -X GET "$API_BASE/history/transactions" \
  -H "Authorization: Bearer $AUTH_TOKEN"

# Com filtros
curl -X GET "$API_BASE/history/transactions?search=ak47&type=open_case&sortBy=date&page=1&limit=20" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

**Resposta esperada:**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "uuid",
        "type": "open_case",
        "amountSol": -2.5,
        "amountUsd": -25.00,
        "lootBoxType": {
          "name": "Weapon Case"
        },
        "resultSkin": {
          "weapon": "AK-47",
          "skinName": "Redline",
          "rarity": "Rare",
          "imageUrl": "https://..."
        },
        "txHash": "tx_hash",
        "status": "confirmed",
        "createdAt": "2024-01-15T14:30:00Z",
        "confirmedAt": "2024-01-15T14:32:00Z"
      }
    ],
    "summary": {
      "totalSpent": 47.50,
      "totalEarned": 2189.37,
      "netProfit": 2141.87,
      "casesOpened": 15,
      "skinsOwned": 5,
      "skinsSold": 10
    }
  }
}
```

## Leaderboard & Social

### 11. Leaderboard

```bash
# GET /leaderboard
curl -X GET "$API_BASE/leaderboard" \
  -H "Authorization: Bearer $AUTH_TOKEN"

# Com filtros
curl -X GET "$API_BASE/leaderboard?period=monthly&metric=inventory-value&limit=50" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

**Resposta esperada:**
```json
{
  "success": true,
  "data": [
    {
      "rank": 1,
      "user": {
        "id": "uuid",
        "username": "CryptoGamer",
        "walletAddress": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
      },
      "inventoryValue": 12450.00,
      "casesOpened": 234,
      "totalSpent": 2890.50,
      "totalEarned": 15340.50,
      "netProfit": 12450.00
    }
  ]
}
```

### 12. Atividade Recente

```bash
# GET /activity/recent
curl -X GET "$API_BASE/activity/recent" \
  -H "Authorization: Bearer $AUTH_TOKEN"

# Com limite
curl -X GET "$API_BASE/activity/recent?limit=25" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

## Admin Endpoints

### 13. Estatísticas Gerais

```bash
# GET /admin/stats/overview
curl -X GET "$API_BASE/admin/stats/overview" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

**Resposta esperada:**
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 1250,
      "active30d": 342,
      "active7d": 89
    },
    "revenue": {
      "totalSol": 2850.75,
      "totalUsd": 285075.50,
      "last30dSol": 450.25,
      "last30dUsd": 45025.00
    },
    "cases": {
      "totalOpened": 5420,
      "last30d": 850,
      "last7d": 125
    },
    "inventory": {
      "totalNfts": 3200,
      "totalValueUsd": 450000.00,
      "buybacksSold": 2220
    }
  }
}
```

## Health Check

### 14. Health Check

```bash
# GET /health
curl -X GET "http://localhost:3002/health"
```

**Resposta esperada:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-15T14:30:00Z",
    "version": "1.0.0",
    "environment": "development"
  }
}
```

## Scripts de Teste Automático

### Setup do Ambiente

```bash
#!/bin/bash
# test-setup.sh

export API_BASE="http://localhost:4000/api/v1"

# Conectar wallet e obter token
CONNECT_RESPONSE=$(curl -s -X POST "$API_BASE/auth/connect" \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "signature": "test_signature",
    "message": "Login to SolSkins"
  }')

export AUTH_TOKEN=$(echo $CONNECT_RESPONSE | jq -r '.data.sessionToken')
echo "Token obtido: $AUTH_TOKEN"
```

### Teste de Fluxo Completo

```bash
#!/bin/bash
# test-complete-flow.sh

source test-setup.sh

echo "1. Testando marketplace..."
curl -s -X GET "$API_BASE/marketplace/loot-boxes" \
  -H "Authorization: Bearer $AUTH_TOKEN" | jq '.'

echo "2. Testando abertura de caso..."
CASE_RESPONSE=$(curl -s -X POST "$API_BASE/cases/open" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "lootBoxTypeId": "uuid",
    "paymentMethod": "SOL"
  }')

CASE_ID=$(echo $CASE_RESPONSE | jq -r '.data.caseOpeningId')

echo "3. Verificando status..."
curl -s -X GET "$API_BASE/cases/opening/$CASE_ID/status" \
  -H "Authorization: Bearer $AUTH_TOKEN" | jq '.'

echo "4. Testando inventário..."
curl -s -X GET "$API_BASE/inventory" \
  -H "Authorization: Bearer $AUTH_TOKEN" | jq '.'

echo "5. Testando histórico..."
curl -s -X GET "$API_BASE/history/transactions" \
  -H "Authorization: Bearer $AUTH_TOKEN" | jq '.'
```

## Códigos de Erro Comuns

### 400 - Bad Request
```json
{
  "success": false,
  "error": {
    "message": "Validation error message",
    "code": "VALIDATION_ERROR"
  }
}
```

### 401 - Unauthorized
```json
{
  "success": false,
  "error": {
    "message": "No token provided",
    "code": "NO_TOKEN"
  }
}
```

### 404 - Not Found
```json
{
  "success": false,
  "error": {
    "message": "Resource not found",
    "code": "RESOURCE_NOT_FOUND"
  }
}
```

### 429 - Rate Limited
```json
{
  "success": false,
  "error": {
    "message": "Too many requests, please try again later",
    "code": "RATE_LIMIT_EXCEEDED"
  }
}
```

### 500 - Internal Server Error
```json
{
  "success": false,
  "error": {
    "message": "Internal server error",
    "code": "INTERNAL_ERROR"
  }
}
```

## Documentação Swagger

A documentação interativa está disponível em:
- **Development**: http://localhost:3002/api-docs
- **JSON Schema**: http://localhost:3002/api-docs.json 