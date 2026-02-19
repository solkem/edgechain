#!/bin/bash
#
# EdgeChain Proof Server - Freedom Node Deployment Script
#
# Usage: curl -sfL https://raw.githubusercontent.com/solkem/edgechain/main/proof-server/deploy/install.sh | bash
#

set -euo pipefail

SERVICE_NAME="edgechain-proof-server"
REPO_URL="https://github.com/solkem/edgechain.git"
INSTALL_USER="${SUDO_USER:-$USER}"
if command -v getent >/dev/null 2>&1; then
    INSTALL_HOME="$(getent passwd "$INSTALL_USER" | cut -d: -f6)"
else
    INSTALL_HOME="$HOME"
fi
if [ -z "${INSTALL_HOME:-}" ]; then
    INSTALL_HOME="$HOME"
fi
INSTALL_DIR="${INSTALL_DIR:-$INSTALL_HOME/edgechain}"
PROOF_SERVER_DIR="$INSTALL_DIR/proof-server"
SERVICE_TEMPLATE="$PROOF_SERVER_DIR/deploy/edgechain-proof-server.service"
SERVICE_TARGET="/etc/systemd/system/$SERVICE_NAME.service"

detect_lora_port() {
    for port in /dev/ttyUSB0 /dev/ttyUSB1 /dev/ttyACM0 /dev/ttyACM1; do
        if [ -e "$port" ]; then
            echo "$port"
            return
        fi
    done
    echo "/dev/ttyUSB0"
}

echo "=================================================="
echo "  EdgeChain Proof Server - Freedom Node Setup"
echo "=================================================="
echo ""

if [ "$EUID" -eq 0 ]; then
    echo "Please run as a regular user, not root."
    exit 1
fi

echo "Installing system dependencies..."
sudo apt-get update
sudo apt-get install -y git curl ca-certificates nodejs npm build-essential

NODE_VERSION="$(node -v | cut -d'v' -f2 | cut -d'.' -f1)"
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "Installing Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo ""
echo "Cloning or updating repository..."
if [ -d "$INSTALL_DIR/.git" ]; then
    cd "$INSTALL_DIR"
    git pull origin main
else
    rm -rf "$INSTALL_DIR"
    git clone "$REPO_URL" "$INSTALL_DIR"
fi

echo ""
echo "Installing dependencies and building proof server..."
cd "$PROOF_SERVER_DIR"
npm ci
npm run build
npm prune --omit=dev

echo ""
echo "Creating runtime directories..."
mkdir -p data logs secrets

LORA_PORT="$(detect_lora_port)"
if [ ! -f .env ]; then
    cat > .env <<EOF
NODE_ENV=production
PORT=3002
HOST=0.0.0.0
LORA_PORT=$LORA_PORT
LORA_BAUD=115200
LORA_NETWORK_ID=6
LORA_ADDRESS=1
LORA_FREQUENCY=915000000
LORA_SF=9
LORA_BW=125
LORA_TX_POWER=20
MIDNIGHT_NODE_URL=https://rpc.testnet.midnight.network
MERKLE_STORAGE_PATH=./data/merkle-tree.json
LOG_LEVEL=info
LOG_FILE=./logs/proof-server.log
EOF
    echo "Created .env at $PROOF_SERVER_DIR/.env"
else
    echo ".env already exists, leaving existing values unchanged"
fi

echo ""
echo "Installing systemd service..."
if [ ! -f "$SERVICE_TEMPLATE" ]; then
    echo "Service template not found at $SERVICE_TEMPLATE"
    exit 1
fi

sed \
    -e "s|__EDGECHAIN_USER__|$INSTALL_USER|g" \
    -e "s|__EDGECHAIN_HOME__|$INSTALL_HOME|g" \
    "$SERVICE_TEMPLATE" | sudo tee "$SERVICE_TARGET" >/dev/null

sudo systemctl daemon-reload
sudo systemctl enable "$SERVICE_NAME"
sudo systemctl restart "$SERVICE_NAME"

sleep 3
if systemctl is-active --quiet "$SERVICE_NAME"; then
    echo ""
    echo "Proof server is running."
    echo "Status:  sudo systemctl status $SERVICE_NAME"
    echo "Logs:    sudo journalctl -u $SERVICE_NAME -f"
    echo "Health:  curl http://localhost:3002/health"
else
    echo ""
    echo "Service failed to start. Inspect logs:"
    echo "sudo journalctl -u $SERVICE_NAME -n 100"
    exit 1
fi

echo ""
echo "=================================================="
echo "  Next Steps"
echo "=================================================="
echo "1. Verify LoRa adapter appears as $LORA_PORT"
echo "2. Insert and configure LTE modem (Huawei E3372-325)"
echo "3. Review $PROOF_SERVER_DIR/.env"
echo "4. Validate with: curl http://localhost:3002/status"
echo ""
echo "Midnight SDK notes:"
echo "  $PROOF_SERVER_DIR/MIDNIGHT_INTEGRATION.md"
