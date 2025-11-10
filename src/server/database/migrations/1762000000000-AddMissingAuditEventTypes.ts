import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add missing audit event types to the enum
 * - security_account_locked
 * - security_slow_query
 * - security_nonce_missing (if not already present)
 */
export class AddMissingAuditEventTypes1762000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add missing enum values to audit_logs_eventtype_enum
    await queryRunner.query(`
      ALTER TYPE audit_logs_eventtype_enum 
      ADD VALUE IF NOT EXISTS 'security_account_locked';
    `);
    
    await queryRunner.query(`
      ALTER TYPE audit_logs_eventtype_enum 
      ADD VALUE IF NOT EXISTS 'security_slow_query';
    `);
    
    // Note: security_nonce_missing should already be in the enum from CreateAuditLogs migration
    // But adding it here just in case it's missing
    await queryRunner.query(`
      ALTER TYPE audit_logs_eventtype_enum 
      ADD VALUE IF NOT EXISTS 'security_nonce_missing';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Note: PostgreSQL doesn't support removing enum values directly
    // If you need to rollback, you would need to:
    // 1. Create a new enum without these values
    // 2. Update all rows using the old values
    // 3. Drop the old enum and rename the new one
    // This is complex and usually not necessary for enum additions
    // So we'll leave this empty - if you need to rollback, do it manually
    console.warn('Cannot automatically remove enum values. Manual rollback required if needed.');
  }
}

