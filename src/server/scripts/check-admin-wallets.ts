#!/usr/bin/env ts-node

/**
 * Script to check which admin wallets are configured
 * This helps debug admin access issues
 */

import { config } from '../config/env';

console.log('\n=== Admin Wallets Configuration ===\n');

// Check from config
console.log('From config.admin.wallets:');
if (config.admin.wallets.length === 0) {
  console.log('  ⚠️  No admin wallets configured!');
} else {
  config.admin.wallets.forEach((wallet, index) => {
    console.log(`  ${index + 1}. ${wallet}`);
  });
}

// Check from process.env directly (what middleware uses)
console.log('\nFrom process.env.ADMIN_WALLETS (what middleware uses):');
const envWallets = (process.env.ADMIN_WALLETS || '')
  .split(',')
  .map((addr: string) => addr.trim())
  .filter((addr: string) => addr.length > 0);

if (envWallets.length === 0) {
  console.log('  ⚠️  No admin wallets in ADMIN_WALLETS env var!');
  console.log('  Raw value:', process.env.ADMIN_WALLETS || '(empty/undefined)');
} else {
  envWallets.forEach((wallet, index) => {
    console.log(`  ${index + 1}. ${wallet}`);
  });
}

// Check if they match
console.log('\nComparison:');
if (config.admin.wallets.length !== envWallets.length) {
  console.log('  ⚠️  MISMATCH: Config and env have different counts!');
  console.log(`     Config: ${config.admin.wallets.length} wallets`);
  console.log(`     Env: ${envWallets.length} wallets`);
} else {
  const allMatch = config.admin.wallets.every((w, i) => 
    w.toLowerCase() === envWallets[i]?.toLowerCase()
  );
  if (allMatch) {
    console.log('  ✅ Config and env match');
  } else {
    console.log('  ⚠️  MISMATCH: Config and env have different wallets!');
  }
}

// Show normalized versions
console.log('\nNormalized wallets (lowercase, trimmed):');
const normalizedConfig = config.admin.wallets.map(w => w.trim().toLowerCase());
const normalizedEnv = envWallets.map(w => w.trim().toLowerCase());

console.log('  Config:', normalizedConfig);
console.log('  Env:   ', normalizedEnv);

console.log('\n=== End ===\n');

