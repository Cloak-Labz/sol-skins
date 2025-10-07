# 🎮 Guia de Integração Solana - SkinVault

## ✅ Implementação Concluída

A integração básica do programa SkinVault com o frontend foi concluída! As seguintes funcionalidades estão prontas para teste:

### 📦 Estrutura Criada

```
src/client/lib/solana/
├── config/
│   └── anchor-client.ts       # Configuração Anchor + Program
├── utils/
│   └── pda.ts                  # Derivação de PDAs
├── accounts/
│   └── fetch.ts                # Buscar contas on-chain
├── instructions/
│   ├── create-box.ts           # ✅ Criar loot box
│   └── open-box.ts             # ✅ Abrir loot box + VRF
├── hooks/
│   └── useSkinVault.ts         # Hook React principal
└── README.md                   # Documentação detalhada
```

### 🎯 Funcionalidades Implementadas

#### 1. **Leitura (Queries)**
- ✅ `fetchGlobalState()` - Buscar estado global do programa
- ✅ `fetchBatch(batchId)` - Buscar batch específico
- ✅ `fetchBoxState(assetPubkey)` - Buscar estado de uma box
- ✅ `fetchUserBoxes(owner)` - Buscar todas as boxes do usuário

#### 2. **Escrita (Transações)**
- ✅ `createBox()` - Criar nova loot box
- ✅ `openBox()` - Abrir box e solicitar VRF
- ✅ `waitForVrf()` - Esperar VRF ser cumprido

#### 3. **React Hook**
- ✅ `useSkinVault()` - Hook com todas as funcionalidades
  - Gerenciamento automático de loading states
  - Tratamento de erros
  - Verificação de conexão da wallet

## 🧪 Como Testar

### Passo 1: Iniciar o Frontend

```bash
cd src/client
pnpm dev
```

### Passo 2: Acessar a Página de Teste

Navegue para:
```
http://localhost:3000/app-dashboard/test-solana
```

### Passo 3: Conectar Wallet

1. Clique em "Connect Wallet" (no header)
2. Conecte sua Phantom/Solflare wallet
3. Certifique-se de estar na **Devnet**

### Passo 4: Testar Funcionalidades

#### A. Buscar Estado Global
```
1. Clique em "Fetch Global State"
2. Veja informações como:
   - Current batch
   - Total boxes minted
   - Buyback enabled
   - Authority
```

#### B. Criar uma Box
```
1. Clique em "Create Box (Batch #1)"
2. Aprove a transação na wallet
3. Veja o endereço da box criada
```

#### C. Abrir uma Box
```
1. Clique em "Fetch My Boxes"
2. Veja suas boxes listadas
3. Clique em "Open Box" em uma box não aberta
4. Aprove a transação
5. Aguarde o VRF ser cumprido (30s - 1min)
```

## 🔑 Pré-requisitos para Teste

### 1. SOL na Devnet

```bash
# Pegar seu endereço da wallet
# Depois fazer airdrop:
solana airdrop 2 <YOUR_WALLET_ADDRESS> --url devnet
```

### 2. Programa Inicializado

O programa precisa estar inicializado com:
- ✅ Global state criado
- ✅ Oracle configurado
- ✅ Treasury configurado

### 3. Batch Criado

Pelo menos um batch precisa existir com:
- ✅ Merkle root publicado
- ✅ Metadata URIs configurados

## 📊 Componente de Teste

O componente de teste (`TestSolanaIntegration`) permite:

- ✅ Ver estado global do programa
- ✅ Criar novas boxes
- ✅ Listar suas boxes
- ✅ Abrir boxes (com VRF)
- ✅ Ver status de cada box (opened, redeemed)
- ✅ Logs detalhados no console

## 🐛 Debugging

### Console do Navegador

Abra o console (F12) para ver:
- PDAs derivados
- Parâmetros das transações
- Estados das contas
- Erros detalhados

### Logs Importantes

```javascript
// PDAs
console.log('Global PDA:', globalPDA.toBase58());
console.log('Box State PDA:', boxStatePDA.toBase58());

// Transações
console.log('Transaction signature:', tx);

// Estados
console.log('Box state:', boxState);
```

## ⚠️ Erros Comuns

### 1. "Account not found"
**Causa:** Conta não existe on-chain ainda
**Solução:** Verifique se o programa foi inicializado e o batch foi criado

### 2. "Box has already been opened"
**Causa:** Tentando abrir uma box já aberta
**Solução:** Use uma box não aberta ou crie uma nova

### 3. "Simulation failed"
**Causa:** Erro no programa Solana
**Solução:** Veja os logs do programa ou tente com mais SOL

### 4. "Wallet not connected"
**Causa:** Wallet não está conectada
**Solução:** Conecte a wallet antes de fazer transações

## 🔜 Próximas Funcionalidades

As seguintes instruções ainda precisam ser implementadas:

### Alta Prioridade
- [ ] `reveal_and_claim` - Revelar e reivindicar NFT após VRF
- [ ] `sell_back` - Vender item de volta por USDC

### Média Prioridade
- [ ] `set_price_signed` - Definir preço com assinatura do oráculo
- [ ] Integração com Walrus para metadata

### Admin (Baixa Prioridade)
- [ ] `publish_merkle_root` - Publicar novo batch
- [ ] `deposit_treasury` - Depositar USDC
- [ ] `withdraw_treasury` - Sacar USDC
- [ ] `toggle_buyback` - Ativar/desativar buyback

## 📚 Documentação

Para mais detalhes, veja:
- [src/client/lib/solana/README.md](src/client/lib/solana/README.md) - Documentação detalhada da integração
- [Código fonte dos hooks](src/client/lib/solana/hooks/useSkinVault.ts)
- [Instruções implementadas](src/client/lib/solana/instructions/)

## 🎉 Teste Agora!

Tudo está pronto! Basta:

1. **Iniciar o frontend**: `pnpm dev`
2. **Acessar**: `http://localhost:3000/app-dashboard/test-solana`
3. **Conectar wallet**
4. **Testar funcionalidades**

## 📝 Notas Técnicas

### Program ID
```
44UwMzMZUcobRp4YyucjvAbBeTFJ3uBPxg7YqwHS2ncp
```

### RPC Endpoint
```
https://api.devnet.solana.com
```

### Dependências Instaladas
- ✅ `@coral-xyz/anchor` (v0.31.1)
- ✅ `@solana/web3.js` (v1.98.4)
- ✅ `@solana/spl-token` (v0.4.14)
- ✅ `bs58` (v6.0.0)

---

**Status:** ✅ Pronto para teste
**Build:** ✅ Compilando sem erros
**Página de teste:** http://localhost:3000/app-dashboard/test-solana
