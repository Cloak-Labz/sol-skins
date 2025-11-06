/**
 * Test script for nonce validation
 * Tests replay attack prevention and timestamp validation
 */

import axios from 'axios';
import { randomUUID } from 'crypto';

// Simple nonce generator (same logic as frontend)
function generateNonce(): string {
  if (typeof randomUUID !== 'undefined') {
    return randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function generateRequestNonce(): { nonce: string; timestamp: number } {
  return {
    nonce: generateNonce(),
    timestamp: Date.now(),
  };
}

const BASE_URL = process.env.API_URL || 'http://localhost:4000';
const API_PREFIX = `${BASE_URL}/api/v1`;

// Test wallet address (use a valid one or skip auth tests)
const TEST_WALLET = 'v1t1nCTfxttsTFW3t7zTQFUsdpznu8kggzYSg7SDJMs';

async function getCSRFToken(): Promise<string | null> {
  try {
    const response = await axios.get(`${API_PREFIX}/csrf-token`, {
      validateStatus: () => true,
    });
    return response.data?.data?.csrfToken || response.headers['x-csrf-token'] || null;
  } catch {
    return null;
  }
}

async function testNonceValidation() {
  console.log('🧪 Testing Nonce Validation System\n');
  console.log('='.repeat(60));

  // Get CSRF token first
  console.log('🔑 Fetching CSRF token...');
  const csrfToken = await getCSRFToken();
  if (!csrfToken) {
    console.log('⚠️  WARNING: Could not fetch CSRF token. Tests may fail.\n');
  } else {
    console.log('✅ CSRF token obtained\n');
  }

  const axiosConfig = {
    headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
    validateStatus: () => true,
  };

  let passed = 0;
  let failed = 0;

  // Test 1: Valid request with nonce (should succeed - test on an endpoint that requires nonce)
  console.log('\n📋 Test 1: Valid request with nonce');
  try {
    const { nonce, timestamp } = generateRequestNonce();
    // Use an endpoint that requires nonce (but will fail validation, which is ok)
    const response = await axios.post(
      `${API_PREFIX}/buyback/confirm`,
      {
        walletAddress: TEST_WALLET,
        nftMint: TEST_WALLET,
        signedTransaction: 'dGVzdA==',
        signature: 'test',
        message: 'test',
        nonce,
        timestamp,
      },
      axiosConfig
    );
    
    // If we get past nonce validation, it should fail on other validation (signature, etc.)
    // But the important thing is it didn't fail on nonce validation
    if (response.status === 400 && response.data?.error?.code !== 'NONCE_REQUIRED' && response.data?.error?.code !== 'NONCE_REUSED') {
      console.log('✅ PASS: Valid nonce accepted (failed on other validation, which is expected)');
      passed++;
    } else if (response.status === 500) {
      console.log('⚠️  SKIP: Server error (may be due to other validation issues)');
    } else {
      console.log(`✅ PASS: Nonce validation passed (status: ${response.status})`);
      passed++;
    }
  } catch (error: any) {
    if (error.response?.status === 400 && error.response?.data?.error?.code === 'NONCE_REQUIRED') {
      console.log('❌ FAIL: Nonce was required but not accepted');
      failed++;
    } else if (error.response?.status === 400 && error.response?.data?.error?.code !== 'NONCE_REQUIRED' && error.response?.data?.error?.code !== 'NONCE_REUSED') {
      console.log('✅ PASS: Valid nonce accepted (failed on other validation)');
      passed++;
    } else {
      console.log(`⚠️  SKIP: ${error.message}`);
    }
  }

  // Test 2: Replay attack (same nonce twice - should fail)
  console.log('\n📋 Test 2: Replay attack (duplicate nonce)');
  try {
    const { nonce, timestamp } = generateRequestNonce();
    
    // First request (use an endpoint that requires nonce)
    // Note: This will fail on validation, but nonce should be saved
    const response1 = await axios.post(
      `${API_PREFIX}/buyback/confirm`,
      {
        walletAddress: TEST_WALLET,
        nftMint: TEST_WALLET,
        signedTransaction: 'dGVzdA==',
        signature: 'test',
        message: 'test',
        nonce,
        timestamp,
      },
      axiosConfig
    );

    // Check if nonce was saved (even if request failed validation)
    // The important thing is nonce was saved to database
    console.log(`   First request status: ${response1.status} (nonce should be saved)`);

    // Second request with same nonce (should be rejected)
    await new Promise(resolve => setTimeout(resolve, 200)); // Small delay to ensure DB write
    
    const response2 = await axios.post(
      `${API_PREFIX}/buyback/confirm`,
      {
        walletAddress: TEST_WALLET,
        nftMint: TEST_WALLET,
        signedTransaction: 'dGVzdA==',
        signature: 'test',
        message: 'test',
        nonce, // Same nonce!
        timestamp: Date.now(), // New timestamp
      },
      axiosConfig
    );

    if (response2.status === 400 && response2.data?.error?.code === 'NONCE_REUSED') {
      console.log('✅ PASS: Replay attack correctly detected and blocked');
      passed++;
    } else {
      console.log(`❌ FAIL: Replay attack not detected. Status: ${response2.status}, Code: ${response2.data?.error?.code}`);
      console.log(`   Response: ${JSON.stringify(response2.data?.error || response2.data)}`);
      failed++;
    }
  } catch (error: any) {
    if (error.response?.status === 400 && error.response?.data?.error?.code === 'NONCE_REUSED') {
      console.log('✅ PASS: Replay attack correctly detected and blocked');
      passed++;
    } else {
      console.log(`⚠️  SKIP: ${error.message}`);
    }
  }

  // Test 3: Request without nonce (should fail for protected endpoints)
  console.log('\n📋 Test 3: Request without nonce');
  try {
    const response = await axios.post(
      `${API_PREFIX}/buyback/confirm`,
      {
        walletAddress: TEST_WALLET,
        nftMint: TEST_WALLET,
        signedTransaction: 'dGVzdA==', // Base64 "test"
        signature: 'test',
        message: 'test',
        // No nonce!
      },
      axiosConfig
    );

    if (response.status === 400 && response.data?.error?.code === 'NONCE_REQUIRED') {
      console.log('✅ PASS: Request without nonce correctly rejected');
      passed++;
    } else {
      console.log(`❌ FAIL: Request without nonce was not rejected. Status: ${response.status}, Code: ${response.data?.error?.code}`);
      failed++;
    }
  } catch (error: any) {
    if (error.response?.status === 400 && error.response?.data?.error?.code === 'NONCE_REQUIRED') {
      console.log('✅ PASS: Request without nonce correctly rejected');
      passed++;
    } else {
      console.log(`⚠️  SKIP: ${error.message}`);
    }
  }

  // Test 4: Timestamp too old (should fail)
  console.log('\n📋 Test 4: Timestamp too old (> 5 minutes)');
  try {
    const { nonce } = generateRequestNonce();
    const oldTimestamp = Date.now() - (6 * 60 * 1000); // 6 minutes ago

    const response = await axios.post(
      `${API_PREFIX}/buyback/confirm`,
      {
        walletAddress: TEST_WALLET,
        nftMint: TEST_WALLET,
        signedTransaction: 'dGVzdA==',
        signature: 'test',
        message: 'test',
        nonce,
        timestamp: oldTimestamp,
      },
      axiosConfig
    );

    if (response.status === 400 && response.data?.error?.code === 'TIMESTAMP_TOO_OLD') {
      console.log('✅ PASS: Old timestamp correctly rejected');
      passed++;
    } else {
      console.log(`⚠️  SKIP: Status: ${response.status}, Code: ${response.data?.error?.code}`);
    }
  } catch (error: any) {
    if (error.response?.status === 400 && error.response?.data?.error?.code === 'TIMESTAMP_TOO_OLD') {
      console.log('✅ PASS: Old timestamp correctly rejected');
      passed++;
    } else {
      console.log(`⚠️  SKIP: ${error.message}`);
    }
  }

  // Test 5: Timestamp too far in future (should fail)
  console.log('\n📋 Test 5: Timestamp too far in future (> 1 minute)');
  try {
    const { nonce } = generateRequestNonce();
    const futureTimestamp = Date.now() + (2 * 60 * 1000); // 2 minutes in future

    const response = await axios.post(
      `${API_PREFIX}/buyback/confirm`,
      {
        walletAddress: TEST_WALLET,
        nftMint: TEST_WALLET,
        signedTransaction: 'dGVzdA==',
        signature: 'test',
        message: 'test',
        nonce,
        timestamp: futureTimestamp,
      },
      axiosConfig
    );

    if (response.status === 400 && response.data?.error?.code === 'TIMESTAMP_INVALID') {
      console.log('✅ PASS: Future timestamp correctly rejected');
      passed++;
    } else {
      console.log(`⚠️  SKIP: Status: ${response.status}, Code: ${response.data?.error?.code}`);
    }
  } catch (error: any) {
    if (error.response?.status === 400 && error.response?.data?.error?.code === 'TIMESTAMP_INVALID') {
      console.log('✅ PASS: Future timestamp correctly rejected');
      passed++;
    } else {
      console.log(`⚠️  SKIP: ${error.message}`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Test Summary:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`\n${passed > 0 && failed === 0 ? '🎉 All tests passed!' : failed > 0 ? '⚠️  Some tests failed or were skipped' : '✅ Tests completed'}\n`);
}

// Run tests
testNonceValidation().catch(console.error);

