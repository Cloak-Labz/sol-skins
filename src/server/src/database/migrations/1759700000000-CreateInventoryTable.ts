import { MigrationInterface, QueryRunner, Table, Index } from "typeorm";

export class CreateInventoryTable1759700000000 implements MigrationInterface {
    name = 'CreateInventoryTable1759700000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: "inventory",
                columns: [
                    {
                        name: "id",
                        type: "uuid",
                        isPrimary: true,
                        generationStrategy: "uuid",
                        default: "uuid_generate_v4()"
                    },
                    {
                        name: "name",
                        type: "varchar",
                        length: "255"
                    },
                    {
                        name: "description",
                        type: "text",
                        isNullable: true
                    },
                    {
                        name: "imageUrl",
                        type: "text"
                    },
                    {
                        name: "rarity",
                        type: "varchar",
                        length: "50",
                        default: "'Common'"
                    },
                    {
                        name: "attributes",
                        type: "jsonb",
                        isNullable: true
                    },
                    {
                        name: "metadataUri",
                        type: "text",
                        isNullable: true
                    },
                    {
                        name: "mintedAsset",
                        type: "varchar",
                        length: "88",
                        isNullable: true,
                        isUnique: true
                    },
                    {
                        name: "mintTx",
                        type: "text",
                        isNullable: true
                    },
                    {
                        name: "mintedAt",
                        type: "timestamp",
                        isNullable: true
                    },
                    {
                        name: "assignedToBatch",
                        type: "boolean",
                        default: false
                    },
                    {
                        name: "batchId",
                        type: "integer",
                        isNullable: true
                    },
                    {
                        name: "createdAt",
                        type: "timestamp",
                        default: "CURRENT_TIMESTAMP"
                    },
                    {
                        name: "updatedAt",
                        type: "timestamp",
                        default: "CURRENT_TIMESTAMP"
                    }
                ]
            }),
            true
        );

        // Create indexes
        await queryRunner.createIndex("inventory", new Index("IDX_inventory_name", ["name"]));
        await queryRunner.createIndex("inventory", new Index("IDX_inventory_rarity", ["rarity"]));
        await queryRunner.createIndex("inventory", new Index("IDX_inventory_metadataUri", ["metadataUri"]));
        await queryRunner.createIndex("inventory", new Index("IDX_inventory_mintedAsset", ["mintedAsset"]));
        await queryRunner.createIndex("inventory", new Index("IDX_inventory_assignedToBatch", ["assignedToBatch"]));
        await queryRunner.createIndex("inventory", new Index("IDX_inventory_batchId", ["batchId"]));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("inventory");
    }
}
