import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSteamInventory1759435460448 implements MigrationInterface {
    name = 'AddSteamInventory1759435460448'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "skin_listings" DROP CONSTRAINT "skin_listings_user_id_fkey"`);
        await queryRunner.query(`ALTER TABLE "skin_listings" DROP CONSTRAINT "skin_listings_user_skin_id_fkey"`);
        await queryRunner.query(`ALTER TABLE "skin_listings" DROP CONSTRAINT "skin_listings_sold_to_user_id_fkey"`);
        await queryRunner.query(`CREATE TABLE "steam_inventories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "steamId64" character varying(100) NOT NULL, "steamUserId" character varying(100), "marketHashName" character varying(200) NOT NULL, "marketName" character varying(200) NOT NULL, "type" character varying(200) NOT NULL, "marketable" boolean NOT NULL DEFAULT false, "exterior" character varying(100), "itemSet" character varying(200), "quality" character varying(100), "rarity" character varying(100), "weapon" character varying(100), "lowestPrice" character varying(50), "medianPrice" character varying(50), "volume" character varying(50), "currency" character varying(10), "importedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_00824e8e9e2e215a968f8938ee6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_ec15640690e01cfcd9d1f4a623" ON "steam_inventories" ("userId", "steamId64") `);
        await queryRunner.query(`ALTER TABLE "skin_listings" DROP COLUMN "status"`);
        await queryRunner.query(`ALTER TABLE "skin_listings" ADD "status" character varying NOT NULL DEFAULT 'active'`);
        await queryRunner.query(`ALTER TABLE "skin_listings" ADD CONSTRAINT "FK_088fac635fb35e73aca1c996364" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "skin_listings" ADD CONSTRAINT "FK_1b01c872a023c5a2affdf9ad4e9" FOREIGN KEY ("user_skin_id") REFERENCES "user_skins"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "skin_listings" ADD CONSTRAINT "FK_37cfea755484b7e909e6a0529d0" FOREIGN KEY ("sold_to_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "steam_inventories" ADD CONSTRAINT "FK_b2fa4f502a20a118ee7d3ffefa6" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "steam_inventories" DROP CONSTRAINT "FK_b2fa4f502a20a118ee7d3ffefa6"`);
        await queryRunner.query(`ALTER TABLE "skin_listings" DROP CONSTRAINT "FK_37cfea755484b7e909e6a0529d0"`);
        await queryRunner.query(`ALTER TABLE "skin_listings" DROP CONSTRAINT "FK_1b01c872a023c5a2affdf9ad4e9"`);
        await queryRunner.query(`ALTER TABLE "skin_listings" DROP CONSTRAINT "FK_088fac635fb35e73aca1c996364"`);
        await queryRunner.query(`ALTER TABLE "skin_listings" DROP COLUMN "status"`);
        await queryRunner.query(`ALTER TABLE "skin_listings" ADD "status" character varying(20) NOT NULL DEFAULT 'active'`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ec15640690e01cfcd9d1f4a623"`);
        await queryRunner.query(`DROP TABLE "steam_inventories"`);
        await queryRunner.query(`ALTER TABLE "skin_listings" ADD CONSTRAINT "skin_listings_sold_to_user_id_fkey" FOREIGN KEY ("sold_to_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "skin_listings" ADD CONSTRAINT "skin_listings_user_skin_id_fkey" FOREIGN KEY ("user_skin_id") REFERENCES "user_skins"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "skin_listings" ADD CONSTRAINT "skin_listings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
