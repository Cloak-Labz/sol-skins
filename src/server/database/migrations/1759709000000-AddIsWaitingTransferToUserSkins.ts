import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddIsWaitingTransferToUserSkins1759709000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "user_skins",
      new TableColumn({
        name: "isWaitingTransfer",
        type: "boolean",
        default: false,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("user_skins", "isWaitingTransfer");
  }
}

