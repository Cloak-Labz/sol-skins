#!/bin/bash

# VRF Security Test Runner
# Runs focused VRF security tests only

set -e

echo "🚀 Starting VRF Security Tests..."
echo ""

# Set Anchor provider URL
export ANCHOR_PROVIDER_URL="http://127.0.0.1:8899"
export ANCHOR_WALLET="$HOME/.config/solana/id.json"

# Check if validator is running
if ! curl -s http://127.0.0.1:8899 > /dev/null 2>&1; then
    echo "❌ Solana test validator is not running!"
    echo "   Start it with: solana-test-validator --reset"
    exit 1
fi

echo "✅ Test validator is running"
echo ""

# Deploy the program
echo "📦 Deploying program..."
anchor deploy

echo ""
echo "🧪 Running VRF Security Tests..."
echo ""

# Run the tests
./node_modules/.bin/mocha -t 300000 tests/vrf-security.test.ts

echo ""
echo "✅ VRF Security Tests Complete!"

