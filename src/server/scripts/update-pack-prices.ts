/**
 * Update Pack Prices to Reflect $220/SOL Exchange Rate
 * 
 * Old prices were based on $1/SOL
 * New prices are based on $220/SOL
 */

import { AppDataSource } from '../config/database';
import { LootBoxType } from '../entities/LootBoxType';

async function main() {
  console.log('\n🔄 Updating pack prices to $220/SOL...\n');

  await AppDataSource.initialize();
  const lootBoxRepo = AppDataSource.getRepository(LootBoxType);

  // Define correct prices with $220/SOL rate
  const packs = [
    {
      name: 'Starter Pack',
      priceUsdc: 5,      // $5 USD
      priceSol: 5 / 220, // ~0.0227 SOL
    },
    {
      name: 'Premium Pack',
      priceUsdc: 15,      // $15 USD
      priceSol: 15 / 220, // ~0.0682 SOL
    },
    {
      name: 'Elite Pack',
      priceUsdc: 50,      // $50 USD
      priceSol: 50 / 220, // ~0.2273 SOL
    },
  ];

  for (const packData of packs) {
    const pack = await lootBoxRepo.findOne({ where: { name: packData.name } });
    
    if (!pack) {
      console.log(`❌ Pack "${packData.name}" not found`);
      continue;
    }

    const oldPriceSol = pack.priceSol;
    pack.priceUsdc = packData.priceUsdc;
    pack.priceSol = packData.priceSol;
    await lootBoxRepo.save(pack);

    console.log(`✅ Updated "${packData.name}":`);
    console.log(`   Price USD: $${packData.priceUsdc}`);
    console.log(`   Old SOL: ${oldPriceSol ? Number(oldPriceSol).toFixed(4) : 'N/A'} SOL`);
    console.log(`   New SOL: ${packData.priceSol.toFixed(4)} SOL`);
    console.log(`   Rate: $${(packData.priceUsdc / packData.priceSol).toFixed(2)}/SOL\n`);
  }

  console.log('═'.repeat(70));
  console.log('✅ All pack prices updated!\n');
  console.log('📊 Current Prices (@ $220/SOL):');
  console.log('   Starter: $5 = 0.0227 SOL');
  console.log('   Premium: $15 = 0.0682 SOL');
  console.log('   Elite: $50 = 0.2273 SOL\n');
  console.log('═'.repeat(70));

  await AppDataSource.destroy();
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});

