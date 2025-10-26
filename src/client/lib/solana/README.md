# SkinVault Solana Integration

Integração do programa SkinVault Solana com o frontend Next.js.

## 📁 Estrutura

```
lib/solana/
├── config/
│   └── anchor-client.ts      # Configuração do Anchor Provider e Program
├── utils/
│   └── pda.ts                 # Derivação de PDAs
├── accounts/
│   └── fetch.ts               # Funções para buscar contas on-chain
├── instructions/
│   ├── create-box.ts          # Criar loot box
│   └── open-box.ts            # Abrir loot box (com VRF)
├── hooks/
│   └── useSkinVault.ts        # React hook principal
└── index.ts                   # Exports centralizados
```

## 🚀 Como Usar

### 1. Configuração Básica

```typescript
import { useSkinVault } from '@/lib/solana/hooks/useSkinVault';

function MyComponent() {
  const {
    isConnected,
    isLoading,
    error,
    fetchGlobal,
    getUserBoxes,
    createNewBox,
    openUserBox,
  } = useSkinVault();

  // Use as funções...
}
```

### 2. Buscar Estado Global

```typescript
const globalState = await fetchGlobal();
console.log('Current batch:', globalState?.currentBatch);
console.log('Total boxes minted:', globalState?.totalBoxesMinted);
```

### 3. Criar uma Box

```typescript
const result = await createNewBox(1); // Batch ID 1
if (result) {
  console.log('Box criada:', result.boxAsset.toBase58());
}
```

### 4. Abrir uma Box

```typescript
const boxAsset = new PublicKey('...');
const result = await openUserBox(boxAsset, 10); // Pool size = 10

// Esperar VRF
const fulfilled = await waitForBoxVrf(boxAsset);
if (fulfilled) {
  console.log('VRF completado! Pode revelar o NFT');
}
```

### 5. Listar Boxes do Usuário

```typescript
const boxes = await getUserBoxes();
boxes.forEach(box => {
  console.log('Box:', box.asset.toBase58());
  console.log('Opened:', box.opened);
  console.log('Batch:', box.batchId);
});
```

## 🧪 Testando

### Componente de Teste

Um componente de teste foi criado em:
```
components/test-solana-integration.tsx
```

Para usar:

```tsx
import { TestSolanaIntegration } from '@/components/test-solana-integration';

export default function TestPage() {
  return (
    <div className="container mx-auto p-6">
      <TestSolanaIntegration />
    </div>
  );
}
```

### Pré-requisitos para Testar

1. **Wallet conectada** com SOL na devnet
2. **Programa deployado** no endereço: `44UwMzMZUcobRp4YyucjvAbBeTFJ3uBPxg7YqwHS2ncp`
3. **Global state inicializado** (via instrução `initialize`)
4. **Batch criado** (via instrução `publish_merkle_root`)

### Obter SOL na Devnet

```bash
solana airdrop 2 <YOUR_WALLET_ADDRESS> --url devnet
```

## 📝 Funções Disponíveis

### Leitura (Queries)

- `fetchGlobal()` - Buscar estado global
- `getBatch(batchId)` - Buscar batch específico
- `getUserBoxes()` - Buscar todas as boxes do usuário
- `fetchBoxState(assetPubkey)` - Buscar estado de uma box específica

### Escrita (Transações)

- `createNewBox(batchId)` - Criar nova box
- `openUserBox(boxAsset, poolSize)` - Abrir box e solicitar VRF
- `waitForBoxVrf(boxAsset)` - Esperar VRF ser cumprido

## 🔑 Variáveis de Ambiente

Adicione ao `.env.local`:

```env
NEXT_PUBLIC_RPC_ENDPOINT=https://api.devnet.solana.com
```

## 🐛 Debugging

### Logs

Todas as funções têm logs detalhados. Abra o console do navegador para ver:
- PDAs derivados
- Parâmetros de transação
- Erros detalhados

### Erros Comuns

1. **"Box state not found"**
   - A box não foi criada ou o asset pubkey está errado

2. **"Box has already been opened"**
   - A box já foi aberta anteriormente

3. **"You are not the owner of this box"**
   - Tentando abrir uma box que não pertence à wallet conectada

4. **"Global state not initialized"**
   - O programa não foi inicializado ainda

## 🔜 Próximos Passos

As seguintes instruções ainda precisam ser implementadas:

- [ ] `reveal_and_claim` - Revelar e reivindicar NFT após VRF
- [ ] `sell_back` - Vender item de volta por USDC
- [ ] `set_price_signed` - Definir preço (com assinatura do oráculo)
- [ ] Admin functions (deposit_treasury, withdraw_treasury, etc.)

## 📚 Referências

- **Program ID**: `44UwMzMZUcobRp4YyucjvAbBeTFJ3uBPxg7YqwHS2ncp`
- **IDL**: `lib/idl/skinvault.json`
- **Anchor Docs**: https://www.anchor-lang.com/
- **Solana Web3.js**: https://solana-labs.github.io/solana-web3.js/
