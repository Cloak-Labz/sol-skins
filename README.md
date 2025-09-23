# SolSkins

Sistema de loot boxes para skins CS:GO como NFTs na rede Solana.

## Proposta do Projeto

SolSkins é uma plataforma descentralizada inspirada nos phygitals que permite aos jogadores adquirir, abrir e negociar skins de CS:GO como NFTs verificáveis na blockchain Solana. O projeto combina a emoção das loot boxes tradicionais com a transparência e segurança da tecnologia blockchain.

O sistema oferece um mercado de casos (loot boxes) com probabilidades verificáveis, permitindo que os usuários:
- Comprem casos com diferentes raridades e preços
- Abram casos usando VRF (Verifiable Random Function) para garantir aleatoriedade provável
- Mantenham skins como NFTs em suas carteiras
- Negociem através de buyback instantâneo com 85% do valor de mercado
- Acompanhem todo histórico de transações de forma transparente

## Arquitetura

### Camadas da Aplicação

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                     │
├─────────────────────────────────────────────────────────────┤
│                    Backend API (Express)                    │
├─────────────────────────────────────────────────────────────┤
│                    Database (PostgreSQL)                    │
├─────────────────────────────────────────────────────────────┤
│                   Blockchain (Solana)                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │  Anchor Program │  │  Switchboard VRF │  │  NFT Mints  │  │
│  └─────────────────┘  └─────────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Fluxo de Dados

1. **Compra de Casos**: Frontend → Backend → Solana Program
2. **Abertura de Casos**: Solana Program → Switchboard VRF → Callback → Backend
3. **Atribuição de Skin**: Backend → Oracle → Solana Program
4. **Buyback**: Frontend → Backend → Oracle → Solana Program

### Componentes Principais

- **Frontend**: Interface web responsiva para interação do usuário
- **Backend**: API REST para gestão de dados e integração blockchain
- **Anchor Program**: Smart contract na Solana para lógica de negócio
- **Oracle**: Sistema de preços para avaliação de skins
- **VRF**: Geração de aleatoriedade verificável via Switchboard
- **Worker**: Processamento assíncrono de eventos blockchain

## Tecnologias

### Frontend
- **Next.js 14**: Framework React com App Router
- **TypeScript**: Tipagem estática
- **Tailwind CSS**: Framework de estilos utilitários
- **ShadCN/UI**: Biblioteca de componentes
- **Lucide React**: Ícones
- **React Hot Toast**: Notificações

### Backend
- **Express.js**: Framework web para Node.js
- **TypeScript**: Tipagem estática no backend
- **TypeORM**: ORM para PostgreSQL
- **PostgreSQL**: Banco de dados relacional
- **Redis**: Cache e sessões
- **Docker**: Containerização

### Blockchain
- **Anchor**: Framework para desenvolvimento Solana
- **Solana Web3.js**: SDK JavaScript para Solana
- **Switchboard**: Oracle e VRF na Solana
- **Metaplex**: Padrão de NFTs

### DevOps
- **Docker Compose**: Orquestração de containers
- **pnpm**: Gerenciador de pacotes
- **Turbo**: Build system monorepo

## Funcionalidades

### Marketplace
- **Catálogo de Casos**: Visualização de diferentes tipos de loot boxes
- **Filtros e Busca**: Organização por preço, raridade e nome
- **Probabilidades Transparentes**: Exibição das chances de drop
- **Integração Wallet**: Conexão com carteiras Solana

### Sistema de Abertura
- **Animação Roulette**: Interface visual inspirada no CS:GO
- **VRF Verificável**: Aleatoriedade provável via Switchboard
- **Reveal Dramático**: Apresentação do resultado obtido
- **Escolha Pós-Abertura**: Manter como NFT ou vender via buyback

### Inventário
- **Gestão de NFTs**: Visualização de todas as skins obtidas
- **Detalhes de Skin**: Informações completas (raridade, condição, valor)
- **Links Blockchain**: Verificação na Solana Explorer
- **Buyback Instantâneo**: Venda com 85% do valor de mercado

### Histórico
- **Transações Completas**: Registro de todas as operações
- **Análise de Performance**: Estatísticas de gastos e ganhos
- **Verificação Blockchain**: Links para transações na Solana
- **Filtros Avançados**: Organização por tipo e período

### Leaderboard
- **Ranking de Usuários**: Classificação por valor de inventário
- **Estatísticas Públicas**: Número de casos abertos e valor total
- **Competição Social**: Gamificação da experiência

### Sistema de Atividade
- **Feed em Tempo Real**: Últimas aberturas e vendas
- **Transparência Social**: Todas as transações públicas
- **Inspiração**: Motivação através do sucesso de outros usuários
