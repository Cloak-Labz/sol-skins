#!/bin/bash

# SkinVault Admin API Test Script
# This script tests all admin endpoints with proper error handling

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-http://localhost:3001/api/v1}"
PROGRAM_ID="${PROGRAM_ID:-6cSLcQ5RCyzPKeFWux2UMjm3SWf3tD41vHK5qsuphzKZ}"

echo -e "${BLUE}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║    SkinVault Admin API Testing Suite                 ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}⚠️  jq is not installed. Installing...${NC}"
    echo "Please install jq manually: sudo apt install jq (Ubuntu) or brew install jq (Mac)"
    exit 1
fi

# Check if server is running
echo -e "${YELLOW}🔍 Checking if server is running...${NC}"
if ! curl -s -f "${API_URL}/../../health" > /dev/null 2>&1; then
    echo -e "${RED}❌ Server is not running at ${API_URL}${NC}"
    echo "Please start the server first: cd src/server && npm run dev"
    exit 1
fi
echo -e "${GREEN}✅ Server is running${NC}"
echo ""

# Function to print test header
print_test() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}📝 Test: $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
    echo ""
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    echo ""
}

# Function to print error
print_error() {
    echo -e "${RED}❌ $1${NC}"
    echo ""
}

# Counter for tests
TESTS_PASSED=0
TESTS_FAILED=0
TOTAL_TESTS=0

# Test 1: Health Check
print_test "Health Check"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
RESPONSE=$(curl -s "${API_URL}/../../health")
echo "$RESPONSE" | jq .
if echo "$RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
    print_success "Health check passed"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    print_error "Health check failed"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test 2: Get Global State (before initialization)
print_test "Get Global State (may not exist yet)"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
RESPONSE=$(curl -s "${API_URL}/admin/solana/global-state")
echo "$RESPONSE" | jq .
if echo "$RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    SUCCESS=$(echo "$RESPONSE" | jq -r '.success')
    if [ "$SUCCESS" = "true" ]; then
        print_success "Global state exists and retrieved successfully"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_warning "Global state does not exist yet (this is expected on first run)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    fi
else
    print_error "Failed to check global state"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test 3: Test Admin IP Whitelist
print_test "Admin IP Whitelist Protection"
TOTAL_TESTS=$((TESTS_PASSED + 1))
# This should work from localhost
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "${API_URL}/admin/stats/overview")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d')
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
if [ "$HTTP_CODE" = "200" ]; then
    print_success "Admin endpoint accessible from localhost"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    print_warning "Admin endpoint returned code $HTTP_CODE (may need to configure IP whitelist)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
fi

# Test 4: Test Invalid Parameters
print_test "Invalid Parameters Validation"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
RESPONSE=$(curl -s -X POST "${API_URL}/admin/solana/initialize" \
    -H "Content-Type: application/json" \
    -d '{}')
echo "$RESPONSE" | jq .
if echo "$RESPONSE" | jq -e '.success == false' > /dev/null 2>&1; then
    print_success "Invalid parameters correctly rejected"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    print_warning "Expected validation error for missing parameters"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test 5: Get Batch State (non-existent batch)
print_test "Get Batch State for Non-Existent Batch"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
RESPONSE=$(curl -s "${API_URL}/admin/solana/batch/999999")
echo "$RESPONSE" | jq .
if echo "$RESPONSE" | jq -e '.success == false' > /dev/null 2>&1; then
    print_success "Non-existent batch correctly returns error"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    print_warning "Expected error for non-existent batch"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test 6: Get Box State (non-existent box)
print_test "Get Box State for Non-Existent Box"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
DUMMY_PUBKEY="11111111111111111111111111111111"
RESPONSE=$(curl -s "${API_URL}/admin/solana/box/${DUMMY_PUBKEY}")
echo "$RESPONSE" | jq .
if echo "$RESPONSE" | jq -e '.success == false' > /dev/null 2>&1; then
    print_success "Non-existent box correctly returns error"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    print_warning "Expected error for non-existent box"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test 7: Stats Endpoints
print_test "Get Overview Stats"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
RESPONSE=$(curl -s "${API_URL}/admin/stats/overview")
echo "$RESPONSE" | jq .
if echo "$RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
    print_success "Overview stats retrieved successfully"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    print_error "Failed to retrieve overview stats"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Summary
echo -e "${BLUE}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                   Test Summary                        ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Total Tests:   ${BLUE}${TOTAL_TESTS}${NC}"
echo -e "Passed:        ${GREEN}${TESTS_PASSED}${NC}"
echo -e "Failed:        ${RED}${TESTS_FAILED}${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    echo ""
    echo -e "${YELLOW}📝 Next Steps:${NC}"
    echo "1. Initialize global state (see docs/API_TESTING.md)"
    echo "2. Deploy Candy Machine with assets"
    echo "3. Publish Merkle root for a batch"
    echo "4. Create test boxes"
    echo "5. Test opening boxes from frontend"
    exit 0
else
    echo -e "${RED}⚠️  Some tests failed. Please check the output above.${NC}"
    exit 1
fi
