import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateAuditLogs1760000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'audit_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'walletAddress',
            type: 'varchar',
            length: '44',
            isNullable: true,
          },
          {
            name: 'eventType',
            type: 'enum',
            enum: [
              'auth_login',
              'auth_login_failed',
              'auth_logout',
              'auth_token_refresh',
              'financial_buyback',
              'financial_pack_opening',
              'financial_payout',
              'financial_claim',
              'admin_user_create',
              'admin_user_update',
              'admin_user_delete',
              'admin_user_deactivate',
              'admin_box_create',
              'admin_box_update',
              'admin_box_delete',
              'admin_skin_create',
              'admin_skin_update',
              'admin_skin_delete',
              'admin_inventory_add',
              'admin_inventory_update',
              'security_csrf_failed',
              'security_rate_limit_exceeded',
              'security_invalid_signature',
              'security_unauthorized_access',
              'security_admin_access',
              'security_nonce_missing',
              'security_replay_attempt',
              'data_import',
              'data_export',
              'data_delete',
            ],
          },
          {
            name: 'severity',
            type: 'enum',
            enum: ['low', 'medium', 'high', 'critical'],
            default: "'medium'",
          },
          {
            name: 'ipAddress',
            type: 'varchar',
            length: '45',
            isNullable: true,
          },
          {
            name: 'userAgent',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'httpMethod',
            type: 'varchar',
            length: '10',
            isNullable: true,
          },
          {
            name: 'requestPath',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'success',
            type: 'boolean',
            default: true,
          },
          {
            name: 'errorMessage',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'txHash',
            type: 'varchar',
            length: '88',
            isNullable: true,
          },
          {
            name: 'nftMint',
            type: 'varchar',
            length: '88',
            isNullable: true,
          },
          {
            name: 'amountSol',
            type: 'decimal',
            precision: 10,
            scale: 4,
            isNullable: true,
          },
          {
            name: 'amountUsd',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Create indexes for better query performance
    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'IDX_audit_logs_userId',
        columnNames: ['userId'],
      })
    );

    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'IDX_audit_logs_walletAddress',
        columnNames: ['walletAddress'],
      })
    );

    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'IDX_audit_logs_eventType',
        columnNames: ['eventType'],
      })
    );

    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'IDX_audit_logs_severity',
        columnNames: ['severity'],
      })
    );

    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'IDX_audit_logs_createdAt',
        columnNames: ['createdAt'],
      })
    );

    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'IDX_audit_logs_ipAddress',
        columnNames: ['ipAddress'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('audit_logs');
  }
}

