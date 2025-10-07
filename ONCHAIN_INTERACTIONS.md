# 🔗 SkinVault - Todas as Interações On-Chain

## 📋 **Índice**

1. [Visão Geral do Programa](#visão-geral)
2. [Estrutura de Dados (Accounts)](#estrutura-de-dados)
3. [Instruções (Todas)](#instruções)
4. [Fluxo Completo do Usuário](#fluxo-completo)
5. [PDAs e Seeds](#pdas-e-seeds)
6. [Eventos Emitidos](#eventos-emitidos)

---

## 🎯 **Visão Geral do Programa**

**Program ID:** `44UwMzMZUcobRp4YyucjvAbBeTFJ3uBPxg7YqwHS2ncp`

O SkinVault é um programa Solana que implementa um sistema de loot boxes com:
- ✅ Sistema de inventário com Merkle Tree
- ✅ VRF (Verifiable Random Function) para randomização
- ✅ Buyback system (compra de volta por USDC)
- ✅ NFTs usando Metaplex Core
- ✅ Treasury management

---

## 📦 **Estrutura de Dados (Accounts)**

### **1. Global State (Singleton)**

**PDA:** `["global"]`

```rust
pub struct Global {
    pub authority: Pubkey,           // Admin do programa
    pub oracle_pubkey: Pubkey,       // Oracle para VRF e preços
    pub usdc_mint: Pubkey,           // USDC mint para buyback
    pub buyback_enabled: bool,       // Se buyback está ativo
    pub min_treasury_balance: u64,   // Saldo mínimo para circuit breaker
    pub current_batch: u64,          // Contador de batches
    pub total_boxes_minted: u64,     // Total de boxes criadas
    pub total_buybacks: u64,         // Total de buybacks
    pub total_buyback_volume: u64,   // Volume total em USDC
    pub paused: bool,                // Emergency pause
    pub pending_authority: Option<Pubkey>, // Para transferência de authority
    pub bump: u8,                    // PDA bump
}
```

**Quando é criado:** Instrução `initialize` (uma vez, no início)

**Quem pode modificar:** Apenas `authority`

---

### **2. Batch (Múltiplos)**

**PDA:** `["batch", batch_id]`

```rust
pub struct Batch {
    pub batch_id: u64,                    // ID único do batch
    pub candy_machine: Pubkey,            // Candy Machine (referência)
    pub merkle_root: [u8; 32],           // Merkle root do inventário
    pub snapshot_time: i64,              // Timestamp do snapshot
    pub total_items: u64,                // Total de itens no inventário
    pub boxes_minted: u64,               // Boxes criadas deste batch
    pub boxes_opened: u64,               // Boxes abertas
    pub bump: u8,                        // PDA bump
    pub metadata_uris: Vec<String>,      // URIs dos metadatas (Walrus)
}
```

**Quando é criado:** Instrução `publish_merkle_root`

**Quem pode criar:** Apenas `authority`

**Exemplo:**
- Batch 1: 100 skins CS:GO diferentes
- Batch 2: 50 skins Fortnite diferentes
- Cada batch tem seu próprio pool de items

---

### **3. BoxState (Múltiplos - um por box)**

**PDA:** `["box", asset_pubkey]`

```rust
pub struct BoxState {
    pub owner: Pubkey,                   // Dono da box
    pub batch_id: u64,                   // Batch que esta box pertence
    pub opened: bool,                    // Se foi aberta
    pub assigned_inventory: [u8; 32],    // Hash do item atribuído
    pub asset: Pubkey,                   // NFT Core Asset
    pub mint_time: i64,                  // Quando foi criada
    pub open_time: i64,                  // Quando foi aberta
    pub random_index: u64,               // Índice aleatório (após VRF)
    pub redeemed: bool,                  // Se foi vendida de volta
    pub redeem_time: i64,                // Quando foi vendida
    pub bump: u8,                        // PDA bump
}
```

**Quando é criado:** Instrução `create_box`

**Quem pode criar:** Qualquer usuário (que paga a box)

**Lifecycle:**
```
Created → Opened (VRF pending) → VRF Fulfilled → Revealed → (Optional) Redeemed
```

---

### **4. VrfPending (Temporário)**

**PDA:** `["vrf_pending", asset_pubkey]`

```rust
pub struct VrfPending {
    pub box_mint: Pubkey,     // Box que solicitou VRF
    pub request_id: u64,      // ID da requisição
    pub request_time: i64,    // Timestamp da requisição
    pub pool_size: u64,       // Tamanho do pool para random
    pub randomness: u64,      // Resultado do VRF (0 se pendente)
    pub user: Pubkey,         // Usuário que solicitou
    pub bump: u8,             // PDA bump
}
```

**Quando é criado:** Instrução `open_box`

**Quando é deletado:** Após `vrf_callback` cumprir o VRF

**Duração:** Temporário (alguns segundos até VRF ser cumprido)

---

### **5. PriceStore (Múltiplos - um por item)**

**PDA:** `["price", inventory_id_hash]`

```rust
pub struct PriceStore {
    pub inventory_id_hash: [u8; 32],  // Hash do item
    pub price: u64,                   // Preço em USDC (6 decimals)
    pub timestamp: i64,               // Quando foi definido
    pub oracle: Pubkey,               // Oracle que assinou
    pub update_count: u64,            // Número de updates
    pub bump: u8,                     // PDA bump
}
```

**Quando é criado:** Instrução `set_price_signed`

**Quem pode criar:** Oracle (com assinatura válida)

**Exemplo:**
```
AK-47 Redline: $50.00 USDC
AWP Dragon Lore: $2000.00 USDC
```

---

## 🔧 **Instruções (Todas as 17)**

### **👑 ADMIN INSTRUCTIONS (8)**

#### **1. `initialize`**

**Descrição:** Inicializa o programa pela primeira vez (apenas uma vez)

**Quem pode chamar:** Qualquer um (mas apenas funciona se Global não existe)

**Contas:**
```rust
{
    global: Global (write),              // PDA criado
    usdc_mint: USDC Mint,                // Token USDC
    treasury_ata: ATA (write),           // Treasury ATA (criado)
    authority: Signer,                   // Admin
    token_program: Token Program,
    associated_token_program: ATA Program,
    system_program: System Program
}
```

**Argumentos:**
```rust
oracle_pubkey: Pubkey  // Chave pública do oracle
```

**O que faz:**
1. Cria conta Global
2. Cria Treasury ATA para USDC
3. Define authority como o signatário
4. Define oracle_pubkey
5. Inicializa contadores em 0

**Exemplo:**
```bash
# Backend
POST /api/admin/solana/initialize
{
  "oraclePubkey": "8pKjj7Q..." (opcional)
}
```

---

#### **2. `publish_merkle_root`**

**Descrição:** Cria um novo batch de inventário com Merkle root

**Quem pode chamar:** Apenas `authority`

**Contas:**
```rust
{
    global: Global,                      // Leitura
    batch: Batch (write),                // PDA criado
    authority: Signer,                   // Deve ser authority
    system_program: System Program
}
```

**Argumentos:**
```rust
batch_id: u64,                          // ID único
candy_machine: Pubkey,                  // Referência CM
metadata_uris: Vec<String>,             // Lista de URIs
merkle_root: [u8; 32],                 // Merkle root
snapshot_time: i64                      // Timestamp
```

**O que faz:**
1. Cria conta Batch
2. Armazena metadata URIs (Walrus)
3. Armazena merkle root para verificação
4. Inicializa contadores (boxes_minted, boxes_opened)

**Exemplo:**
```bash
# Backend
POST /api/admin/solana/publish-merkle-root
{
  "batchId": 1,
  "candyMachine": "11111...",
  "metadataUris": [
    "https://aggregator.walrus-testnet.walrus.space/v1/abc123",
    "https://aggregator.walrus-testnet.walrus.space/v1/def456"
  ],
  "merkleRoot": "0x000...",
  "snapshotTime": 1696723200
}
```

---

#### **3. `set_oracle`**

**Descrição:** Atualiza o oracle public key

**Quem pode chamar:** Apenas `authority`

**Contas:**
```rust
{
    global: Global (write),
    authority: Signer
}
```

**Argumentos:**
```rust
new_oracle_pubkey: Pubkey
```

**O que faz:**
- Atualiza `global.oracle_pubkey`
- Emite evento `OracleUpdated`

---

#### **4. `toggle_buyback`**

**Descrição:** Ativa/desativa o sistema de buyback

**Quem pode chamar:** Apenas `authority`

**Contas:**
```rust
{
    global: Global (write),
    authority: Signer
}
```

**Argumentos:**
```rust
enabled: bool
```

**O que faz:**
- Define `global.buyback_enabled`
- Emite evento `BuybackToggled`

---

#### **5. `set_min_treasury_balance`**

**Descrição:** Define saldo mínimo do treasury (circuit breaker)

**Quem pode chamar:** Apenas `authority`

**Contas:**
```rust
{
    global: Global (write),
    authority: Signer
}
```

**Argumentos:**
```rust
amount: u64  // Em USDC (6 decimals)
```

**O que faz:**
- Define `global.min_treasury_balance`
- Se treasury < min_balance, buyback para de funcionar

---

#### **6. `deposit_treasury`**

**Descrição:** Deposita USDC no treasury

**Quem pode chamar:** Qualquer um (mas geralmente admin)

**Contas:**
```rust
{
    global: Global,
    treasury_ata: ATA (write),           // Treasury recebe
    depositor_ata: ATA (write),          // Depositante paga
    usdc_mint: USDC Mint,
    depositor: Signer,
    token_program: Token Program
}
```

**Argumentos:**
```rust
amount: u64
```

**O que faz:**
- Transfere USDC de depositor para treasury
- Emite evento `TreasuryDeposit`

---

#### **7. `withdraw_treasury`**

**Descrição:** Saca USDC do treasury

**Quem pode chamar:** Apenas `authority`

**Contas:**
```rust
{
    global: Global,
    treasury_ata: ATA (write),           // Treasury paga
    recipient_ata: ATA (write),          // Recipiente recebe
    usdc_mint: USDC Mint,
    authority: Signer,
    token_program: Token Program
}
```

**Argumentos:**
```rust
amount: u64
```

**O que faz:**
- Transfere USDC do treasury para recipient
- Usa PDA como signatário (treasury_ata owned by PDA)

---

#### **8. `emergency_pause`**

**Descrição:** Pausa/despausa todas operações de usuário

**Quem pode chamar:** Apenas `authority`

**Contas:**
```rust
{
    global: Global (write),
    authority: Signer
}
```

**Argumentos:**
```rust
paused: bool
```

**O que faz:**
- Define `global.paused`
- Quando `true`, todas operações de user falham

---

### **👤 USER INSTRUCTIONS (6)**

#### **9. `create_box`**

**Descrição:** Cria uma nova loot box (compra uma box)

**Quem pode chamar:** Qualquer usuário

**Contas:**
```rust
{
    global: Global,                      // Verifica se não pausado
    box_state: BoxState (write),         // PDA criado
    owner: Signer (write),               // Paga criação
    box_asset: Any account,              // Asset pubkey (seed)
    system_program: System Program
}
```

**Argumentos:**
```rust
batch_id: u64  // Qual batch esta box pertence
```

**O que faz:**
1. ✅ Verifica se batch existe
2. ✅ Cria conta BoxState
3. ✅ Define owner, batch_id, mint_time
4. ✅ Define opened = false
5. ✅ Incrementa batch.boxes_minted
6. ✅ Incrementa global.total_boxes_minted
7. ✅ Emite evento `BoxMinted`

**Exemplo:**
```typescript
// Frontend
const boxAsset = Keypair.generate();
await createBox({
  program,
  batchId: 1,
  owner: wallet.publicKey,
  boxAsset: boxAsset
});
```

**Resultado:**
- Box criada mas ainda não aberta
- BoxState.opened = false
- Aguardando user chamar open_box

---

#### **10. `open_box`**

**Descrição:** Abre uma box e solicita VRF

**Quem pode chamar:** Owner da box

**Contas:**
```rust
{
    global: Global,                      // Verifica se não pausado
    box_state: BoxState (write),         // Marca como "pending VRF"
    batch: Batch,                        // Para validar
    vrf_pending: VrfPending (write),     // PDA criado
    owner: Signer (write),               // Paga criação VrfPending
    system_program: System Program
}
```

**Argumentos:**
```rust
pool_size: u64  // Tamanho do pool para randomização
```

**O que faz:**
1. ✅ Verifica se box não foi aberta ainda
2. ✅ Verifica se owner é o dono
3. ✅ Cria conta VrfPending
4. ✅ Gera request_id único
5. ✅ Define pool_size
6. ✅ Marca box_state como "pending"
7. ✅ Emite evento `BoxOpenRequested`

**Exemplo:**
```typescript
// Frontend
await openBox({
  program,
  boxAsset: boxAssetPubkey,
  owner: wallet.publicKey,
  poolSize: 10  // Número de items no batch
});
```

**Resultado:**
- VrfPending account criado
- Aguardando oracle chamar vrf_callback

---

#### **11. `vrf_callback`**

**Descrição:** Oracle cumpre a requisição VRF (fornece randomness)

**Quem pode chamar:** Apenas `oracle_pubkey`

**Contas:**
```rust
{
    global: Global,                      // Verifica oracle
    batch: Batch (write),                // Incrementa boxes_opened
    box_state: BoxState (write),         // Define random_index
    vrf_pending: VrfPending (write),     // Deletado no final
    vrf_authority: Signer                // Deve ser oracle
}
```

**Argumentos:**
```rust
request_id: u64,         // ID da requisição
randomness: [u8; 32]     // 32 bytes de randomness
```

**O que faz:**
1. ✅ Verifica se vrf_authority == oracle_pubkey
2. ✅ Valida request_id
3. ✅ Calcula random_index = randomness % pool_size
4. ✅ Define box_state.opened = true
5. ✅ Define box_state.random_index
6. ✅ Define box_state.open_time
7. ✅ Incrementa batch.boxes_opened
8. ✅ Deleta VrfPending account (fecha)
9. ✅ Emite evento `BoxOpened`

**Exemplo:**
```typescript
// Backend (VrfService)
const randomness = crypto.randomBytes(32);
await program.methods
  .vrfCallback(requestId, Array.from(randomness))
  .accounts({...})
  .rpc();
```

**Resultado:**
- Box agora tem random_index
- User pode chamar reveal_and_claim

---

#### **12. `reveal_and_claim`**

**Descrição:** Revela e reivindica o NFT baseado no random_index

**Quem pode chamar:** Owner da box

**Contas:**
```rust
{
    user: Signer (write),                // Owner
    global_state: Global,
    box_state: BoxState (write),         // Atualiza inventory
    batch: Batch,                        // Lê metadata_uris
    asset: NewAsset (write, signer),     // NFT Core criado
    collection: Optional<Collection>,    // Collection (opcional)
    core_program: Core Program,          // Metaplex Core
    system_program: System Program
}
```

**Argumentos:** Nenhum (usa random_index já definido)

**O que faz:**
1. ✅ Verifica se box foi aberta (opened = true)
2. ✅ Verifica se random_index > 0 (VRF cumprido)
3. ✅ Pega metadata_uri usando random_index
4. ✅ **Minta NFT Core** usando Metaplex Core
5. ✅ Define assigned_inventory com hash do item
6. ✅ Emite evento `InventoryAssigned`

**Exemplo:**
```typescript
// Frontend (TO IMPLEMENT)
await revealAndClaim({
  program,
  boxAsset: boxAssetPubkey,
  user: wallet.publicKey
});
```

**Resultado:**
- NFT Core criado e transferido para user
- Box agora tem assigned_inventory
- User pode vender de volta (sell_back)

---

#### **13. `set_price_signed`**

**Descrição:** Define preço de um item (assinado pelo oracle)

**Quem pode chamar:** Qualquer um (mas precisa de assinatura do oracle)

**Contas:**
```rust
{
    global: Global,                      // Verifica oracle
    price_store: PriceStore (write),     // PDA criado/atualizado
    payer: Signer (write),               // Paga criação
    system_program: System Program
}
```

**Argumentos:**
```rust
inventory_id_hash: [u8; 32],  // Hash do item
price: u64,                   // Preço em USDC
timestamp: i64,               // Timestamp
signature: [u8; 64]           // Assinatura Ed25519 do oracle
```

**O que faz:**
1. ✅ Verifica assinatura do oracle
2. ✅ Valida timestamp (não pode ser muito antigo)
3. ✅ Cria/atualiza PriceStore
4. ✅ Define price, timestamp, oracle
5. ✅ Incrementa update_count
6. ✅ Emite evento `PriceSet`

**Exemplo:**
```typescript
// Backend (Oracle assina)
const message = `${inventoryIdHash}|${price}|${timestamp}`;
const signature = sign(message, oracleKeypair);

// Frontend usa
await setPriceSigned({
  program,
  inventoryIdHash,
  price,
  timestamp,
  signature
});
```

**Resultado:**
- Preço on-chain verificável
- Usado para sell_back

---

#### **14. `sell_back`**

**Descrição:** Vende item de volta para o programa por USDC

**Quem pode chamar:** Owner do item (box revelada)

**Contas:**
```rust
{
    global: Global (write),              // Atualiza stats
    treasury_ata: ATA (write),           // Treasury paga
    user_ata: ATA (write),               // User recebe
    usdc_mint: USDC Mint,
    price_store: PriceStore,             // Lê preço
    box_state: BoxState (write),         // Marca redeemed
    asset: Asset (write),                // NFT queimado
    collection: Optional<Collection> (write),
    core_program: Core Program,
    seller: Signer (write),
    token_program: Token Program,
    system_program: System Program
}
```

**Argumentos:**
```rust
min_price: u64  // Proteção de slippage
```

**O que faz:**
1. ✅ Verifica se buyback está habilitado
2. ✅ Verifica se box foi revelada
3. ✅ Verifica se não foi redimida ainda
4. ✅ Busca preço no PriceStore
5. ✅ Valida preço não é muito antigo
6. ✅ Verifica price >= min_price
7. ✅ Calcula spread fee (ex: 5%)
8. ✅ **Queima NFT Core**
9. ✅ Transfere USDC (price - fee) para user
10. ✅ Marca box_state.redeemed = true
11. ✅ Atualiza stats (total_buybacks, volume)
12. ✅ Emite evento `BuybackExecuted`

**Exemplo:**
```typescript
// Frontend
await sellBack({
  program,
  boxAsset: boxAssetPubkey,
  seller: wallet.publicKey,
  minPrice: 45_000000  // $45 USDC (proteção)
});
```

**Resultado:**
- NFT queimado
- User recebe USDC
- Box marcada como redeemed

---

### **🔐 ADMIN TRANSFER (2)**

#### **15. `initiate_authority_transfer`**

**Descrição:** Inicia transferência de authority (passo 1/2)

**Quem pode chamar:** Apenas `authority` atual

**Contas:**
```rust
{
    global: Global (write),
    authority: Signer
}
```

**Argumentos:**
```rust
new_authority: Pubkey
```

**O que faz:**
- Define `global.pending_authority`

---

#### **16. `accept_authority`**

**Descrição:** Aceita transferência de authority (passo 2/2)

**Quem pode chamar:** Apenas `pending_authority`

**Contas:**
```rust
{
    global: Global (write),
    new_authority: Signer
}
```

**Argumentos:** Nenhum

**O que faz:**
- Define `global.authority = new_authority`
- Limpa `global.pending_authority`

---

## 🔄 **Fluxo Completo do Usuário**

### **Do Zero até Vender o Item:**

```
┌─────────────────────────────────────────────────────────────┐
│ FASE 1: SETUP (Admin - Uma vez)                            │
└─────────────────────────────────────────────────────────────┘

1️⃣ initialize
   → Cria Global State
   → Cria Treasury
   → Define Authority + Oracle

2️⃣ publish_merkle_root (Batch 1)
   → Cria Batch com metadata URIs
   → Batch tem 100 skins diferentes


┌─────────────────────────────────────────────────────────────┐
│ FASE 2: USER COMPRA E ABRE BOX                             │
└─────────────────────────────────────────────────────────────┘

3️⃣ create_box (User)
   → User paga e cria BoxState
   → Box vinculada ao Batch 1
   → Ainda não aberta (opened = false)

4️⃣ open_box (User)
   → User solicita abrir
   → Cria VrfPending
   → Aguarda oracle...

5️⃣ vrf_callback (Oracle - Backend automático)
   → Oracle fornece randomness
   → Calcula random_index (ex: 42)
   → BoxState.opened = true
   → Deleta VrfPending

6️⃣ reveal_and_claim (User)
   → User revela o item
   → Pega metadata_uris[42] do Batch
   → MINTA NFT CORE
   → NFT transferido para user
   → assigned_inventory definido


┌─────────────────────────────────────────────────────────────┐
│ FASE 3: USER VENDE DE VOLTA (Opcional)                     │
└─────────────────────────────────────────────────────────────┘

7️⃣ set_price_signed (Oracle)
   → Oracle define preço do item
   → Ex: AK-47 Redline = $50 USDC

8️⃣ sell_back (User)
   → User vende NFT de volta
   → NFT é QUEIMADO
   → User recebe USDC no wallet
   → BoxState.redeemed = true


┌─────────────────────────────────────────────────────────────┐
│ RESULTADO FINAL                                             │
└─────────────────────────────────────────────────────────────┘

• Box criada ✅
• Box aberta com VRF ✅
• NFT revelado e mintado ✅
• NFT vendido de volta ✅
• User tem USDC no wallet ✅
```

---

## 🔑 **PDAs e Seeds**

Todos os PDAs derivados do programa:

| Account | Seeds | Exemplo |
|---------|-------|---------|
| **Global** | `["global"]` | `7xJpF...` |
| **Batch** | `["batch", batch_id_le_bytes]` | `6nMkP...` |
| **BoxState** | `["box", asset_pubkey]` | `8pLqR...` |
| **VrfPending** | `["vrf_pending", asset_pubkey]` | `9mNsT...` |
| **PriceStore** | `["price", inventory_id_hash]` | `4kJuV...` |
| **Treasury ATA** | ATA seeds (global, USDC mint) | `5lKwX...` |

**Derivação em TypeScript:**
```typescript
// Global
const [globalPDA] = PublicKey.findProgramAddressSync(
  [Buffer.from('global')],
  PROGRAM_ID
);

// Batch
const batchIdBuf = Buffer.alloc(8);
batchIdBuf.writeBigUInt64LE(BigInt(batchId));
const [batchPDA] = PublicKey.findProgramAddressSync(
  [Buffer.from('batch'), batchIdBuf],
  PROGRAM_ID
);

// BoxState
const [boxStatePDA] = PublicKey.findProgramAddressSync(
  [Buffer.from('box'), assetPubkey.toBuffer()],
  PROGRAM_ID
);
```

---

## 📡 **Eventos Emitidos**

| Evento | Quando | Dados |
|--------|--------|-------|
| **MerklePublished** | `publish_merkle_root` | batch_id, merkle_root, snapshot_time |
| **BoxMinted** | `create_box` | nft_mint, batch_id, owner, metadata_uri |
| **BoxOpenRequested** | `open_box` | nft_mint, owner, vrf_request_id |
| **BoxOpened** | `vrf_callback` | nft_mint, randomness, random_index, pool_size |
| **InventoryAssigned** | `reveal_and_claim` | nft_mint, inventory_id_hash, batch_id |
| **PriceSet** | `set_price_signed` | inventory_id_hash, price, timestamp, oracle |
| **BuybackExecuted** | `sell_back` | nft_mint, inventory_id_hash, price, fee, payout, buyer |
| **TreasuryDeposit** | `deposit_treasury` | amount, depositor, new_balance |
| **BuybackToggled** | `toggle_buyback` | enabled, authority |
| **OracleUpdated** | `set_oracle` | old_oracle, new_oracle, authority |

**Monitorar eventos:**
```typescript
program.addEventListener('BoxOpened', (event) => {
  console.log('Box opened!', event);
  // Notificar frontend
});
```

---

## 💡 **Casos de Uso Especiais**

### **1. Circuit Breaker**
```
Se treasury_balance < min_treasury_balance:
  → sell_back FALHA
  → Protege contra drain attack
```

### **2. Emergency Pause**
```
Se global.paused == true:
  → create_box FALHA
  → open_box FALHA
  → reveal_and_claim FALHA
  → sell_back FALHA
  → Apenas admin functions funcionam
```

### **3. Stale Price Protection**
```
sell_back verifica:
  Se (current_time - price.timestamp) > MAX_PRICE_AGE:
    → FALHA (preço muito antigo)
```

### **4. Slippage Protection**
```
sell_back com min_price:
  Se price < min_price:
    → FALHA (preço caiu)
```

---

## 📊 **Diagrama de Estados**

```
BoxState Lifecycle:

    [Created]
       │
       │ open_box()
       ↓
  [VRF Pending]
       │
       │ vrf_callback()
       ↓
    [Opened]
       │
       │ reveal_and_claim()
       ↓
   [Revealed]
       │
       │ sell_back() (opcional)
       ↓
   [Redeemed]
    (final)
```

---

## 🔒 **Permissões e Validações**

| Instrução | Quem pode chamar | Validações principais |
|-----------|------------------|----------------------|
| `initialize` | Qualquer (1x) | Global não existe ainda |
| `publish_merkle_root` | Authority | Batch não existe, authority válido |
| `create_box` | Qualquer user | Batch existe, não pausado, paga rent |
| `open_box` | Box owner | Box não aberta, owner correto, não pausado |
| `vrf_callback` | Oracle | Oracle correto, request_id válido |
| `reveal_and_claim` | Box owner | Box aberta, VRF cumprido, owner correto |
| `set_price_signed` | Qualquer | Assinatura oracle válida, timestamp válido |
| `sell_back` | Box owner | Buyback ativo, box revelada, preço válido, treasury suficiente |

---

**Resumo:** Este é um sistema completo de loot boxes on-chain com randomização verificável, sistema de preços, e buyback. Cada interação está documentada com contas, argumentos, validações e efeitos! 🚀
