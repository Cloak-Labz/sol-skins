import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo user
  const demoUser = await prisma.user.upsert({
    where: { walletAddress: 'demo_wallet_address' },
    update: {},
    create: {
      walletAddress: 'demo_wallet_address',
    },
  });

  console.log('✅ Created demo user:', demoUser.id);

  // Create loot boxes
  const knifeRushBox = await prisma.lootBox.upsert({
    where: { id: 'knife-rush-box' },
    update: {},
    create: {
      id: 'knife-rush-box',
      name: 'Knife Rush Box',
      description: 'High-speed knife collection with rare variants',
      price: 25.00,
    },
  });

  const rifleClassicBox = await prisma.lootBox.upsert({
    where: { id: 'rifle-classic-box' },
    update: {},
    create: {
      id: 'rifle-classic-box',
      name: 'Rifle Classic Box',
      description: 'Classic rifle collection with legendary weapons',
      price: 50.00,
    },
  });

  console.log('✅ Created loot boxes');

  // Create skins with different rarities
  const skins = [
    // Knife Rush Box skins
    {
      name: 'Basic Combat Knife',
      rarity: 'common' as const,
      marketCategory: 'knife',
      metadata: { color: 'silver', condition: 'new' },
      priceRef: 5.00,
      lootBoxId: knifeRushBox.id,
      inventoryRef: 'knife_001',
    },
    {
      name: 'Tactical Knife',
      rarity: 'common' as const,
      marketCategory: 'knife',
      metadata: { color: 'black', condition: 'new' },
      priceRef: 8.00,
      lootBoxId: knifeRushBox.id,
      inventoryRef: 'knife_002',
    },
    {
      name: 'Steel Blade',
      rarity: 'rare' as const,
      marketCategory: 'knife',
      metadata: { color: 'steel', condition: 'new', special: 'sharpened' },
      priceRef: 15.00,
      lootBoxId: knifeRushBox.id,
      inventoryRef: 'knife_003',
    },
    {
      name: 'Carbon Fiber Knife',
      rarity: 'epic' as const,
      marketCategory: 'knife',
      metadata: { color: 'carbon', condition: 'new', special: 'lightweight' },
      priceRef: 35.00,
      lootBoxId: knifeRushBox.id,
      inventoryRef: 'knife_004',
    },
    {
      name: 'Diamond Edge Knife',
      rarity: 'legendary' as const,
      marketCategory: 'knife',
      metadata: { color: 'diamond', condition: 'new', special: 'unbreakable' },
      priceRef: 75.00,
      lootBoxId: knifeRushBox.id,
      inventoryRef: 'knife_005',
    },
    {
      name: 'Mystic Blade',
      rarity: 'mythic' as const,
      marketCategory: 'knife',
      metadata: { color: 'mystic', condition: 'new', special: 'enchanted' },
      priceRef: 150.00,
      lootBoxId: knifeRushBox.id,
      inventoryRef: 'knife_006',
    },
    // Rifle Classic Box skins
    {
      name: 'Standard Rifle',
      rarity: 'common' as const,
      marketCategory: 'rifle',
      metadata: { type: 'assault', condition: 'new' },
      priceRef: 10.00,
      lootBoxId: rifleClassicBox.id,
      inventoryRef: 'rifle_001',
    },
    {
      name: 'Military Rifle',
      rarity: 'common' as const,
      marketCategory: 'rifle',
      metadata: { type: 'assault', condition: 'new', camo: 'desert' },
      priceRef: 12.00,
      lootBoxId: rifleClassicBox.id,
      inventoryRef: 'rifle_002',
    },
    {
      name: 'Precision Rifle',
      rarity: 'rare' as const,
      marketCategory: 'rifle',
      metadata: { type: 'sniper', condition: 'new', scope: 'high_magnification' },
      priceRef: 25.00,
      lootBoxId: rifleClassicBox.id,
      inventoryRef: 'rifle_003',
    },
    {
      name: 'Tactical Rifle',
      rarity: 'rare' as const,
      marketCategory: 'rifle',
      metadata: { type: 'assault', condition: 'new', attachments: ['sight', 'grip'] },
      priceRef: 30.00,
      lootBoxId: rifleClassicBox.id,
      inventoryRef: 'rifle_004',
    },
    {
      name: 'Elite Rifle',
      rarity: 'epic' as const,
      marketCategory: 'rifle',
      metadata: { type: 'assault', condition: 'new', special: 'modular' },
      priceRef: 60.00,
      lootBoxId: rifleClassicBox.id,
      inventoryRef: 'rifle_005',
    },
    {
      name: 'Combat Rifle',
      rarity: 'epic' as const,
      marketCategory: 'rifle',
      metadata: { type: 'assault', condition: 'new', special: 'battle_tested' },
      priceRef: 70.00,
      lootBoxId: rifleClassicBox.id,
      inventoryRef: 'rifle_006',
    },
    {
      name: 'Legendary Rifle',
      rarity: 'legendary' as const,
      marketCategory: 'rifle',
      metadata: { type: 'assault', condition: 'new', special: 'gold_plated' },
      priceRef: 120.00,
      lootBoxId: rifleClassicBox.id,
      inventoryRef: 'rifle_007',
    },
    {
      name: 'Mythic Rifle',
      rarity: 'legendary' as const,
      marketCategory: 'rifle',
      metadata: { type: 'sniper', condition: 'new', special: 'energy_core' },
      priceRef: 180.00,
      lootBoxId: rifleClassicBox.id,
      inventoryRef: 'rifle_008',
    },
    {
      name: 'Ultimate Rifle',
      rarity: 'mythic' as const,
      marketCategory: 'rifle',
      metadata: { type: 'assault', condition: 'new', special: 'prototype' },
      priceRef: 300.00,
      lootBoxId: rifleClassicBox.id,
      inventoryRef: 'rifle_009',
    },
    {
      name: 'Cosmic Rifle',
      rarity: 'mythic' as const,
      marketCategory: 'rifle',
      metadata: { type: 'sniper', condition: 'new', special: 'dimensional' },
      priceRef: 500.00,
      lootBoxId: rifleClassicBox.id,
      inventoryRef: 'rifle_010',
    },
    // Additional common skins for more variety
    {
      name: 'Utility Knife',
      rarity: 'common' as const,
      marketCategory: 'knife',
      metadata: { color: 'gray', condition: 'new' },
      priceRef: 3.00,
      lootBoxId: knifeRushBox.id,
      inventoryRef: 'knife_007',
    },
    {
      name: 'Pocket Knife',
      rarity: 'common' as const,
      marketCategory: 'knife',
      metadata: { color: 'brown', condition: 'new' },
      priceRef: 4.00,
      lootBoxId: knifeRushBox.id,
      inventoryRef: 'knife_008',
    },
    {
      name: 'Survival Knife',
      rarity: 'rare' as const,
      marketCategory: 'knife',
      metadata: { color: 'green', condition: 'new', special: 'multi_tool' },
      priceRef: 18.00,
      lootBoxId: knifeRushBox.id,
      inventoryRef: 'knife_009',
    },
    {
      name: 'Ceremonial Knife',
      rarity: 'epic' as const,
      marketCategory: 'knife',
      metadata: { color: 'gold', condition: 'new', special: 'ornate' },
      priceRef: 45.00,
      lootBoxId: knifeRushBox.id,
      inventoryRef: 'knife_010',
    },
  ];

  for (const skinData of skins) {
    await prisma.skin.upsert({
      where: { inventoryRef: skinData.inventoryRef },
      update: {},
      create: {
        ...skinData,
        status: 'available',
      },
    });
  }

  console.log(`✅ Created ${skins.length} skins`);

  // Create some sample transactions
  const sampleTransactions = [
    {
      userId: demoUser.id,
      lootBoxId: knifeRushBox.id,
      type: 'open_box' as const,
      txSignature: 'sample_tx_1',
      amount: knifeRushBox.price,
      status: 'success' as const,
    },
    {
      userId: demoUser.id,
      lootBoxId: rifleClassicBox.id,
      type: 'open_box' as const,
      txSignature: 'sample_tx_2',
      amount: rifleClassicBox.price,
      status: 'success' as const,
    },
  ];

  for (const txData of sampleTransactions) {
    await prisma.transaction.create({
      data: txData,
    });
  }

  console.log('✅ Created sample transactions');

  // Create some treasury ledger entries
  const treasuryEntries = [
    {
      txType: 'deposit' as const,
      amount: 10000.00,
      currency: 'USDC',
      txRef: 'treasury_deposit_1',
    },
    {
      txType: 'fee' as const,
      amount: 50.00,
      currency: 'USDC',
      txRef: 'fee_collection_1',
    },
  ];

  for (const entry of treasuryEntries) {
    await prisma.treasuryLedger.create({
      data: entry,
    });
  }

  console.log('✅ Created treasury entries');

  console.log('🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
