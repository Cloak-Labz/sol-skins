import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMetadataToTransaction1759700000001 implements MigrationInterface {
    name = 'AddMetadataToTransaction1759700000001'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transactions" ADD "metadata" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN "metadata"`);
    }
}
