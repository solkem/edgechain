# Freedom Node: Midnight Proof Server Setup Guide

**Hardware:** Dell OptiPlex 7060 Micro (i5-8500T, 16GB RAM, 256GB NVMe)  
**OS:** Ubuntu Server 24.04 LTS  
**Prerequisite:** Ubuntu install guide completed (Docker installed and verified)  
**Date:** February 2026

---

## Prerequisites Checklist

Before starting, confirm these are done (from the Ubuntu Install Guide):

- [ ] Ubuntu Server 24.04 LTS installed
- [ ] LVM expanded to full disk (~230GB)
- [ ] Static IP configured
- [ ] SSH key auth working
- [ ] Tailscale connected + key expiry disabled
- [ ] Docker installed and verified (`docker run hello-world` works)
- [ ] Docker set to start on boot
- [ ] `unzip` installed (included in essential packages)

---

## Midnight Network Status Context

As of January 2026, Midnight is transitioning through development phases:

| Phase | Milestone | Status |
|-------|-----------|--------|
| **Hilo** | Token Genesis | Current — NIGHT Glacier Drop on Cardano |
| **Kūkolu** | Federated Mainnet | Next — core engineering maintains Preview |
| **Mōhalu** | Incentivized Mainnet | Future — SPO onboarding begins |
| **Hua** | Full Decentralization | Future — community block production |

**What this means for us:** Testnet-02 is winding down, but the **Preprod** environment and faucet remain active for DApp developers. The proof server Docker image is publicly available. We can develop, deploy Compact contracts, and test ZK proving on the Freedom Node now.

---

## Phase 1: Midnight Proof Server

### Step 1 — Pull and Run the Proof Server

```bash
docker run -d \
  --name midnight-proof-server \
  --restart unless-stopped \
  -p 6300:6300 \
  midnightntwrk/proof-server:7.0.0 \
  -- midnight-proof-server -v
```

| Flag | Purpose |
|------|---------|
| `-d` | Run detached (background process) |
| `--name midnight-proof-server` | Named container for easy management |
| `--restart unless-stopped` | Auto-recover after power cycles (critical for solar) |
| `-p 6300:6300` | Expose proof server on port 6300 |
| `-v` | Verbose logging |

> **First run note:** The Docker image is large (contains ZK parameters). First pull may take 5-15 minutes depending on internet speed.

### Step 2 — Verify the Proof Server is Running

```bash
docker logs midnight-proof-server
```

**Expected output (end of logs):**
```
actix_server::builder: starting 6 workers
actix_server::server: Actix runtime found; starting in Actix runtime
actix_server::server: starting service: "actix-web-service-0.0.0.0:6300", workers: 6, listening on: 0.0.0.0:6300
```

The `workers: 6` confirms the proof server is utilizing all 6 cores of the i5-8500T.

Before this, you'll see a series of ZK parameter downloads:
```
Fetching zero-knowledge proving key for Zswap signing operations - finished.
Fetching zero-knowledge proving key for Zswap outputs - verified correct.
Fetching ZKIR source for Zswap inputs - verified correct.
...
```

These are one-time downloads from Midnight's S3 bucket. Subsequent restarts use cached parameters.

### Step 3 — Test the Endpoint

```bash
curl http://localhost:6300
```

If the server is running, you'll get a response (may be an error page or status — that's fine, it confirms the port is listening).

### Step 4 — Verify Container Auto-Restart

Simulate a power cycle to confirm the proof server survives reboots:

```bash
sudo reboot
```

After reboot, SSH back in and check:

```bash
docker ps
```

You should see `midnight-proof-server` in the list with status `Up`.

### Step 5 — Open Firewall Port (if needed for remote access)

If other machines on the network need to reach the proof server (e.g., Lace wallet on your dev machine pointing at the Freedom Node):

```bash
sudo ufw allow 6300/tcp
```

> **Security note:** Only do this on trusted networks. In production, the proof server should only accept local connections. For remote Lace wallet access during development, use Tailscale so the connection stays within the VPN mesh.

---

## Phase 2: Compact Compiler

The Compact compiler converts smart contracts into ZK circuits for proof generation. You need this to deploy your BRACE and ACR contracts.

### Step 6 — Install Compact

