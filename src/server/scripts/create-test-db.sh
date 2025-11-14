#!/bin/bash

# Script to create test database using Docker

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed or not in PATH"
    exit 1
fi

# Check if postgres container is running
if ! docker ps | grep -q "dust3-postgres"; then
    echo "Error: PostgreSQL container 'dust3-postgres' is not running"
    echo "Please start it with: cd deployment && docker-compose up -d postgres"
    exit 1
fi

# Create test database
echo "Creating test database 'sol_skins_test'..."
docker exec -i dust3-postgres psql -U postgres -c "CREATE DATABASE sol_skins_test;" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ Test database 'sol_skins_test' created successfully!"
else
    # Check if database already exists
    if docker exec -i dust3-postgres psql -U postgres -lqt | cut -d \| -f 1 | grep -qw "sol_skins_test"; then
        echo "ℹ️  Test database 'sol_skins_test' already exists"
    else
        echo "❌ Failed to create test database"
        exit 1
    fi
fi

echo ""
echo "To run migrations on test database:"
echo "  TEST_DB_NAME=sol_skins_test npm run migration:run"

