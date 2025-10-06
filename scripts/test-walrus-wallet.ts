#!/usr/bin/env ts-node
/**
 * Test Walrus Wallet Generation and Persistence
 */

import { WalrusClient } from './upload-to-walrus';

async function testWallet() {
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                      ║');
  console.log('║         🔑  WALRUS WALLET TEST - Persistent Keypair  🔑             ║');
  console.log('║                                                                      ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log('');

  console.log('📋 Test 1: Create client (first time)');
  console.log('   This should generate and save a new keypair...');
  console.log('');
  
  const walrus1 = await WalrusClient.create({
    network: 'testnet',
    verbose: true,
  });

  const address1 = walrus1.getAddress();
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('');

  console.log('📋 Test 2: Create client again (should load existing)');
  console.log('   This should load the saved keypair...');
  console.log('');

  const walrus2 = await WalrusClient.create({
    network: 'testnet',
    verbose: true,
  });

  const address2 = walrus2.getAddress();
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('');

  console.log('📋 Verification:');
  console.log(`   Address 1: ${address1}`);
  console.log(`   Address 2: ${address2}`);
  console.log(`   Match: ${address1 === address2 ? '✅ YES' : '❌ NO'}`);
  console.log('');

  if (address1 === address2) {
    console.log('╔══════════════════════════════════════════════════════════════════════╗');
    console.log('║                                                                      ║');
    console.log('║   ✅  SUCCESS! Keypair is persistent across sessions!               ║');
    console.log('║                                                                      ║');
    console.log('╚══════════════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('📋 Next Steps:');
    console.log('');
    console.log('1. Fund this wallet:');
    console.log(`   Address: ${address1}`);
    console.log('');
    console.log('2. Get testnet SUI:');
    console.log('   https://discord.com/channels/916379725201563759/971488439931392130');
    console.log('   Command: !faucet ' + address1);
    console.log('');
    console.log('3. Exchange SUI for WAL:');
    console.log('   walrus get-wal --wallet-address ' + address1);
    console.log('');
    console.log('4. Run tests:');
    console.log('   cd solana && anchor test');
    console.log('');
  } else {
    console.error('❌ ERROR: Addresses don\'t match!');
    process.exit(1);
  }
}

testWallet().catch(error => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
});




