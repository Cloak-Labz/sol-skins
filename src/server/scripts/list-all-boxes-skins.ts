import { AppDataSource } from '../config/database';
import { BoxSkin } from '../entities/BoxSkin';
import { Box } from '../entities/Box';

async function listAllBoxesSkins() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected\n');

    const boxRepo = AppDataSource.getRepository(Box);
    const boxes = await boxRepo.find({ order: { createdAt: 'DESC' } });
    
    console.log(`📦 Total boxes: ${boxes.length}\n`);
    
    const boxSkinRepo = AppDataSource.getRepository(BoxSkin);
    
    for (const box of boxes) {
      const boxSkins = await boxSkinRepo.find({ 
        where: { boxId: box.id }
      });
      
      const status = boxSkins.length > 0 ? '✅' : '❌';
      console.log(`${status} ${box.name} (${box.id.substring(0, 8)}...)`);
      console.log(`   Skins: ${boxSkins.length} | Status: ${box.status} | Available: ${box.itemsAvailable}/${box.totalItems}`);
      
      if (boxSkins.length > 0) {
        const byRarity: { [key: string]: number } = {};
        boxSkins.forEach(skin => {
          byRarity[skin.rarity] = (byRarity[skin.rarity] || 0) + 1;
        });
        const rarityStr = Object.entries(byRarity)
          .map(([rarity, count]) => `${rarity}:${count}`)
          .join(', ');
        console.log(`   Rarities: ${rarityStr}`);
      }
      console.log('');
    }
    
    await AppDataSource.destroy();
    console.log('✅ Database connection closed');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

listAllBoxesSkins();

