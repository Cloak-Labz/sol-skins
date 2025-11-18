import { AppDataSource } from '../config/database';

async function addBoxPriceUsdcColumn() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const queryRunner = AppDataSource.createQueryRunner();
    
    // Check if column already exists
    const table = await queryRunner.getTable('case_openings');
    const hasColumn = table?.columns.find(col => col.name === 'boxPriceUsdc');
    
    if (hasColumn) {
      console.log('✅ Column boxPriceUsdc already exists');
      await queryRunner.release();
      await AppDataSource.destroy();
      return;
    }

    // Add column
    await queryRunner.query(`
      ALTER TABLE "case_openings" 
      ADD COLUMN "boxPriceUsdc" DECIMAL(10, 2) NULL
    `);
    
    console.log('✅ Column boxPriceUsdc added successfully');
    
    await queryRunner.release();
    await AppDataSource.destroy();
    console.log('✅ Database connection closed');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.code === '42703') {
      console.log('ℹ️  Column might already exist or table structure is different');
    }
    process.exit(1);
  }
}

addBoxPriceUsdcColumn();

