#!/bin/bash

# Deploy SkinVault to Devnet
# This script deploys the Anchor program to Solana devnet

set -e

echo "🚀 Deploying SkinVault to Devnet..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if required tools are installed
command -v solana >/dev/null 2>&1 || { echo -e "${RED}❌ Solana CLI not installed${NC}" >&2; exit 1; }
command -v anchor >/dev/null 2>&1 || { echo -e "${RED}❌ Anchor not installed${NC}" >&2; exit 1; }

# Navigate to solana directory
cd "$(dirname "$0")/../solana" || exit 1

echo -e "${YELLOW}📋 Current Solana config:${NC}"
solana config get

echo -e "${YELLOW}🔄 Setting cluster to devnet...${NC}"
solana config set --url devnet

echo -e "${YELLOW}💰 Checking balance...${NC}"
BALANCE=$(solana balance | awk '{print $1}')
echo "Current balance: $BALANCE SOL"

if (( $(echo "$BALANCE < 2" | bc -l) )); then
    echo -e "${YELLOW}💸 Requesting airdrop...${NC}"
    solana airdrop 2 || echo -e "${YELLOW}⚠️  Airdrop failed, continuing with current balance${NC}"
    sleep 5
fi

echo -e "${YELLOW}🏗️  Building program...${NC}"
anchor build

echo -e "${YELLOW}📤 Deploying program to devnet...${NC}"
anchor deploy --provider.cluster devnet

PROGRAM_ID=$(solana address -k target/deploy/skinvault-keypair.json)
echo -e "${GREEN}✅ Program deployed!${NC}"
echo -e "${GREEN}Program ID: $PROGRAM_ID${NC}"

echo -e "${YELLOW}📝 Updating Anchor.toml...${NC}"
# Update program ID in Anchor.toml if different
sed -i "s/^skinvault = \".*\"/skinvault = \"$PROGRAM_ID\"/" Anchor.toml

echo -e "${YELLOW}🔧 Updating program ID in lib.rs...${NC}"
# Update declare_id in lib.rs
sed -i "s/declare_id!(\".*\")/declare_id!(\"$PROGRAM_ID\")/" programs/solana/src/lib.rs

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo -e "${GREEN}📋 Summary:${NC}"
echo -e "  Program ID: ${YELLOW}$PROGRAM_ID${NC}"
echo -e "  Cluster: ${YELLOW}devnet${NC}"
echo -e "  Keypair: ${YELLOW}target/deploy/skinvault-keypair.json${NC}"
echo ""
echo -e "${YELLOW}🔗 View on Solana Explorer:${NC}"
echo -e "  https://explorer.solana.com/address/$PROGRAM_ID?cluster=devnet"
echo ""
echo -e "${YELLOW}📝 Next steps:${NC}"
echo "  1. Update .env file with PROGRAM_ID=$PROGRAM_ID"
echo "  2. Initialize global state using admin endpoint"
echo "  3. Deploy Candy Machine with assets"
