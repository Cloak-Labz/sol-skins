#!/bin/bash

# Kill any existing server on port 3002
echo "Checking for existing server..."
lsof -ti:3002 | xargs kill -9 2>/dev/null || true
pkill -f "tsx watch index.ts" 2>/dev/null || true

# Wait a moment
sleep 1

# Start server
echo "Starting server..."
npm run dev
