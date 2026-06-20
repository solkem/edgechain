# EdgeChain Architecture Map

This document maps the current repository to EdgeChain's production concepts.
It is intentionally descriptive: it does not rename folders or change runtime
paths. Use it as the navigation layer while the repository is gradually cleaned
up around stable product boundaries.

## Production Domains

EdgeChain has six major domains:

```text
Sensor Node
  Field device firmware, sensors, secure element, LoRa transport.

Freedom Node
  Farmer-owned node that receives packets, verifies device evidence,
  coordinates proofs, tracks nullifiers, and submits private claims.

Coordination Backend
  API routes, database persistence, manual observation intake, WhatsApp pilot
  flows, IPFS integration, and demo service orchestration.

FL / MARS Intelligence
  Federated learning, model update aggregation, contribution scoring, attack
  scenarios, reward eligibility, and oversight.

Midnight Contracts / Proofs
  Compact contracts, circuit-facing artifacts, deployment scripts, nullifier
  and private-state integration.

Web Experience
  React user interface, farmer-facing demo flows, wallet/proof interactions,
  dashboard components.
```

## Current Repository Mapping

```text
edgechain/
  firmware/esp32-ndani/
    Canonical ESP32 firmware path for the current Sensor Node work.

  proof-server/
    In-repo Node.js Freedom Node service: LoRa receiver, BRACE verification,
    Merkle/nullifier helpers, and Midnight prover orchestration. This is
    distinct from the official Midnight proof-server container used for ZK
    proving workers.

  server/
    Unified backend for current demo flows: FL aggregation routes, IoT routes,
    manual observations, WhatsApp adapter, persistence, IPFS, device registry,
    and ZK-proof service integration.

  ipfs-service/
    Storacha/IPFS microservice. Production architecture should decide whether
    this remains a standalone service or becomes a Freedom Node/backend module.

  packages/ui/
    React application and UI-side demo logic. It currently contains FL and IoT
    helpers that should not become the long-term canonical production logic.

  packages/fl/
    Canonical TypeScript FL package for shared model-update types and
    production aggregation logic.

  packages/mars/
    Canonical TypeScript MARS package for production contribution scoring,
    reward eligibility, and reward allocation.

  packages/contract/
    Compact contracts, TypeScript deployment scripts, and deployment metadata.

  packages/cli/
    Midnight CLI launcher/config tooling.

  compact/
    Contract compilation support/artifacts. Treat carefully: clarify canonical
    generated-vs-source responsibilities before moving.

  research/python-lab/
    Python research lab for synthetic Odzi data, FL experiments, MARS scoring,
    attacks, and oversight evaluation. This is core research logic, but it is
    not currently packaged as production service code.
```

## Current FL / MARS Locations

FL and contribution-scoring logic now has a production TypeScript home, with
research logic still kept separately:

```text
packages/fl/
packages/mars/
server/src/services/aggregation.ts
packages/ui/src/fl/
packages/ui/src/components/fl/
research/python-lab/src/edgechain_lab/fl/
research/python-lab/src/edgechain_lab/mars/
research/python-lab/src/edgechain_lab/attacks/
research/python-lab/src/edgechain_lab/oversight/
```

Current boundary: `packages/fl/` owns shared production model-update types,
feature encoding, training-data preparation, prediction contracts, prediction
validation helpers, and backend aggregation. `packages/mars/` owns production
MARS scoring and reward allocation primitives. `server/src/services/aggregation.ts`
owns runtime state and API orchestration, while `server/src/services/marsScoring.ts`
adapts MARS to backend sensor-contribution reward eligibility.
`packages/ui/src/fl/` still owns browser TensorFlow training/inference
execution, demo storage helpers, and UI-side fallback logic. The Python lab
remains the research authority for synthetic data, attacks, oversight, and
experimental MARS variants.

Target direction:

```text
packages/fl/
  Canonical production FL aggregation and model-update types. Created.

packages/mars/
  Canonical production MARS contribution scoring and reward eligibility.
  Created.

research/python-lab/
  Research reference implementation, synthetic experiments, and evaluation.
```

Treat the backend as the runtime authority for deployed aggregation behavior,
`packages/fl/` and `packages/mars/` as reusable production domain packages, and
the Python lab as the research authority for MARS/FL experiment design.

## Current Device / Field Locations

```text
firmware/esp32-ndani/
  Current ESP32 firmware.

server/src/routes/iot.ts
server/src/services/bleReceiver.ts
server/src/services/deviceAuth.ts
server/src/services/deviceRegistry.ts
server/src/services/nullifierTracking.ts
server/src/services/zkProofService.ts
  Current backend-side IoT and privacy routes/services.

proof-server/src/lora-receiver.ts
proof-server/src/brace-verifier.ts
proof-server/src/acr-handler.ts
proof-server/src/midnight-prover.ts
  Freedom Node-side device/proof orchestration.
```

Production risk: "Sensor Node", "firmware", "IoT", and "Freedom Node" are
overlapping names for related but different responsibilities. New work should
prefer "Sensor Node" for field firmware and "Freedom Node" for the farmer-owned
receiver/proof coordinator.

## Current Contracts / Proofs Locations

```text
packages/contract/src/*.compact
packages/contract/src/deploy-*.ts
packages/contract/deployment.json
proof-server/circuits/attestation.compact
compact/
packages/cli/
```

Production risk: source contracts, proof circuits, generated artifacts, and CLI
launchers are not visually separated by responsibility. Before moving these,
identify which Compact files are canonical source, which are generated, and
which are demo-only.

## Recommended Target Shape

This is the target direction, not the current structure:

```text
edgechain/
  apps/
    web/
    api/
    freedom-node/

  packages/
    domain/
    fl/
    mars/
    contracts/
    proofs/
    storage/
    shared-types/

  firmware/
    esp32-ndani/

  research/
    python-lab/

  infra/
    docker/
    fly/
    scripts/

  docs/
    architecture/
    deployment/
    field-hardware/
```

## Migration Principles

- Move one domain at a time.
- Keep backward-compatible routes until clients are migrated.
- Extract shared types before moving behavior.
- Make backend/runtime logic authoritative; avoid production logic owned only by
  the UI.
- Keep Python research code runnable while production TypeScript packages evolve.
- Update Dockerfiles, Fly configs, CI, README links, and tests in the same change
  as any path move.
- Prefer compatibility shims over breaking imports during a folder migration.
