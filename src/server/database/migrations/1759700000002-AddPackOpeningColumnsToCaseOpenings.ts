import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPackOpeningColumnsToCaseOpenings1759700000002 implements MigrationInterface {
    name = 'AddPackOpeningColumnsToCaseOpenings1759700000002'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "case_openings" ADD "nftMintAddress" character varying(100)`);
        await queryRunner.query(`ALTER TABLE "case_openings" ADD "transactionId" character varying(100)`);
        await queryRunner.query(`ALTER TABLE "case_openings" ADD "skinName" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "case_openings" ADD "skinRarity" character varying(50)`);
        await queryRunner.query(`ALTER TABLE "case_openings" ADD "skinWeapon" character varying(100)`);
        await queryRunner.query(`ALTER TABLE "case_openings" ADD "skinValue" numeric(10,2)`);
        await queryRunner.query(`ALTER TABLE "case_openings" ADD "skinImage" text`);
        await queryRunner.query(`ALTER TABLE "case_openings" ADD "isPackOpening" boolean NOT NULL DEFAULT false`);
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
