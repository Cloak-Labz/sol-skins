import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOffChainRandomization1760079189391 implements MigrationInterface {
    name = 'AddOffChainRandomization1760079189391'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "case_openings" ADD "randomSeed" character varying(200)`);
        await queryRunner.query(`ALTER TABLE "case_openings" ADD "randomValue" numeric(20,18)`);
        await queryRunner.query(`ALTER TABLE "case_openings" ADD "randomHash" character varying(64)`);
        await queryRunner.query(`ALTER TABLE "case_openings" ADD "status" character varying(20) NOT NULL DEFAULT 'revealing'`);
        await queryRunner.query(`ALTER TABLE "user_skins" ADD "source" character varying(20) NOT NULL DEFAULT 'opened'`);
        await queryRunner.query(`ALTER TABLE "user_skins" ADD "claimed" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "user_skins" ADD "caseOpeningId" uuid`);
        await queryRunner.query(`ALTER TABLE "user_skins" ALTER COLUMN "nftMintAddress" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_skins" ALTER COLUMN "nftMintAddress" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "user_skins" DROP COLUMN "caseOpeningId"`);
        await queryRunner.query(`ALTER TABLE "user_skins" DROP COLUMN "claimed"`);
        await queryRunner.query(`ALTER TABLE "user_skins" DROP COLUMN "source"`);
        await queryRunner.query(`ALTER TABLE "case_openings" DROP COLUMN "status"`);
        await queryRunner.query(`ALTER TABLE "case_openings" DROP COLUMN "randomHash"`);
        await queryRunner.query(`ALTER TABLE "case_openings" DROP COLUMN "randomValue"`);
        await queryRunner.query(`ALTER TABLE "case_openings" DROP COLUMN "randomSeed"`);
    }

}
