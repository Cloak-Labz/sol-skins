import { Connection, PublicKey } from '@solana/web3.js';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { readFileSync } from 'fs';
import { join } from 'path';

const PROGRAM_ID = new PublicKey('44UwMzMzMZUcobRp4YyucjvAbBeTFJ3uBPxg7YqwHS2ncp');
const RPC_URL = 'https://api.devnet.solana.com';

async function main() {
  console.log('🔍 Checking Global account status...\n');

  // Derive Global PDA
  const [globalPDA, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from('global')],
    PROGRAM_ID
  );

  console.log('Program ID:', PROGRAM_ID.toBase58());
  console.log('Global PDA:', globalPDA.toBase58());
  console.log('Bump:', bump);
  console.log();

  // Connect to devnet
  const connection = new Connection(RPC_URL, 'confirmed');

  // Check if account exists
  console.log('Fetching account info...');
  const accountInfo = await connection.getAccountInfo(globalPDA);

  if (!accountInfo) {
    console.log('❌ Global account does NOT exist');
    console.log('   The program has NOT been initialized yet.');
    return;
  }

  console.log('✅ Global account EXISTS');
  console.log('   Owner:', accountInfo.owner.toBase58());
  console.log('   Lamports:', accountInfo.lamports);
  console.log('   Data length:', accountInfo.data.length);
  console.log('   Executable:', accountInfo.executable);
  console.log();

  // Try to load IDL and deserialize
  try {
    const idlPath = join(__dirname, '../src/client/lib/idl/skinvault.json');
    const idl = JSON.parse(readFileSync(idlPath, 'utf-8'));

    console.log('📖 IDL loaded successfully');
    console.log('   Accounts defined:', idl.accounts?.map((a: any) => a.name).join(', '));
    console.log();

    // Find Global account type in IDL
    const globalType = idl.accounts?.find((a: any) => a.name === 'Global');
    if (globalType) {
      console.log('✅ Global account type found in IDL');
      console.log('   Fields:', globalType.type?.fields?.map((f: any) => f.name).join(', '));
    } else {
      console.log('⚠️  Global account type NOT found in IDL');
      console.log('   Available account types:', idl.accounts?.map((a: any) => a.name).join(', '));
    }
  } catch (err) {
    console.error('Error loading IDL:', err);
  }
}

main().catch(console.error);
