# 🔐 Solana Admin API Documentation

API endpoints para administradores gerenciarem o programa SkinVault on-chain.

## 📋 **Setup**

### 1. Variáveis de Ambiente

Crie/edite `src/server/.env`:

```bash
# Solana Configuration
SOLANA_CLUSTER=testnet
TESTNET_RPC_URL=https://api.testnet.solana.com

# Admin Wallet (keypair JSON array or path)
ADMIN_WALLET_PATH=~/.config/solana/id.json
# OR use private key directly:
# ADMIN_PRIVATE_KEY=[1,2,3,...]

# Admin Wallets (comma-separated addresses for API access)
ADMIN_WALLETS=YOUR_WALLET_ADDRESS_1,YOUR_WALLET_ADDRESS_2

# JWT Secret (for auth)
JWT_SECRET=your-secret-key
```

### 2. Iniciar o Servidor

```bash
cd src/server
npm run dev
```

Servidor deve iniciar em: `http://localhost:3000`

---

## 🔑 **Autenticação**

Todos os endpoints admin requerem:
1. ✅ Token JWT válido no header `Authorization: Bearer <token>`
2. ✅ Wallet do usuário deve estar na lista `ADMIN_WALLETS`

**Para desenvolvimento/teste**: O middleware está configurado para aceitar requisições sem auth.
**Para produção**: Implemente autenticação adequada.

---

## 📡 **Endpoints**

### 1. **Initialize Global State**

Inicializa o programa SkinVault (apenas uma vez).

**Endpoint:** `POST /api/admin/solana/initialize`

**Body:**
```json
{
  "oraclePubkey": "OPTIONAL_ORACLE_PUBKEY",
  "usdcMint": "OPTIONAL_USDC_MINT_ADDRESS"
}
```

**Exemplo curl:**
```bash
curl -X POST http://localhost:3000/api/admin/solana/initialize \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Global state initialized successfully",
  "data": {
    "signature": "5Kn...",
    "globalPDA": "7xJ...",
    "treasuryATA": "9mL...",
    "authority": "8pK...",
    "oracle": "8pK..."
  }
}
```

**Response (Already Initialized):**
```json
{
  "success": false,
  "error": "Program is already initialized"
}
```

---

### 2. **Publish Merkle Root (Create Batch)**

Cria um novo batch de inventário com merkle root.

**Endpoint:** `POST /api/admin/solana/publish-merkle-root`

**Body:**
```json
{
  "batchId": 1,
  "candyMachine": "CANDY_MACHINE_PUBKEY",
  "metadataUris": [
    "https://aggregator.walrus-testnet.walrus.space/v1/abc123...",
    "https://aggregator.walrus-testnet.walrus.space/v1/def456...",
    "https://aggregator.walrus-testnet.walrus.space/v1/ghi789..."
  ],
  "merkleRoot": "0x1234567890abcdef...",
  "snapshotTime": 1234567890
}
```

**Exemplo curl:**
```bash
curl -X POST http://localhost:3000/api/admin/solana/publish-merkle-root \
  -H "Content-Type: application/json" \
  -d '{
    "batchId": 1,
    "candyMachine": "11111111111111111111111111111111",
    "metadataUris": [
      "https://example.com/metadata/1.json",
      "https://example.com/metadata/2.json"
    ],
    "merkleRoot": "0000000000000000000000000000000000000000000000000000000000000000",
    "snapshotTime": 1234567890
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Merkle root published successfully",
  "data": {
    "signature": "3Km...",
    "batchId": 1,
    "batchPDA": "6nM...",
    "totalItems": 2
  }
}
```

---

### 3. **Get Global State**

Busca o estado global do programa.

**Endpoint:** `GET /api/admin/solana/global-state`

**Exemplo curl:**
```bash
curl http://localhost:3000/api/admin/solana/global-state
```

**Response:**
```json
{
  "success": true,
  "data": {
    "address": "7xJ...",
    "authority": "8pK...",
    "oraclePubkey": "9mL...",
    "usdcMint": "Gh9...",
    "buybackEnabled": true,
    "minTreasuryBalance": "1000000",
    "currentBatch": "1",
    "totalBoxesMinted": "0",
    "totalBuybacks": "0",
    "paused": false
  }
}
```

