import { AppDataSource } from '../config/database';
import { BoxSkin } from '../entities/BoxSkin';
import { Box } from '../entities/Box';

async function checkBoxSkins() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const boxId = '803d01c3-2fda-4b3f-83a5-9f3d2fa76495';
    
    // Check box exists
    const boxRepo = AppDataSource.getRepository(Box);
    const box = await boxRepo.findOne({ where: { id: boxId } });
    
    if (!box) {
      console.log(`❌ Box ${boxId} not found`);
      await AppDataSource.destroy();
      return;
    }
    
    console.log(`\n📦 Box found: ${box.name} (${box.id})`);
    console.log(`   Candy Machine: ${box.candyMachine}`);
    console.log(`   Status: ${box.status}`);
    console.log(`   Items Available: ${box.itemsAvailable}/${box.totalItems}`);
    
    // Check box skins
    const boxSkinRepo = AppDataSource.getRepository(BoxSkin);
    const boxSkins = await boxSkinRepo.find({ 
      where: { boxId },
      relations: ['skinTemplate']
    });
    
    console.log(`\n🎨 Box Skins (${boxSkins.length} total):`);
    
    if (boxSkins.length === 0) {
      console.log('   ❌ NO SKINS FOUND! This is why you\'re getting "Unknown Skin"');
    } else {
      // Group by rarity
      const byRarity: { [key: string]: BoxSkin[] } = {};
      boxSkins.forEach(skin => {
        if (!byRarity[skin.rarity]) {
          byRarity[skin.rarity] = [];
        }
        byRarity[skin.rarity].push(skin);
      });
      
      Object.keys(byRarity).forEach(rarity => {
        console.log(`\n   ${rarity} (${byRarity[rarity].length} skins):`);
        byRarity[rarity].slice(0, 5).forEach(skin => {
          console.log(`      - ${skin.name} (weight: ${skin.weight}, price: $${skin.basePriceUsd})`);
        });
        if (byRarity[rarity].length > 5) {
          console.log(`      ... and ${byRarity[rarity].length - 5} more`);
        }
      });
    }
    
    await AppDataSource.destroy();
    console.log('\n✅ Database connection closed');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkBoxSkins();

