import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTradeUrlToUser1759706137389 implements MigrationInterface {
    name = 'AddTradeUrlToUser1759706137389'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "tradeUrl" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "tradeUrl"`);
    }

}
