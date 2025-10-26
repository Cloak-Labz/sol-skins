# SolSkins Backend

Backend completo da plataforma SolSkins implementado em Express.js + TypeScript + TypeORM + PostgreSQL.

## Instalação

### 1. Instalar Dependências

```bash
cd src/server
npm install
```

### 2. Configurar Banco de Dados

```bash
# Iniciar PostgreSQL e Redis via Docker
cd ../../deployment
docker-compose up -d
```

### 3. Configurar Variáveis de Ambiente

```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar as variáveis conforme necessário
nano .env
```

### 4. Executar Migrações

```bash
# Sincronizar schema do banco (desenvolvimento)
npm run schema:sync

# Ou executar migrações (produção)
npm run migration:run
```

### 5. Iniciar Servidor

```bash
# Desenvolvimento
npm run dev

# Produção
npm run build
npm start
```

## Estrutura do Projeto

```
src/server/
├── config/          # Configurações (DB, Swagger, Env)
├── controllers/     # Controladores da API
├── entities/        # Entidades TypeORM
├── middlewares/     # Middlewares (Auth, Security, Validation)
├── repositories/    # Camada de acesso a dados
├── routes/          # Definição de rotas
├── services/        # Lógica de negócio
├── utils/           # Utilitários
├── app.ts           # Configuração do Express
├── index.ts         # Entry point
└── package.json     # Dependências
```

## Scripts Disponíveis

```bash
npm run dev           # Desenvolvimento com hot reload
npm run build         # Build para produção
npm start             # Executar versão buildada
npm run typeorm       # CLI do TypeORM
npm run migration:generate  # Gerar migração
npm run migration:run       # Executar migrações
npm run schema:sync         # Sincronizar schema (dev only)
```

## Endpoints da API

### Autenticação
- `POST /api/v1/auth/connect` - Conectar wallet
- `POST /api/v1/auth/disconnect` - Desconectar

### Marketplace
- `GET /api/v1/marketplace/loot-boxes` - Listar loot boxes
- `GET /api/v1/marketplace/loot-boxes/:id` - Detalhes do loot box

### Cases
- `POST /api/v1/cases/open` - Abrir caso
- `GET /api/v1/cases/opening/:id/status` - Status da abertura
- `POST /api/v1/cases/opening/:id/decision` - Decisão pós-abertura

### Inventory
- `GET /api/v1/inventory` - Listar inventário
- `POST /api/v1/inventory/:skinId/buyback` - Buyback de skin

### History
- `GET /api/v1/history/transactions` - Histórico de transações

### Social
- `GET /api/v1/leaderboard` - Ranking de usuários
- `GET /api/v1/activity/recent` - Atividade recente

### Admin
- `GET /api/v1/admin/stats/overview` - Estatísticas da plataforma

## Documentação

- **Swagger UI**: http://localhost:4000/api-docs
- **API Testing Guide**: `docs/api-testing-guide.md`
- **Backend Knowledge Base**: `docs/backend-knowledge-base.md`

## Tecnologias Utilizadas

- **Express.js** - Framework web
- **TypeScript** - Tipagem estática
- **TypeORM** - ORM para PostgreSQL
- **PostgreSQL** - Banco de dados
- **Redis** - Cache e sessões
- **JWT** - Autenticação
- **Joi** - Validação de dados
- **Winston** - Logging
- **Helmet** - Segurança
- **Swagger** - Documentação da API

## Integração Solana

O backend integra com:
- **Anchor Program** - Smart contracts
- **Switchboard VRF** - Aleatoriedade verificável
- **Solana Web3.js** - Interação com blockchain
- **NFT Minting** - Criação de skins como NFTs

## Monitoramento e Logs

- Logs em `logs/` (error.log, combined.log)
- Correlation ID para rastreamento de requests
- Health check em `/health`
- Métricas de performance via Winston

## Segurança

- Rate limiting por IP e wallet
- Validação e sanitização de inputs
- CORS configurado
- Headers de segurança
- Autenticação via assinatura de wallet
- Proteção contra ataques comuns 