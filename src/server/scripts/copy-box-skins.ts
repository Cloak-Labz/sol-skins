import { AppDataSource } from '../config/database';
import { BoxSkin } from '../entities/BoxSkin';
import { Box } from '../entities/Box';

async function copyBoxSkins() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected\n');

    // Source box (Devnet Pack)
    const sourceBoxId = 'cb6c7f52-dd5a-4ace-afa2-7e7252401fd8';
    // Target box (Dust3 Promo Pack)
    const targetBoxId = '803d01c3-2fda-4b3f-83a5-9f3d2fa76495';

    const boxRepo = AppDataSource.getRepository(Box);
    const boxSkinRepo = AppDataSource.getRepository(BoxSkin);

    // Verify boxes exist
    const sourceBox = await boxRepo.findOne({ where: { id: sourceBoxId } });
    const targetBox = await boxRepo.findOne({ where: { id: targetBoxId } });

    if (!sourceBox) {
      console.error(`❌ Source box not found: ${sourceBoxId}`);
      await AppDataSource.destroy();
      process.exit(1);
    }

    if (!targetBox) {
      console.error(`❌ Target box not found: ${targetBoxId}`);
      await AppDataSource.destroy();
      process.exit(1);
    }

    console.log(`📦 Source box: ${sourceBox.name}`);
    console.log(`📦 Target box: ${targetBox.name}\n`);

    // Get source skins
    const sourceSkins = await boxSkinRepo.find({ 
      where: { boxId: sourceBoxId },
      relations: ['skinTemplate']
    });

    if (sourceSkins.length === 0) {
      console.error('❌ No skins found in source box');
      await AppDataSource.destroy();
      process.exit(1);
    }

    console.log(`📋 Found ${sourceSkins.length} skins in source box\n`);

    // Check if target already has skins
    const existingTargetSkins = await boxSkinRepo.find({ 
      where: { boxId: targetBoxId }
    });

    if (existingTargetSkins.length > 0) {
      console.log(`⚠️  Target box already has ${existingTargetSkins.length} skins`);
      console.log('   Skipping copy to avoid duplicates');
      await AppDataSource.destroy();
      return;
    }

    // Copy skins
    console.log('🔄 Copying skins...\n');
    let copied = 0;
    let errors = 0;

    for (const sourceSkin of sourceSkins) {
      try {
        const newSkin = boxSkinRepo.create({
          boxId: targetBoxId,
          name: sourceSkin.name,
          weapon: sourceSkin.weapon,
          rarity: sourceSkin.rarity,
          condition: sourceSkin.condition,
          imageUrl: sourceSkin.imageUrl,
          basePriceUsd: sourceSkin.basePriceUsd,
          metadataUri: sourceSkin.metadataUri,
          weight: sourceSkin.weight,
          skinTemplateId: sourceSkin.skinTemplateId,
        });

        await boxSkinRepo.save(newSkin);
        copied++;

        if (copied % 50 === 0) {
          console.log(`   ✅ Copied ${copied}/${sourceSkins.length} skins...`);
        }
      } catch (error: any) {
        console.error(`   ❌ Error copying skin "${sourceSkin.name}":`, error.message);
        errors++;
      }
    }

    console.log(`\n✅ Copy completed!`);
    console.log(`   Copied: ${copied} skins`);
    if (errors > 0) {
      console.log(`   Errors: ${errors} skins`);
    }

    // Verify copy
    const targetSkins = await boxSkinRepo.find({ 
      where: { boxId: targetBoxId }
    });

    console.log(`\n📊 Target box now has ${targetSkins.length} skins`);
    
    // Show rarity distribution
    const byRarity: { [key: string]: number } = {};
    targetSkins.forEach(skin => {
      byRarity[skin.rarity] = (byRarity[skin.rarity] || 0) + 1;
    });
    
    console.log('\n📈 Rarity distribution:');
    Object.entries(byRarity)
      .sort((a, b) => b[1] - a[1])
      .forEach(([rarity, count]) => {
        console.log(`   ${rarity}: ${count} skins`);
      });

    await AppDataSource.destroy();
    console.log('\n✅ Database connection closed');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

copyBoxSkins();

