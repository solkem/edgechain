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

## Farmer-Owned Nodes And Exit Rights

EdgeChain should be a reference implementation for farmer-owned digital
infrastructure, not the owner of the farmer's hardware, data, or ability to
leave the system.

The node names describe deployment roles first:

```text
Sensor Node
  Farmer-owned field hardware: microcontroller, sensors, radio, secure element,
  and firmware.

Freedom Node
  Farmer-owned edge computer: backend services, proof orchestration, local
  storage, transport adapters, and Midnight prover integration.

EdgeChain
  Software that can run on those nodes to coordinate data, proofs, rewards,
  analytics, and cooperative services.
```

Design implication: EdgeChain services may coordinate the workflow, but the
farmer should retain practical exit rights. Future production boundaries should
keep raw observations exportable, firmware auditable and replaceable, data
formats documented, transports pluggable, and proof/storage providers
replaceable where possible. IPFS, Midnight, and EdgeChain-operated services are
important implementation choices, not permanent locks on farmer-owned nodes.

## Current Repository Mapping

```text
edgechain/
  firmware/esp32-ndani/
    Canonical ESP32 firmware path for the current Sensor Node work.

  apps/freedom-node/
    Unified backend for current demo flows: FL aggregation routes, IoT routes,
    manual observations, WhatsApp adapter, persistence, IPFS, device registry,
    and ZK-proof service integration. It uses PostgreSQL through DATABASE_URL
    and initializes schema from src/database/schema.sql at startup.
    Its proof-server/ subservice owns LoRa receiver, BRACE verification,
    Merkle/nullifier helpers, and Midnight prover orchestration. This is
    distinct from the official Midnight proof-server container used for ZK
    proving workers.

  apps/web/
    React application and UI-side demo logic. It currently contains FL and IoT
    helpers that should not become the long-term canonical production logic.

  apps/ipfs-service/
    Storacha/IPFS microservice. Production architecture should decide whether
    this remains a standalone service or becomes a Freedom Node/backend module.

  packages/fl/
    Canonical TypeScript FL package for shared model-update types and
    production aggregation logic.

  packages/mars/
    Canonical TypeScript MARS package for production contribution scoring,
    reward eligibility, and reward allocation.

  packages/contract/
    Canonical home for Compact contract source, generated managed artifacts,
    TypeScript deployment scripts, and deployment metadata.

  packages/cli/
    Midnight CLI launcher/config tooling.

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
apps/freedom-node/src/services/aggregation.ts
apps/web/src/fl/
apps/web/src/components/fl/
research/python-lab/src/edgechain_lab/fl/
research/python-lab/src/edgechain_lab/mars/
research/python-lab/src/edgechain_lab/attacks/
research/python-lab/src/edgechain_lab/oversight/
```

Current boundary: `packages/fl/` owns shared production model-update types,
feature encoding, training-data preparation, IoT/Sensor Node dataset conversion,
prediction contracts, prediction validation helpers, and backend aggregation. `packages/mars/` owns production
MARS scoring and reward allocation primitives. `apps/freedom-node/src/services/aggregation.ts`
owns runtime state and API orchestration, while `apps/freedom-node/src/services/marsScoring.ts`
adapts MARS to backend sensor-contribution reward eligibility.
`apps/web/src/fl/` still owns browser TensorFlow training/inference
execution, demo storage helpers, and UI-side fallback logic. The Python lab
remains the research authority for synthetic data, attacks, oversight, and
experimental MARS variants.

Target direction:

```text
firmware/esp32-ndani/
  Canonical home for the current farmer-owned Sensor Node firmware. Keep the
  physical path lean; "Sensor Node" is the deployment role, not a required
  folder layer.

apps/freedom-node/proof-server/
  Freedom Node proof/device orchestration service, nested under the Freedom
  Node software boundary.

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

apps/freedom-node/src/routes/iot.ts
apps/freedom-node/src/services/bleReceiver.ts
apps/freedom-node/src/services/deviceAuth.ts
apps/freedom-node/src/services/deviceRegistry.ts
apps/freedom-node/src/services/nullifierTracking.ts
apps/freedom-node/src/services/zkProofService.ts
  Current backend-side IoT and privacy routes/services.

apps/freedom-node/proof-server/src/lora-receiver.ts
apps/freedom-node/proof-server/src/brace-verifier.ts
apps/freedom-node/proof-server/src/acr-handler.ts
apps/freedom-node/proof-server/src/midnight-prover.ts
  Freedom Node-side device/proof orchestration.
```

Production risk: "Sensor Node", "firmware", "IoT", and "Freedom Node" are
overlapping names for related but different responsibilities. New work should
prefer "Sensor Node" for field firmware and "Freedom Node" for the farmer-owned
receiver/proof coordinator.

## Current Contracts / Proofs Locations

```text
packages/contract/src/*.compact
packages/contract/src/managed/<contract-name>/
packages/contract/src/deploy-*.ts
packages/contract/deployment.json
apps/freedom-node/proof-server/circuits/attestation.compact
packages/cli/
```

Contract source and Midnight-generated artifacts are now visually separated by
responsibility: `packages/contract/src/*.compact` is human-authored source,
`packages/contract/src/managed/<contract-name>/` is compiler output, and
`packages/contract/dist/managed/<contract-name>/` is the package output consumed
by apps. The remaining architectural question is whether
`apps/freedom-node/proof-server/circuits/attestation.compact` is a production
proof circuit or a demo/server-local artifact.

## Recommended Target Shape

This is the target direction, not the current structure:

```text
edgechain/
  apps/
    web/
    freedom-node/
      proof-server/
    ipfs-service/

  packages/
    protocols/
    fl/
    mars/
    contract/
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