---

### 4. **Get Batch**

Busca informações de um batch específico.

**Endpoint:** `GET /api/admin/solana/batch/:batchId`

**Exemplo curl:**
```bash
curl http://localhost:3000/api/admin/solana/batch/1
```

**Response:**
```json
{
  "success": true,
  "data": {
    "address": "6nM...",
    "batchId": "1",
    "candyMachine": "11111...",
    "merkleRoot": [0, 0, 0, ...],
    "snapshotTime": "1234567890",
    "totalItems": "2",
    "boxesMinted": "0",
    "boxesOpened": "0",
    "metadataUris": [
      "https://example.com/metadata/1.json",
      "https://example.com/metadata/2.json"
    ]
  }
}
```

---

### 5. **Deposit Treasury**

Deposita USDC no treasury (a implementar).

**Endpoint:** `POST /api/admin/solana/deposit-treasury`

**Body:**
```json
{
  "amount": 1000000
}
```

**Exemplo curl:**
```bash
curl -X POST http://localhost:3000/api/admin/solana/deposit-treasury \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000000}'
```

---

## 🧪 **Script de Teste Completo**

Crie `test-admin-api.sh`:

```bash
#!/bin/bash

API_URL="http://localhost:3000/api/admin/solana"

echo "=== Testing Solana Admin API ==="
echo ""

# 1. Check Global State
echo "1. Fetching Global State..."
curl -s $API_URL/global-state | jq .
echo ""

# 2. Initialize (if not initialized)
echo "2. Initializing Global State..."
curl -s -X POST $API_URL/initialize \
  -H "Content-Type: application/json" \
  -d '{}' | jq .
echo ""

# 3. Publish Merkle Root
echo "3. Publishing Merkle Root (Batch 1)..."
curl -s -X POST $API_URL/publish-merkle-root \
  -H "Content-Type: application/json" \
  -d '{
    "batchId": 1,
    "candyMachine": "11111111111111111111111111111111",
    "metadataUris": [
      "https://example.com/1.json",
      "https://example.com/2.json"
    ],
    "merkleRoot": "0000000000000000000000000000000000000000000000000000000000000000",
    "snapshotTime": 1234567890
  }' | jq .
echo ""

# 4. Get Batch
echo "4. Fetching Batch 1..."
curl -s $API_URL/batch/1 | jq .
echo ""

echo "=== Tests Complete ==="
```

Executar:
```bash
chmod +x test-admin-api.sh
./test-admin-api.sh
```

---

## 🔒 **Segurança**

### ✅ **Checklist de Segurança**

- [ ] `ADMIN_WALLETS` configurado corretamente
- [ ] JWT secret forte e único
- [ ] Admin wallet keypair seguro (nunca commitado)
- [ ] Rate limiting habilitado
- [ ] Logs de auditoria para ações admin
- [ ] HTTPS em produção
- [ ] Firewall configurado

### ⚠️ **Importante**

1. **Nunca** commite sua keypair ou private key
2. **Nunca** exponha endpoints admin sem autenticação
3. **Sempre** valide inputs
4. **Sempre** use HTTPS em produção
5. **Monitore** todas as ações admin

---

## 📝 **Logs**

Os logs incluem:
- ✅ Inicialização do servidor
- ✅ Cluster Solana conectado
- ✅ Transações on-chain
- ✅ Erros e warnings
- ✅ PDAs derivados

Verifique no console do servidor.

---

## 🐛 **Troubleshooting**

### Erro: "Admin wallet keypair not found"
**Solução**: Configure `ADMIN_WALLET_PATH` ou `ADMIN_PRIVATE_KEY`

### Erro: "Account does not exist"
**Solução**: Inicialize o programa primeiro

### Erro: "Admin access required"
**Solução**: Adicione sua wallet em `ADMIN_WALLETS`

### Erro: "Signature verification failed"
**Solução**: Verifique se a keypair está correta e tem SOL

---

## 📚 **Próximos Passos**

1. ✅ Testar inicialização
2. ✅ Criar primeiro batch
3. ✅ Upload metadata para Walrus
4. ✅ Deploy Candy Machine
5. ✅ Integrar com frontend

---

**Status:** ✅ Pronto para teste
**Última atualização:** 2025-10-07
