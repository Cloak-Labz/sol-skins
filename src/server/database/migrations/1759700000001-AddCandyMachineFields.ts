import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCandyMachineFields1759700000001 implements MigrationInterface {
    name = 'AddCandyMachineFields1759700000001'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "boxes" ADD "candyGuard" character varying(88)`);
        await queryRunner.query(`ALTER TABLE "boxes" ADD "treasuryAddress" character varying(88)`);
        await queryRunner.query(`ALTER TABLE "boxes" ADD "itemsRedeemed" integer`);
        await queryRunner.query(`ALTER TABLE "boxes" ADD "isMutable" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "boxes" ADD "sellerFeeBasisPoints" integer NOT NULL DEFAULT '500'`);
        await queryRunner.query(`ALTER TABLE "boxes" ADD "symbol" character varying(100)`);
        
        await queryRunner.query(`CREATE INDEX "IDX_boxes_candyGuard" ON "boxes" ("candyGuard")`);
        await queryRunner.query(`CREATE INDEX "IDX_boxes_treasuryAddress" ON "boxes" ("treasuryAddress")`);
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


