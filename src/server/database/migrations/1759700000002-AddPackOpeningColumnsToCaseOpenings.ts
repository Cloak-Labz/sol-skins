import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPackOpeningColumnsToCaseOpenings1759700000002 implements MigrationInterface {
    name = 'AddPackOpeningColumnsToCaseOpenings1759700000002'

    public async up(queryRunner: QueryRunner): Promise<void> {
        const hasCaseOpenings = await queryRunner.hasTable('case_openings');
        if (!hasCaseOpenings) return;
        await queryRunner.query(`ALTER TABLE "case_openings" ADD COLUMN IF NOT EXISTS "nftMintAddress" character varying(100)`);
        await queryRunner.query(`ALTER TABLE "case_openings" ADD COLUMN IF NOT EXISTS "transactionId" character varying(100)`);
        await queryRunner.query(`ALTER TABLE "case_openings" ADD COLUMN IF NOT EXISTS "skinName" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "case_openings" ADD COLUMN IF NOT EXISTS "skinRarity" character varying(50)`);
        await queryRunner.query(`ALTER TABLE "case_openings" ADD COLUMN IF NOT EXISTS "skinWeapon" character varying(100)`);
        await queryRunner.query(`ALTER TABLE "case_openings" ADD COLUMN IF NOT EXISTS "skinValue" numeric(10,2)`);
        await queryRunner.query(`ALTER TABLE "case_openings" ADD COLUMN IF NOT EXISTS "skinImage" text`);
        await queryRunner.query(`ALTER TABLE "case_openings" ADD COLUMN IF NOT EXISTS "isPackOpening" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "case_openings" DROP COLUMN "isPackOpening"`);
        await queryRunner.query(`ALTER TABLE "case_openings" DROP COLUMN "skinImage"`);
        await queryRunner.query(`ALTER TABLE "case_openings" DROP COLUMN "skinValue"`);
        await queryRunner.query(`ALTER TABLE "case_openings" DROP COLUMN "skinWeapon"`);
        await queryRunner.query(`ALTER TABLE "case_openings" DROP COLUMN "skinRarity"`);
        await queryRunner.query(`ALTER TABLE "case_openings" DROP COLUMN "skinName"`);
        await queryRunner.query(`ALTER TABLE "case_openings" DROP COLUMN "transactionId"`);
        await queryRunner.query(`ALTER TABLE "case_openings" DROP COLUMN "nftMintAddress"`);
    }
}
