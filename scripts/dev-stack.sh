#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WITH_IPFS=0

if [[ "${1:-}" == "--with-ipfs" ]]; then
  WITH_IPFS=1
fi

declare -a PIDS=()
declare -a NAMES=()

start_service() {
  local name="$1"
  shift

  (
    cd "$ROOT_DIR"
    echo "[$name] starting..."
    "$@"
  ) &

  PIDS+=("$!")
  NAMES+=("$name")
}

cleanup() {
  local i
  for i in "${!PIDS[@]}"; do
    if kill -0 "${PIDS[$i]}" 2>/dev/null; then
      kill "${PIDS[$i]}" 2>/dev/null || true
    fi
  done

  for i in "${!PIDS[@]}"; do
    wait "${PIDS[$i]}" 2>/dev/null || true
  done
}

on_interrupt() {
  echo ""
  echo "Stopping dev stack..."
  cleanup
  exit 0
}

trap on_interrupt INT TERM

if [[ "$WITH_IPFS" -eq 1 ]]; then
  bash "$ROOT_DIR/scripts/dev-stack-check.sh" --with-ipfs
else
  bash "$ROOT_DIR/scripts/dev-stack-check.sh"
fi

start_service "server" npm --prefix server run dev
start_service "proof-server" npm --prefix proof-server run dev
start_service "ui" yarn workspace edgechain-ui dev
if [[ "$WITH_IPFS" -eq 1 ]]; then
  # Use non-watch mode to avoid hitting file descriptor limits in constrained environments.
  start_service "ipfs" npm --prefix ipfs-service run start
fi

echo "EdgeChain dev stack started."
echo "Press Ctrl+C to stop all services."

while true; do
  sleep 1
  for i in "${!PIDS[@]}"; do
    if ! kill -0 "${PIDS[$i]}" 2>/dev/null; then
      wait "${PIDS[$i]}" || true
      echo "${NAMES[$i]} exited. Stopping remaining services..."
      cleanup
      exit 1
    fi
  done
done
