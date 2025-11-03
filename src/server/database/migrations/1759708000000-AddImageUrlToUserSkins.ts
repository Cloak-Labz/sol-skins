import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddImageUrlToUserSkins1759708000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "user_skins",
      new TableColumn({
        name: "imageUrl",
        type: "varchar",
        length: "500",
        isNullable: true,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("user_skins", "imageUrl");
  }
}
