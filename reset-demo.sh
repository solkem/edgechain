#!/bin/bash

##############################################################################
# EdgeChain Demo Reset Script
#
# This script resets the EdgeChain demo environment for testing.
# It clears the SQLite database and provides instructions for browser reset.
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

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
DB_PATH="$SCRIPT_DIR/server/data"

# Check if database directory exists
if [ ! -d "$DB_PATH" ]; then
    echo -e "${YELLOW}⚠️  Database directory not found: $DB_PATH${NC}"
    echo -e "${YELLOW}   Creating directory...${NC}"
    mkdir -p "$DB_PATH"
fi

# Count database files
DB_COUNT=$(ls -1 "$DB_PATH"/edgechain.db* 2>/dev/null | wc -l)

if [ "$DB_COUNT" -eq 0 ]; then
    echo -e "${YELLOW}ℹ️  No database files found - already clean!${NC}"
else
    echo -e "${YELLOW}📊 Found $DB_COUNT database file(s):${NC}"
    ls -lh "$DB_PATH"/edgechain.db* 2>/dev/null | awk '{print "   - " $9 " (" $5 ")"}'
    echo ""

    # Confirm deletion
    echo -e "${RED}⚠️  This will DELETE all:${NC}"
    echo "   • Device registrations (Arduino → wallet bindings)"
    echo "   • Sensor readings"
    echo "   • ZK proof submissions"
    echo "   • Reward records"
    echo "   • Nullifiers"
    echo ""

    read -p "Are you sure you want to reset? (y/N): " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo -e "${BLUE}🗑️  Deleting database files...${NC}"

        # Checkpoint WAL file to ensure all data is flushed before deletion
        if [ -f "$DB_PATH/edgechain.db" ]; then
            echo -e "${YELLOW}   Checkpointing WAL file...${NC}"
            sqlite3 "$DB_PATH/edgechain.db" "PRAGMA wal_checkpoint(TRUNCATE);" 2>/dev/null || true
        fi

        # Now delete all database files
        rm -f "$DB_PATH"/edgechain.db*
        echo -e "${GREEN}✅ Database files deleted successfully!${NC}"
    else
        echo -e "${YELLOW}❌ Reset cancelled.${NC}"
        exit 0
    fi
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
echo "   yarn dev:server"
echo ""
echo -e "${BLUE}2. Clear browser localStorage:${NC}"
echo "   • Open DevTools (F12)"
echo "   • Go to Console tab"
echo "   • Run: localStorage.clear()"
echo "   • Reload page (Ctrl+R or Cmd+R)"
echo ""
echo -e "${BLUE}3. Reset Arduino BLE device identity (IMPORTANT!):${NC}"
echo "   To generate a new device identity, you must change the salt in Arduino code:"
echo "   • Open: arduino/edgechain_iot/edgechain_iot.ino"
echo "   • Find line 76: EdgeChain-Device-Seed-v2"
echo "   • Change to: EdgeChain-Device-Seed-v3 (or any new version)"
echo "   • Re-upload sketch to Arduino"
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
