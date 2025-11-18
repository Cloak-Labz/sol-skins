import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReferredByUsernameToUser1763506845000 implements MigrationInterface {
    name = 'AddReferredByUsernameToUser1763506845000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        const hasUsers = await queryRunner.hasTable('users');
        if (!hasUsers) return;
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referredByUsername" character varying(50)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "referredByUsername"`);
    }

}

