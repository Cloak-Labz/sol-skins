import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCandyMachineFields1759700000001 implements MigrationInterface {
    name = 'AddCandyMachineFields1759700000001'

    public async up(queryRunner: QueryRunner): Promise<void> {
        const hasBoxes = await queryRunner.hasTable('boxes');
        if (!hasBoxes) return;
        await queryRunner.query(`ALTER TABLE "boxes" ADD COLUMN IF NOT EXISTS "candyGuard" character varying(88)`);
        await queryRunner.query(`ALTER TABLE "boxes" ADD COLUMN IF NOT EXISTS "treasuryAddress" character varying(88)`);
        await queryRunner.query(`ALTER TABLE "boxes" ADD COLUMN IF NOT EXISTS "itemsRedeemed" integer`);
        await queryRunner.query(`ALTER TABLE "boxes" ADD COLUMN IF NOT EXISTS "isMutable" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "boxes" ADD COLUMN IF NOT EXISTS "sellerFeeBasisPoints" integer NOT NULL DEFAULT '500'`);
        await queryRunner.query(`ALTER TABLE "boxes" ADD COLUMN IF NOT EXISTS "symbol" character varying(100)`);
        
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_boxes_candyGuard" ON "boxes" ("candyGuard")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_boxes_treasuryAddress" ON "boxes" ("treasuryAddress")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_boxes_treasuryAddress"`);
        await queryRunner.query(`DROP INDEX "IDX_boxes_candyGuard"`);
        await queryRunner.query(`ALTER TABLE "boxes" DROP COLUMN "symbol"`);
        await queryRunner.query(`ALTER TABLE "boxes" DROP COLUMN "sellerFeeBasisPoints"`);
        await queryRunner.query(`ALTER TABLE "boxes" DROP COLUMN "isMutable"`);
        await queryRunner.query(`ALTER TABLE "boxes" DROP COLUMN "itemsRedeemed"`);
        await queryRunner.query(`ALTER TABLE "boxes" DROP COLUMN "treasuryAddress"`);
        await queryRunner.query(`ALTER TABLE "boxes" DROP COLUMN "candyGuard"`);
    }
}


