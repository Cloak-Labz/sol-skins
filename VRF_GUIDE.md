# 🎲 VRF (Verifiable Random Function) Guide

## 📖 **Como funciona o fluxo de abrir uma box**

### **Fluxo Completo:**

```
User (Frontend) → openBox → Creates VrfPending account → Waits for VRF
                                          ↓
Backend VRF Service → Monitors VrfPending → Calls vrfCallback → Fulfills randomness
                                          ↓
User (Frontend) → Checks if opened → Calls revealAndClaim → Gets NFT
```

---

## 🔄 **1. User Abre a Box (Frontend)**

O usuário clica em "Open Box" no frontend:

```typescript
// Frontend code
const result = await openUserBox(boxAsset, poolSize);
// Creates VrfPending account on-chain
// Returns signature
```

**O que acontece on-chain:**
1. ✅ BoxState marcado como "pending VRF"
2. ✅ VrfPending account criado
3. ✅ Request ID gerado
4. ✅ Evento `BoxOpenRequested` emitido

---

## 🤖 **2. Backend Processa VRF (Automático ou Manual)**

### **Opção A: Automático (Recomendado)**

O serviço VRF roda em background monitorando novas requisições:

```typescript
// Backend - starts automatically
const vrfService = startVrfService();
// Polls every 5 seconds
// Automatically fulfills pending VRF requests
```

### **Opção B: Manual (Para Testes)**

Usar o endpoint admin para cumprir manualmente:

```bash
curl -X POST http://localhost:3000/api/admin/solana/vrf/fulfill \
  -H "Content-Type: application/json" \
  -d '{"boxAsset": "BOX_ASSET_PUBKEY"}'
```

---

## 🎁 **3. User Revela e Reivindica NFT**

Depois que o VRF é cumprido, o usuário pode revelar:

```typescript
// Frontend code (to be implemented)
const nft = await revealAndClaim(boxAsset);
// Mints the NFT based on random selection
```

---

## 🔧 **Setup do Serviço VRF**

### **1. Iniciar o Servidor**

O serviço VRF inicia automaticamente com o servidor:

```bash
cd src/server
npm run dev
```

Você verá:
```
✅ VRF service started - monitoring pending VRF requests
```

### **2. Configuração (Opcional)**

Ajuste o intervalo de polling em `VrfService.ts`:

```typescript
private pollInterval: number = 5000; // 5 seconds (default)
```

---

## 📡 **Endpoints VRF**

### **1. Ver Requisições Pendentes**

```bash
curl http://localhost:3000/api/admin/solana/vrf/pending
```

**Response:**
```json
{
  "success": true,
  "data": {
    "count": 2,
    "requests": [
      {
        "address": "VrfPending_PDA",
        "boxMint": "BoxAsset_Pubkey",
        "requestId": "1",
        "poolSize": "10",
        "requestTime": "2025-10-07T12:34:56.000Z"
      }
    ]
  }
}
```

### **2. Cumprir VRF Manualmente**

```bash
curl -X POST http://localhost:3000/api/admin/solana/vrf/fulfill \
  -H "Content-Type: application/json" \
  -d '{
    "boxAsset": "BOX_ASSET_PUBKEY_HERE"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "VRF fulfilled successfully",
  "data": {
    "signature": "5Kn...",
    "boxAsset": "BOX_ASSET_PUBKEY"
  }
}
```

---

## 🧪 **Testar o Fluxo Completo**

### **Teste Passo a Passo:**

```bash
# 1. User abre box (frontend ou API)
# Isso cria uma VrfPending account

# 2. Verificar pending VRF
curl http://localhost:3000/api/admin/solana/vrf/pending

# 3a. Deixar o serviço automático processar (esperar 5-10s)
# OU

# 3b. Cumprir manualmente
curl -X POST http://localhost:3000/api/admin/solana/vrf/fulfill \
  -H "Content-Type: application/json" \
  -d '{"boxAsset": "YOUR_BOX_ASSET"}'

# 4. Verificar se foi cumprido (check box state)
# boxState.opened === true
# boxState.randomIndex > 0

# 5. User pode agora revelar o NFT
```

---

## 🔒 **Segurança**

### **Geração de Randomness:**

O serviço usa `crypto.randomBytes(32)` para gerar 32 bytes seguros de randomness.

```typescript
private generateRandomness(): Uint8Array {
  return crypto.randomBytes(32);
}
```

### **Verificação:**

- ✅ Apenas o oracle (admin wallet) pode chamar `vrfCallback`
- ✅ Randomness é verificável on-chain
- ✅ Request ID único por box

---

## 📊 **Monitoramento**

### **Logs do Serviço:**

```
📡 Found 1 pending VRF request(s)
🎲 Fulfilling VRF request for box: 8pK...
   Request ID: 1
   Pool Size: 10
✅ VRF fulfilled! TX: 5Kn...
   Box can now be revealed
```

### **Erros Comuns:**

1. **"Account does not exist"**
   - VrfPending não foi criado ainda
   - Box não foi aberta

2. **"Invalid oracle"**
   - A wallet admin não é o oracle configurado
   - Verifique global state

3. **"Already fulfilled"**
   - VRF já foi cumprido para esta box
   - BoxState.opened já é true

---

## 🚀 **Produção**

Para produção, considere:

1. **Switchboard VRF** - VRF descentralizado e verificável
2. **Webhook** - Notificar frontend quando VRF é cumprido
3. **Queue System** - Redis/Bull para processar em escala
4. **Monitoring** - Alertas se VRF demora muito
5. **Failover** - Backup oracle

---

## 📝 **Próximos Passos**

1. ✅ Serviço VRF implementado e testado
2. ⏳ Implementar `revealAndClaim` no frontend
3. ⏳ Adicionar notificações ao usuário
4. ⏳ Deploy Candy Machine (se necessário)
5. ⏳ Testar fluxo completo end-to-end

---

**Status:** ✅ VRF Service implementado e pronto para teste
**Modo:** Auto + Manual (para desenvolvimento)
