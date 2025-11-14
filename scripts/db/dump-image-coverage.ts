import 'reflect-metadata';
import { AppDataSource } from '../../src/server/config/database';
import { BoxSkin } from '../../src/server/entities/BoxSkin';
import { SkinTemplate } from '../../src/server/entities/SkinTemplate';

async function main() {
  await AppDataSource.initialize();

  const boxSkinRepo = AppDataSource.getRepository(BoxSkin);
  const skinTemplateRepo = AppDataSource.getRepository(SkinTemplate);

  const [boxSkins, skinTemplates] = await Promise.all([
    boxSkinRepo.find({ select: ['id', 'boxId', 'weapon', 'name', 'imageUrl'] }),
    skinTemplateRepo.find({ select: ['id', 'weapon', 'skinName', 'condition', 'imageUrl'] }),
  ]);

  const boxSkinsWithImages = boxSkins.filter((skin) => !!(skin.imageUrl && skin.imageUrl.trim()))
    .map((skin) => skin.id);
  const boxSkinsMissingImages = boxSkins.filter((skin) => !(skin.imageUrl && skin.imageUrl.trim()));

  const skinTemplatesWithImages = skinTemplates.filter((skin) => !!(skin.imageUrl && skin.imageUrl.trim()))
    .map((skin) => skin.id);
  const skinTemplatesMissingImages = skinTemplates.filter((skin) => !(skin.imageUrl && skin.imageUrl.trim()));

  const formatMissing = (skin: { weapon: string; name?: string; skinName?: string; condition?: string }) => {
    const weapon = skin.weapon || 'Unknown';
    const skinName = 'skinName' in skin ? skin.skinName : skin.name;
    const condition = 'condition' in skin ? skin.condition : undefined;
    return condition ? `${weapon} | ${skinName} (${condition})` : `${weapon} | ${skinName}`;
  };

  console.log('=== BoxSkin image coverage ===');
  console.log(`Total box skins: ${boxSkins.length}`);
  console.log(`With image: ${boxSkinsWithImages.length}`);
  console.log(`Missing image: ${boxSkinsMissingImages.length}`);
  if (boxSkinsMissingImages.length) {
    console.log('\nSkins with missing image:');
    for (const skin of boxSkinsMissingImages.slice(0, 50)) {
      console.log(`- ${formatMissing(skin)}`);
    }
    if (boxSkinsMissingImages.length > 50) {
      console.log('...');
    }
  }

  console.log('\n=== SkinTemplate image coverage ===');
  console.log(`Total skin templates: ${skinTemplates.length}`);
  console.log(`With image: ${skinTemplatesWithImages.length}`);
  console.log(`Missing image: ${skinTemplatesMissingImages.length}`);
  if (skinTemplatesMissingImages.length) {
    console.log('\nSkin templates with missing image:');
    for (const skin of skinTemplatesMissingImages.slice(0, 50)) {
      console.log(`- ${formatMissing(skin)}`);
    }
    if (skinTemplatesMissingImages.length > 50) {
      console.log('...');
    }
  }

  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
