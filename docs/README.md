# EdgeChain Docs

## Local Dev Command Matrix

This is the canonical source of truth for local development commands and ports.

### Install Dependencies (once)

Run from repository root:

```bash
yarn install
npm --prefix server install
npm --prefix proof-server install
npm --prefix ipfs-service install   # Optional, only if using local IPFS service
```

### Start Services (separate terminals)

Run from repository root:

| Service | Port | Required | Command |
| --- | --- | --- | --- |
| Unified backend (`server`) | `3001` | Yes | `yarn dev:server` |
| Proof server (`proof-server`) | `3002` | Yes for IoT + Freedom Node flows | `yarn dev:proof-server` |
| UI (`packages/ui`) | `8080` | Yes for frontend | `yarn dev:ui` |
| IPFS service (`ipfs-service`) | `3003` | Optional | `yarn dev:ipfs` |

Single-command launchers (from repository root):

- Preflight (dependencies + ports): `yarn dev:stack:check`
- Preflight including local IPFS: `yarn dev:stack:check:full`
- Required local stack: `yarn dev:stack`
- Full stack including local IPFS: `yarn dev:stack:full`

### Health Checks

```bash
yarn dev:health
```

If IPFS is not running locally, check only the required services:

```bash
curl http://localhost:3001/health
curl http://localhost:3002/health
```

### Local URLs

- UI: `http://localhost:8080`
- Backend health: `http://localhost:3001/health`
- Proof server health: `http://localhost:3002/health`
- IPFS health (optional): `http://localhost:3003/health`

### FL API Surface

- The only FL runtime API surface is `server` at `http://localhost:3001/api/fl/*`.
- `packages/api` is a shared constants/types package and is not a deployable runtime server.
