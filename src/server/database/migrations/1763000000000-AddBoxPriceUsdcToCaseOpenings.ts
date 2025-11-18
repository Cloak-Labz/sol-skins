import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBoxPriceUsdcToCaseOpenings1763000000000 implements MigrationInterface {
  name = 'AddBoxPriceUsdcToCaseOpenings1763000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add boxPriceUsdc column to case_openings table
    await queryRunner.query(`
      ALTER TABLE "case_openings" 
      ADD COLUMN "boxPriceUsdc" DECIMAL(10, 2) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove boxPriceUsdc column
    await queryRunner.query(`
      ALTER TABLE "case_openings" 
      DROP COLUMN "boxPriceUsdc"
    `);
  }
}

