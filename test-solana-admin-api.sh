#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

API_URL="http://localhost:3000/api/admin/solana"

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Testing Solana Admin API Endpoints   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Check if server is running
echo -e "${BLUE}→ Checking if server is running...${NC}"
if ! curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200\|404"; then
  echo -e "${RED}✗ Server is not running on port 3000${NC}"
  echo -e "${RED}  Please start the server with: cd src/server && npm run dev${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Server is running${NC}"
echo ""

# Function to make request and show result
test_endpoint() {
  local method=$1
  local endpoint=$2
  local data=$3
  local description=$4

  echo -e "${BLUE}═══════════════════════════════════════${NC}"
  echo -e "${BLUE}TEST: $description${NC}"
  echo -e "${BLUE}${method} ${endpoint}${NC}"
  echo ""

  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" $API_URL$endpoint)
  else
    response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X $method $API_URL$endpoint \
      -H "Content-Type: application/json" \
      -d "$data")
  fi

  http_status=$(echo "$response" | grep "HTTP_STATUS:" | sed 's/HTTP_STATUS://')
  body=$(echo "$response" | sed '/HTTP_STATUS:/d')

  if [ "$http_status" -eq 200 ] || [ "$http_status" -eq 201 ]; then
    echo -e "${GREEN}✓ Status: $http_status${NC}"
  else
    echo -e "${RED}✗ Status: $http_status${NC}"
  fi

  echo "$body" | jq . 2>/dev/null || echo "$body"
  echo ""
}

# Test 1: Get Global State (before initialization)
test_endpoint "GET" "/global-state" "" "1. Get Global State (should fail if not initialized)"

# Test 2: Initialize Global State
test_endpoint "POST" "/initialize" '{}' "2. Initialize Global State"

# Test 3: Get Global State (after initialization)
test_endpoint "GET" "/global-state" "" "3. Get Global State (should succeed now)"

# Test 4: Initialize Again (should fail)
test_endpoint "POST" "/initialize" '{}' "4. Try to Initialize Again (should fail)"

# Test 5: Publish Merkle Root (Batch 1)
merkle_data='{
  "batchId": 1,
  "candyMachine": "11111111111111111111111111111111",
  "metadataUris": [
    "https://example.com/metadata/skin1.json",
    "https://example.com/metadata/skin2.json",
    "https://example.com/metadata/skin3.json"
  ],
  "merkleRoot": "0000000000000000000000000000000000000000000000000000000000000000",
  "snapshotTime": 1696723200
}'
test_endpoint "POST" "/publish-merkle-root" "$merkle_data" "5. Publish Merkle Root (Batch 1)"

# Test 6: Get Batch 1
test_endpoint "GET" "/batch/1" "" "6. Get Batch 1 Info"

# Test 7: Get Non-existent Batch
test_endpoint "GET" "/batch/999" "" "7. Get Non-existent Batch (should fail)"

# Test 8: Publish Another Batch
merkle_data2='{
  "batchId": 2,
  "candyMachine": "11111111111111111111111111111111",
  "metadataUris": [
    "https://example.com/metadata/skin4.json",
    "https://example.com/metadata/skin5.json"
  ],
  "merkleRoot": "1111111111111111111111111111111111111111111111111111111111111111",
  "snapshotTime": 1696809600
}'
test_endpoint "POST" "/publish-merkle-root" "$merkle_data2" "8. Publish Merkle Root (Batch 2)"

# Test 9: Get Batch 2
test_endpoint "GET" "/batch/2" "" "9. Get Batch 2 Info"

echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${GREEN}✓ All tests completed!${NC}"
echo ""
echo -e "${BLUE}Summary:${NC}"
echo "  • Tested initialization (should work once, fail on retry)"
echo "  • Tested global state fetching"
echo "  • Tested batch creation (2 batches)"
echo "  • Tested batch fetching"
echo "  • Tested error cases"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Check Solana Explorer for transactions"
echo "  2. Integrate with frontend for user operations"
echo "  3. Upload actual metadata to Walrus"
echo "  4. Deploy Candy Machine"
echo ""
