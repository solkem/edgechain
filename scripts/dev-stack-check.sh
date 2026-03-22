#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WITH_IPFS=0

if [[ "${1:-}" == "--with-ipfs" ]]; then
  WITH_IPFS=1
fi

HAS_FAILURE=0

check_deps() {
  local path="$1"
  local install_hint="$2"

  if [[ -d "$ROOT_DIR/$path/node_modules" ]]; then
    echo "[ok] dependencies: $path"
    return
  fi

  echo "[fail] missing dependencies: $path"
  echo "       run: $install_hint"
  HAS_FAILURE=1
}

port_in_use() {
  local port="$1"

  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
    return
  fi

  if command -v ss >/dev/null 2>&1; then
    ss -ltn "sport = :$port" | tail -n +2 | grep -q .
    return
  fi

  if command -v netstat >/dev/null 2>&1; then
    netstat -an | grep -E "LISTEN|LISTENING" | grep -q "[\.:]$port[[:space:]]"
    return
  fi

  # No available port-inspection utility; treat as unknown/not-in-use.
  return 1
}

print_port_owner() {
  local port="$1"

  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"$port" -sTCP:LISTEN | sed 's/^/       /'
    return
  fi

  if command -v ss >/dev/null 2>&1; then
    ss -ltnp "sport = :$port" | sed 's/^/       /'
    return
  fi

  if command -v netstat >/dev/null 2>&1; then
    netstat -an | grep -E "LISTEN|LISTENING" | grep "[\.:]$port[[:space:]]" | sed 's/^/       /'
  fi
}

check_port() {
  local port="$1"
  local service="$2"

  if port_in_use "$port"; then
    echo "[fail] port $port is already in use ($service)"
    print_port_owner "$port"
    HAS_FAILURE=1
    return
  fi

  echo "[ok] port $port is available ($service)"
}

echo "Running EdgeChain dev stack preflight..."

check_deps "server" "npm --prefix server install"
check_deps "proof-server" "npm --prefix proof-server install"
check_deps "packages/ui" "yarn install"
if [[ "$WITH_IPFS" -eq 1 ]]; then
  check_deps "ipfs-service" "npm --prefix ipfs-service install"
fi

check_port 3001 "server"
check_port 3002 "proof-server"
check_port 8080 "ui"
if [[ "$WITH_IPFS" -eq 1 ]]; then
  check_port 3003 "ipfs-service"
fi

if [[ "$HAS_FAILURE" -eq 1 ]]; then
  echo "Preflight failed."
  exit 1
fi

echo "Preflight passed."
