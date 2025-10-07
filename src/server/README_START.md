# Start the Backend Server

## Quick Start

```bash
cd src/server
./start.sh
```

Or:

```bash
cd src/server
npm run dev
```

## Server Info

- **Port:** 3002
- **API:** http://localhost:3002/api/v1
- **Health:** http://localhost:3002/health

## Known Issue: Solana Service

The Solana program integration has an IDL compatibility issue with Anchor 0.31.1:
```
TypeError: Cannot read properties of undefined (reading 'size')
```

**This is NON-CRITICAL** - The backend runs fine with this warning.

### What works:
✅ Database connection
✅ All API endpoints  
✅ Authentication
✅ Admin stats
✅ Everything except `/api/v1/admin/solana/*` endpoints

### Why it happens:
Anchor 0.31.x changed the IDL format and Program initialization. The JSON IDL from `target/idl/` is not fully compatible with the TypeScript client.

### Solutions:

**Option 1: Downgrade Anchor (Quick Fix)**
```bash
cd src/server
npm install @coral-xyz/anchor@0.29.0
npm run dev
```

**Option 2: Use Frontend Client Directly**
The frontend can interact with the program directly without needing backend endpoints. The admin endpoints are just helpers.

**Option 3: Wait for Anchor Update**
This issue affects many projects. Anchor team is aware and may fix in future versions.

## Testing

```bash
# Health check
curl http://localhost:3002/health

# Should return:
# {"success":true,"data":{"status":"healthy",...}}
```

## Stopping

```bash
# Press Ctrl+C in the terminal
# Or kill the process:
pkill -f "tsx watch"
```