First, ensure `unzip` is installed (required by Compact's update mechanism):

```bash
sudo apt install -y unzip
```

Then install the Compact compiler:

```bash
curl --proto '=https' --tlsv1.2 -LsSf \
  https://github.com/midnightntwrk/compact/releases/latest/download/compact-installer.sh | sh
```

Reload your shell:

```bash
source ~/.bashrc
```

> **Note:** If Compact was already installed via another method (e.g., Midnight Builder Assemble program, prior dev setup), check if it's already available before reinstalling:
> ```bash
> which compact
> compact --version
> ```
> If both return valid output, skip to Step 8.

### Step 7 — Set Default Compiler Version

The installer does not set a default compiler. You must run update first:

```bash
compact update
```

This downloads the latest compiler binary, unpacks it (requires `unzip`), and sets it as the default.

> **Common error without `unzip`:**
> ```
> Error: Failed to update
> Caused by:
>     0: Failed to spawn artifact extraction command
>     1: No such file or directory (os error 2)
> ```
> Fix: `sudo apt install -y unzip` then retry `compact update`.

### Step 8 — Verify Compact Installation

```bash
compact --version
compact compile --version
which compact
```

**Expected output:** Version numbers and installation path. Path may vary by install method:
- Installer script: `~/.compact/bin/compact`
- System/pip install: `~/.local/bin/compact`

Both are valid as long as the version commands return results.

---

## Phase 3: Node.js Runtime

The Midnight SDK, CLI tools, and DApp interaction all require Node.js 22+.

### Step 9 — Install Node.js 22 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

### Step 10 — Verify Node.js and npm

```bash
node --version
npm --version
```

**Expected output:**
```
v22.x.x
10.x.x
```

### Step 11 — Install Yarn 4 (Package Manager)

The EdgeChain monorepo uses Yarn 4 workspaces. The default `corepack` Yarn is v1 — you must explicitly activate v4:

```bash
corepack enable
corepack prepare yarn@4.9.2 --activate
yarn --version
```

**Expected output:** `4.9.2`

> **Common mistake:** Running `yarn --version` without activating v4 returns `1.22.x`. The EdgeChain Turborepo config requires Yarn 4+. If you see `1.x`, rerun the `corepack prepare` command above.

---

## Phase 4: Clone EdgeChain Repository and Configure Builds

### Step 12 — Clone the Repo

```bash
cd ~
git clone https://github.com/solkem/edgechain.git
cd edgechain
```

### Step 13 — Add Headless Build Scripts

The Freedom Node is a headless proof server — it does not need the browser UI. The default `build:all` script builds everything including the UI, which may fail due to missing frontend dependencies that aren't relevant to the proof server.

**Edit `package.json` to add targeted build commands:**

```bash
cd ~/edgechain
nano package.json
```

Find the `"scripts"` section. Replace it with:

```json
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "build:all": "turbo run build",
    "build:node": "turbo run build --filter=@edgechain/contract --filter=@edgechain/api --filter=@edgechain/cli",
    "build:ui": "turbo run build --filter=edgechain-ui",
    "clean": "turbo run clean",
    "clean:cache": "rm -rf .turbo && rm -rf node_modules/.cache"
  },
```

**What changed from the original:**

| Script | Before | After |
|--------|--------|-------|
| `build:all` | Chained `cd` commands through each package sequentially | Clean `turbo run build` (parallel, builds everything) |
| `build:node` | **Did not exist** | **NEW** — builds only contract + api + cli (headless) |
| `build:ui` | **Did not exist** | **NEW** — builds only the browser UI |

**Original `build:all` (remove this):**
```json
"build:all": "cd packages/contract && npx turbo run build && cd ../api && npx turbo run build && cd ../cli && npx turbo run build && cd ../ui && npx turbo run build"
```

**Build command usage going forward:**

| Command | Where to Use | What It Builds |
|---------|-------------|----------------|
| `yarn build:node` | **Freedom Node** (headless) | contract + api + cli only |
| `yarn build:ui` | **Dev machine** (browser) | UI package only |
| `yarn build:all` | **Dev machine** (full) | Everything — fix UI errors first |

**Verify the edit:**

```bash
grep -A 8 '"scripts"' package.json
```

Should show all three build commands present.

### Step 14 — Install Dependencies

```bash
yarn install
```

### Step 15 — Build for Freedom Node (Headless)

```bash
yarn build:node
```

**Expected output:**
```
@edgechain/contract:build: cache hit, replaying logs ...
@edgechain/api:build: cache hit, replaying logs ...
@edgechain/cli:build: ...

 Tasks:    X successful, X total
Cached:    X cached, X total
  Time:    Xs
```

All tasks should succeed. The UI is not touched.

> **Do NOT run `yarn build:all` on the Freedom Node** until the UI import error is fixed. The known issue is:
> ```
> Could not resolve "../fl/arduinoIntegration" from "src/components/FLDashboard.tsx"
> ```
> This is a missing module in the UI package. It does not affect contract deployment, proof generation, or the attestation pipeline. See Known Issues section at the end of this document.

### Step 15b — Fetch ZK Parameters (if needed by CLI)

```bash
cd packages/cli
./fetch-zk-params.sh
cd ../..
```

> **Note:** ZK parameters are large files required for proof generation. This download may take several minutes. The proof server Docker container has its own parameters — these are for the CLI tools.

---

## Phase 5: Testnet Wallet & Tokens

### Step 16 — Get tDUST from Faucet

You need test tokens to deploy contracts and submit transactions.

**Option A: Via Lace Wallet (browser — on your dev machine)**

1. Install Lace Midnight Preview wallet from Chrome Web Store
2. Create a wallet, save the seed phrase securely
3. Go to Settings → Midnight → set proof server to:
   - `Local (http://localhost:6300)` if Lace is on the Freedom Node
   - `http://<TAILSCALE_IP>:6300` if Lace is on your dev machine connecting to the Freedom Node remotely
4. Click **Receive** → copy your **Unshielded** wallet address
5. Go to **https://faucet.preprod.midnight.network/**
6. Paste your address → click **Request tokens**
7. Wait a few minutes for tokens to arrive
8. Click **Generate tDUST** → delegate tokens to generate tDUST

**Option B: Via CLI (headless — on the Freedom Node)**

The CLI examples (like `example-counter`) create headless wallets automatically:

```bash
# After building, running a CLI example generates a wallet
# Your wallet seed is: [64-character hex string]
# Your wallet address is: mn_shield-addr_test1...
```

Use the displayed address with the faucet URL above.

---

## Phase 6: Verify Full Stack

### Step 17 — Readiness Check

Run this to confirm everything is in place:

```bash
echo "=== Midnight Stack Readiness Check ==="
echo ""
echo "--- Proof Server ---"
docker ps --filter name=midnight-proof-server --format "{{.Status}}" || echo "NOT RUNNING"
echo ""
echo "--- Proof Server Endpoint ---"
curl -s -o /dev/null -w "HTTP %{http_code}" http://localhost:6300 2>/dev/null || echo "NOT REACHABLE"
echo ""
echo "--- Compact Compiler ---"
compact --version 2>/dev/null || echo "NOT INSTALLED"
echo ""
echo "--- Compact Default Compiler ---"
compact compile --version 2>/dev/null || echo "NO DEFAULT SET"
echo ""
echo "--- Node.js ---"
node --version 2>/dev/null || echo "NOT INSTALLED"
echo ""
echo "--- Yarn ---"
yarn --version 2>/dev/null || echo "NOT INSTALLED"
echo ""
echo "--- EdgeChain Repo ---"
if [ -d ~/edgechain ]; then echo "Present at ~/edgechain"; else echo "NOT FOUND"; fi
echo ""
echo "--- Build Scripts ---"
cd ~/edgechain 2>/dev/null && grep -q "build:node" package.json && echo "build:node script: PRESENT" || echo "build:node script: MISSING"
echo ""
echo "=== Check Complete ==="
```

**Expected output:**

```
=== Midnight Stack Readiness Check ===

--- Proof Server ---
Up X hours (healthy)

--- Proof Server Endpoint ---
HTTP 200

--- Compact Compiler ---
compact x.x.x

--- Compact Default Compiler ---
compactc x.x.x

--- Node.js ---
v22.x.x

--- Yarn ---
4.9.2

--- EdgeChain Repo ---
Present at ~/edgechain

--- Build Scripts ---
build:node script: PRESENT

=== Check Complete ===
```

---

## Quick Reference: Docker Management

| Command | Purpose |
|---------|---------|
| `docker logs midnight-proof-server` | View proof server logs |
| `docker logs -f midnight-proof-server` | Follow logs in real-time |
| `docker restart midnight-proof-server` | Restart the proof server |
| `docker stop midnight-proof-server` | Stop the proof server |
| `docker start midnight-proof-server` | Start a stopped proof server |
| `docker pull midnightntwrk/proof-server:7.0.0` | Update the image |

## Quick Reference: Build Commands

| Command | Purpose |
|---------|---------|
| `yarn build:node` | Build headless packages (Freedom Node) |
| `yarn build:ui` | Build browser UI only (dev machine) |
| `yarn build:all` | Build everything (fix UI first) |
| `yarn clean` | Clean all build artifacts |
| `yarn clean:cache` | Clear Turbo cache |

## Quick Reference: Key Files Modified

| File | Change | Why |
|------|--------|-----|
| `~/edgechain/package.json` → `scripts` | Added `build:node` and `build:ui`, replaced chained `build:all` | Separate headless vs browser builds |

---

## Known Issues

### UI Build Failure (Does NOT affect Freedom Node)

```
Could not resolve "../fl/arduinoIntegration" from "src/components/FLDashboard.tsx"
```

**Impact:** `yarn build:all` and `yarn build:ui` fail.  
**Cause:** Missing or moved module in `packages/ui/src/fl/`.  
**Workaround:** Use `yarn build:node` on Freedom Node.  
**Fix required before:** Demo UI deployment, Lace wallet integration testing.  
**To investigate:**
```bash
ls ~/edgechain/packages/ui/src/fl/
# Check if arduinoIntegration.ts exists or was renamed
```

---

## Architecture: What Runs Where

```
┌─────────────────────────────────────────────────┐
│ FREEDOM NODE (OptiPlex 7060 Micro)              │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │ Docker: midnight-proof-server           │    │
│  │ Port 6300 — ZK proof generation         │    │
│  │ Workers: 6 (one per i5-8500T core)      │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │ @edgechain/contract                     │    │
│  │ Compact smart contracts (BRACE, ACR)    │    │
│  │ ~487 lines across 4 contracts           │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │ @edgechain/api                          │    │
│  │ Backend API — attestation pipeline      │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │ @edgechain/cli                          │    │
│  │ Headless wallet, contract deployment    │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │ LoRa Listener (future)                  │    │
│  │ CP2102 USB-UART → RYLR896              │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │ LTE Modem (future)                      │    │
│  │ Huawei E3372-325 — Band 3 (Zimbabwe)   │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  Build command: yarn build:node                 │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ DEV MACHINE (Laptop/Desktop)                    │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │ edgechain-ui                            │    │
│  │ React 18 + TypeScript + Vite + Tailwind │    │
│  │ Lace wallet integration                 │    │
│  │ FL Dashboard, voting interface          │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │ Lace Midnight Preview Wallet (Chrome)   │    │
│  │ Points to Freedom Node proof server     │    │
│  │ via Tailscale: http://<TS_IP>:6300      │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  Build command: yarn build:ui                   │
└─────────────────────────────────────────────────┘
```

---

## What's Next

With the Midnight proof server running on the Freedom Node, the next steps are:

| Step | Description | Status |
|------|-------------|--------|
| 1 | Deploy BRACE contract to Preprod testnet | Ready to attempt |
| 2 | Benchmark Halo2 ZK proving time on i5-8500T | Ready to test |
| 3 | Wire CP2102 + RYLR896 LoRa to Freedom Node | Waiting for hardware wiring |
| 4 | Configure Huawei E3372-325 LTE modem | Waiting for modem setup |
| 5 | Build LoRa listener daemon (receive sensor data) | After LoRa verified |
| 6 | End-to-end: sensor → LoRa → proof → chain | Integration milestone |

---

## Troubleshooting

### Proof server image pull fails
- Check internet connectivity: `ping google.com`
- Check Docker is running: `sudo systemctl status docker`
- Check disk space: `df -h /` (image is several GB)

### "Cannot connect to the Docker daemon"
```bash
sudo systemctl start docker
```

### Compact installer fails with "No such file or directory"
```bash
# Missing unzip
sudo apt install -y unzip
compact update
```

### Compact "No default compiler set"
```bash
# Must run update to set default
compact update
compact compile --version
```

### Yarn version shows 1.x instead of 4.x
```bash
corepack enable
corepack prepare yarn@4.9.2 --activate
yarn --version
# Should show 4.9.2
```

### Node.js version too old
```bash
sudo apt remove nodejs
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

### Proof server crashes with OOM
- Check memory: `free -h`
- The i5-8500T with 16GB should be fine, but if running other containers, check with: `docker stats`

### Port 6300 already in use
```bash
sudo lsof -i :6300
# Kill if needed, or use a different port:
docker run -d --name midnight-proof-server -p 6301:6300 midnightntwrk/proof-server:7.0.0 -- midnight-proof-server -v
```

### `yarn build:node` fails
```bash
# Clean and rebuild
yarn clean
yarn clean:cache
yarn install
yarn build:node
```

---

*Document Version: 2.0 — February 2026*  
*Part of: Msingi Freedom Node Documentation*  
*Depends on: Freedom_Node_Ubuntu_Install_Guide.md*
