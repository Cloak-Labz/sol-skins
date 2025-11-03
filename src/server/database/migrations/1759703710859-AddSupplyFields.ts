import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSupplyFields1759703710859 implements MigrationInterface {
    name = 'AddSupplyFields1759703710859'

    public async up(queryRunner: QueryRunner): Promise<void> {
        const hasLootBoxTypes = await queryRunner.hasTable('loot_box_types');
        if (!hasLootBoxTypes) return;
        await queryRunner.query(`ALTER TABLE "loot_box_types" ADD COLUMN IF NOT EXISTS "maxSupply" integer`);
        await queryRunner.query(`ALTER TABLE "loot_box_types" ADD COLUMN IF NOT EXISTS "remainingSupply" integer NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "loot_box_types" DROP COLUMN "remainingSupply"`);
        await queryRunner.query(`ALTER TABLE "loot_box_types" DROP COLUMN "maxSupply"`);
    }

}


