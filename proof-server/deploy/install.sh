#!/bin/bash
#
# EdgeChain Proof Server - Raspberry Pi 5 Deployment Script
# 
# Usage: curl -sfL https://raw.githubusercontent.com/solkem/edgechain/main/proof-server/deploy/install.sh | bash
#

set -e

INSTALL_DIR="/home/pi/edgechain"
SERVICE_NAME="edgechain-proof-server"
REPO_URL="https://github.com/solkem/edgechain.git"

echo "=================================================="
echo "  EdgeChain Proof Server - Raspberry Pi 5 Setup"
echo "=================================================="
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    echo "⚠️  Please run as 'pi' user, not root"
    exit 1
fi

# Check if running on Raspberry Pi
if ! grep -q "Raspberry Pi" /proc/cpuinfo 2>/dev/null; then
    echo "⚠️  Warning: This doesn't appear to be a Raspberry Pi"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "📦 Installing system dependencies..."
sudo apt-get update
sudo apt-get install -y git nodejs npm

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "📦 Installing Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo ""
echo "📥 Cloning EdgeChain repository..."
if [ -d "$INSTALL_DIR" ]; then
    echo "   Existing installation found, updating..."
    cd "$INSTALL_DIR"
    git pull origin main
else
    git clone "$REPO_URL" "$INSTALL_DIR"
fi

echo ""
echo "📦 Installing proof server dependencies..."
cd "$INSTALL_DIR/proof-server"
npm install --production

echo ""
echo "🔨 Building TypeScript..."
npm run build

echo ""
echo "📁 Creating directories..."
mkdir -p data logs

echo ""
echo "⚙️  Creating default configuration..."
if [ ! -f .env ]; then
    cat > .env << EOF
NODE_ENV=production
SERVER_PORT=3002
SERVER_HOST=0.0.0.0
LORA_SERIAL_PORT=/dev/ttyUSB0
LORA_BAUD_RATE=115200
MIDNIGHT_NODE_URL=https://rpc.testnet.midnight.network
MERKLE_STORAGE_PATH=./data/merkle-tree.json
LOG_LEVEL=info
LOG_FILE=./logs/proof-server.log
EOF
    echo "   Created .env with default settings"
    echo "   ⚠️  Edit /home/pi/edgechain/proof-server/.env to configure"
fi

echo ""
echo "🔧 Installing systemd service..."
sudo cp deploy/edgechain-proof-server.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable $SERVICE_NAME

echo ""
echo "🚀 Starting service..."
sudo systemctl start $SERVICE_NAME

# Wait a moment for startup
sleep 3

# Check status
if systemctl is-active --quiet $SERVICE_NAME; then
    echo ""
    echo "✅ EdgeChain Proof Server is running!"
    echo ""
    echo "   Status:  sudo systemctl status $SERVICE_NAME"
    echo "   Logs:    sudo journalctl -u $SERVICE_NAME -f"
    echo "   Health:  curl http://localhost:3002/health"
    echo ""
else
    echo ""
    echo "❌ Service failed to start. Check logs:"
    echo "   sudo journalctl -u $SERVICE_NAME -n 50"
fi

echo ""
echo "=================================================="
echo "  Next Steps:"
echo "=================================================="
echo ""
echo "1. Connect RYLR896 LoRa module to USB (/dev/ttyUSB0)"
echo "2. Edit /home/pi/edgechain/proof-server/.env if needed"
echo "3. Restart: sudo systemctl restart $SERVICE_NAME"
echo "4. View logs: sudo journalctl -u $SERVICE_NAME -f"
echo ""
echo "For Midnight SDK setup, see:"
echo "  $INSTALL_DIR/proof-server/MIDNIGHT_INTEGRATION.md"
echo ""
