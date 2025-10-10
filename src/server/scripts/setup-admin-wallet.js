#!/usr/bin/env node

/**
 * Setup Admin Wallet Script
 * 
 * Generates a new admin wallet and shows instructions for configuration
 */

const { Keypair } = require('@solana/web3.js');
const bs58 = require('bs58');
const fs = require('fs');
const path = require('path');

console.log('\n🔐 ADMIN WALLET SETUP\n');
console.log('=' .repeat(60));

// Generate new keypair
const keypair = Keypair.generate();
const publicKey = keypair.publicKey.toBase58();
const privateKeyBase58 = bs58.encode(keypair.secretKey);

console.log('\n✅ Generated new admin wallet:\n');
console.log(`Public Key:  ${publicKey}`);
console.log(`\n⚠️  Private Key (KEEP SECRET):\n${privateKeyBase58}`);

console.log('\n' + '='.repeat(60));
console.log('\n📝 SETUP INSTRUCTIONS:\n');

console.log('1. Add to src/server/.env:');
console.log('   ----------------------------------------');
console.log(`   ADMIN_PRIVATE_KEY=${privateKeyBase58}`);
console.log(`   ADMIN_WALLETS=${publicKey}`);
console.log('   ----------------------------------------\n');

console.log('2. Fund the wallet on devnet:');
console.log('   ----------------------------------------');
console.log(`   solana airdrop 5 ${publicKey} --url devnet`);
console.log('   ----------------------------------------\n');

console.log('3. Update frontend .env.local:');
console.log('   ----------------------------------------');
console.log(`   NEXT_PUBLIC_ADMIN_WALLET=${publicKey}`);
console.log('   ----------------------------------------\n');

console.log('4. Save this keypair securely!');
console.log('   Consider saving to a file:');
console.log('   ----------------------------------------');
const keypairPath = path.join(__dirname, `admin-wallet-${Date.now()}.json`);
console.log(`   echo '${JSON.stringify(Array.from(keypair.secretKey))}' > ${keypairPath}`);
console.log('   ----------------------------------------\n');

// Offer to save keypair
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('💾 Save keypair to file? (y/n): ', (answer) => {
  if (answer.toLowerCase() === 'y') {
    fs.writeFileSync(
      keypairPath,
      JSON.stringify(Array.from(keypair.secretKey), null, 2)
    );
    console.log(`\n✅ Keypair saved to: ${keypairPath}`);
    console.log('⚠️  Keep this file secure and never commit it to git!\n');
  } else {
    console.log('\n⚠️  Make sure to save the private key shown above!\n');
  }
  
  console.log('=' .repeat(60));
  console.log('Setup complete! Follow the instructions above.');
  console.log('=' .repeat(60) + '\n');
  
  rl.close();
});

