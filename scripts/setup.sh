#!/bin/bash

# Dust3 Setup Script
set -e

echo "🚀 Setting up Dust3..."

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed."
    exit 1
fi

if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is required but not installed."
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is required but not installed."
    exit 1
fi

if ! command -v anchor &> /dev/null; then
    echo "❌ Anchor CLI is required but not installed."
    exit 1
fi

echo "✅ All prerequisites found"

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Start infrastructure
echo "🐳 Starting infrastructure..."
docker compose up -d

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Setup database
echo "🗄️ Setting up database..."
pnpm db:migrate
pnpm db:seed

# Build Anchor program
echo "🔨 Building Anchor program..."
pnpm anchor:build

# Run tests
echo "🧪 Running tests..."
pnpm test

echo "✅ Setup complete!"
echo ""
echo "🎉 Dust3 is ready to go!"
echo ""
echo "Next steps:"
echo "1. Start development servers: pnpm dev"
echo "2. Open http://localhost:3000 in your browser"
echo "3. Connect your wallet and start opening boxes!"
echo ""
echo "Available commands:"
echo "- pnpm dev          # Start all services"
echo "- pnpm build        # Build all packages"
echo "- pnpm test         # Run all tests"
echo "- pnpm lint         # Lint all packages"
