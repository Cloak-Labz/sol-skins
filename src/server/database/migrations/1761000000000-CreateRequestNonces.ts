import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateRequestNonces1761000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'request_nonces',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'nonce',
            type: 'varchar',
            length: '255',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'ipAddress',
            type: 'varchar',
            length: '45',
            isNullable: true,
          },
          {
            name: 'walletAddress',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'endpoint',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'timestamp',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true
    );

    // Create indexes for performance
    await queryRunner.createIndex(
      'request_nonces',
      new TableIndex({
        name: 'IDX_request_nonces_nonce',
        columnNames: ['nonce'],
        isUnique: true,
      })
    );

    await queryRunner.createIndex(
      'request_nonces',
      new TableIndex({
        name: 'IDX_request_nonces_createdAt',
        columnNames: ['createdAt'],
      })
    );

    await queryRunner.createIndex(
      'request_nonces',
      new TableIndex({
        name: 'IDX_request_nonces_ipAddress',
        columnNames: ['ipAddress'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('request_nonces');
  }
}

