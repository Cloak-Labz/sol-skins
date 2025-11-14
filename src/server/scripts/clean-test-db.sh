#!/bin/bash

# Clean test database schema
# This script drops and recreates the test database schema to avoid TypeORM index conflicts

DB_NAME=${TEST_DB_NAME:-sol_skins_test}
DB_USER=${TEST_DB_USER:-postgres}
DB_PASS=${TEST_DB_PASS:-postgres}
DB_HOST=${TEST_DB_HOST:-localhost}
DB_PORT=${TEST_DB_PORT:-5433}

echo "Cleaning test database schema: $DB_NAME"

# Use docker exec if container is running, otherwise use psql directly
if docker ps | grep -q dust3-postgres; then
  docker exec -i dust3-postgres psql -U "$DB_USER" -d "$DB_NAME" <<EOF
-- Drop all connections to the database first
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = '$DB_NAME'
  AND pid <> pg_backend_pid();

-- Drop schema and recreate
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Verify no indexes remain
DO \$\$
DECLARE
  idx_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO idx_count
  FROM pg_indexes
  WHERE schemaname = 'public';
  
  IF idx_count > 0 THEN
    RAISE NOTICE 'Warning: % indexes still exist after cleanup', idx_count;
  END IF;
END \$\$;
EOF
else
  PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<EOF
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EOF
fi

echo "✅ Test database schema cleaned successfully"

