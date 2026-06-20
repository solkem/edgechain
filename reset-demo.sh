#!/bin/bash

##############################################################################
# EdgeChain Demo Reset Script
#
# This script resets the EdgeChain demo environment for testing.
# It clears the PostgreSQL database and provides instructions for browser reset.
##############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   EdgeChain Demo Reset Script              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ psql is required to reset the Postgres database.${NC}"
    exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
    echo -e "${RED}❌ DATABASE_URL must be set before resetting the database.${NC}"
    echo "   Example: export DATABASE_URL=postgresql://edgechain:edgechain@localhost:5432/edgechain"
    exit 1
fi

echo -e "${RED}⚠️  This will DELETE all EdgeChain database rows:${NC}"
echo "   • Device registrations (Sensor Node → wallet bindings)"
echo "   • Sensor readings"
echo "   • ZK proof submissions"
echo "   • Reward records"
echo "   • Nullifiers"
echo "   • Manual observations"
echo ""

read -p "Are you sure you want to reset Postgres? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${BLUE}🗑️  Truncating EdgeChain Postgres tables...${NC}"

    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
TRUNCATE TABLE
  manual_observation_messages,
  manual_observations,
  manual_observation_sessions,
  zk_proof_submissions,
  spent_nullifiers,
  transaction_log,
  merkle_roots,
  nullifiers,
  rewards,
  batch_proofs,
  sensor_readings,
  devices
RESTART IDENTITY CASCADE;
SQL

    echo -e "${GREEN}✅ PostgreSQL tables truncated successfully!${NC}"
else
    echo -e "${YELLOW}❌ Reset cancelled.${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Backend Reset Complete!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo ""

# Instructions for browser reset
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo ""
echo -e "${BLUE}1. Restart the backend server:${NC}"
echo "   cd apps/freedom-node && npm run dev"
echo ""
echo -e "${BLUE}2. Clear browser localStorage:${NC}"
echo "   • Open DevTools (F12)"
echo "   • Go to Console tab"
echo "   • Run: localStorage.clear()"
echo "   • Reload page (Ctrl+R or Cmd+R)"
echo ""
echo -e "${BLUE}3. Reprovision the Sensor Node if needed:${NC}"
echo "   Current firmware lives in firmware/esp32-ndani/"
echo "   Rebuild and flash with PlatformIO when you need a fresh device identity."
echo ""
echo -e "${BLUE}4. Reconnect your wallet and test!${NC}"
echo ""
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo ""

# Optional: Kill running server processes
if command -v lsof &> /dev/null; then
    SERVER_PID=$(lsof -ti:3001 2>/dev/null || echo "")
    if [ ! -z "$SERVER_PID" ]; then
        echo -e "${YELLOW}🔍 Found server running on port 3001 (PID: $SERVER_PID)${NC}"
        read -p "Do you want to kill it? (y/N): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            kill -9 $SERVER_PID 2>/dev/null || true
            echo -e "${GREEN}✅ Server process killed${NC}"
            echo ""
        fi
    fi
fi

echo -e "${GREEN}🎉 Reset script complete!${NC}"
echo ""
