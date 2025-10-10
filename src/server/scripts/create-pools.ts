import axios from 'axios';

const API_BASE = 'http://localhost:3002/api/v1';

// Skin probabilities matching the order they were created
const SKIN_PROBS = [0.64, 0.64, 3.2, 3.2, 3.2, 7.99, 7.99, 15.98, 15.98, 24.1, 24.1];

async function createPools() {
  try {
    // Fetch packs and skins
    const packsRes = await axios.get(`${API_BASE}/admin/packs`);
    const skinsRes = await axios.get(`${API_BASE}/admin/skin-templates`);
    
    const packs = packsRes.data.data;
    const skins = skinsRes.data.data;
    
    console.log(`\nFound ${packs.length} packs and ${skins.length} skins\n`);
    
    let created = 0;
    let skipped = 0;
    
    for (const pack of packs) {
      console.log(`Creating pools for ${pack.name}...`);
      
      for (let i = 0; i < skins.length; i++) {
        const skin = skins[i];
        const prob = SKIN_PROBS[i] || 1;
        
        try {
          await axios.post(`${API_BASE}/admin/loot-box-pools`, {
            lootBoxTypeId: pack.id,
            skinTemplateId: skin.id,
            dropChance: prob,
          });
          created++;
          console.log(`  ✅ ${skin.weapon} | ${skin.skinName} (${prob}%)`);
        } catch (error: any) {
          const msg = error.response?.data?.message || error.message;
          if (msg.includes('duplicate')) {
            skipped++;
            console.log(`  ⏭️  ${skin.weapon} | ${skin.skinName} (already exists)`);
          } else {
            console.log(`  ❌ ${skin.weapon} | ${skin.skinName}: ${msg}`);
          }
        }
      }
      console.log('');
    }
    
    console.log(`\n✅ Created ${created} new pool entries!`);
    if (skipped > 0) {
      console.log(`⏭️  Skipped ${skipped} existing entries`);
    }
    console.log('');
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

createPools();

