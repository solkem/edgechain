# EdgeChain Codebase Status

This file is a reviewer-facing map of what the repository currently does, what is simulated, and what should not be over-claimed.

EdgeChain has three related but separate layers:

| Layer | Purpose | Where to look |
|-------|---------|---------------|
| Core protocol / infrastructure | Privacy-preserving device attestations, MARS contribution scoring, Midnight contracts, firmware scaffolding, Freedom Node services, and reward-eligibility direction. | `packages/`, `packages/contract/`, `apps/freedom-node/`, `firmware/`, `ARCHITECTURE.md` |
| AI Oversight Lab | Reproducible synthetic experiments for adversarial federated learning, MARS scoring, and privacy-safe LLM oversight of ambiguous contribution-quality failures. | `research/python-lab/` |
| Applied farmer pilot | Farmer-facing AI Farm Manager, Virtual Ndani Kit manual observations, coordinator administration, timeline/reports, monitoring, and no-wallet pilot flow. | `apps/freedom-node/src/ai-farm-manager/`, `apps/web/src/`, `docs/` |

## Implemented and runnable

- MARS scoring package and TypeScript tests.
- Python AI Oversight Lab with synthetic Odzi-like microclimate generation, FL contribution scoring, adversarial attack scenarios, baseline aggregation comparison, heuristic oversight, and LLM oversight dry-run evaluation.
- Freedom Node backend routes for the farmer pilot, including farmer/coordinator authentication, AI Farm Manager profiles, memories, check-ins, plans, outcomes, prompt telemetry, timeline, reports, monitoring, and evaluation exports.
- React pilot UI for farmer login, Virtual Ndani Kit manual readings, coordinator administration, AI Farm Manager onboarding, timeline/report views, and monitoring.
- Virtual Ndani Kit workflow for human-entered observations that demonstrates the future hardware data path without pretending those readings came from physical devices.
- Firmware and proof-server scaffolding for the physical Ndani Kit / Freedom Node architecture.
- Midnight Compact contract artifacts and testnet deployment metadata for prototype validation.

## Prototype, simulated, or intentionally constrained

- The Python lab uses synthetic and generated experiment data only. It does not use real pilot farmer data, real GPS coordinates, wallet data, private keys, or production secrets.
- LLM oversight is dry-run by default. Live Anthropic calls are opt-in and require an API key/environment configuration.
- Some browser and backend paths use demo data, mock IPFS CIDs, local browser storage, simulated contract calls, or feature-flagged proof flows to keep the prototype runnable.
- Phase A farmer pilot readings are manual observations. They are labelled as manual observations and should not be described as physical sensor measurements.
- The Virtual Ndani Kit is a training and adoption bridge. It shows how the physical Ndani Kit will automate readings later, but it is not the physical hardware.
- Current deployments are prototype/testnet deployments, not production farmer-payment infrastructure.

## Not claimed as complete

- Twenty physical Ndani Kit devices deployed across all pilot farms.
- A fully production-hardened end-to-end ZK proof pipeline across every live app flow.
- Production-grade anonymous reward settlement for all device contributions.
- A trained production agronomic model with validated disease, yield, or financial predictions.
- Fully decentralized farmer-owned nodes and data custody for every pilot participant.
- Safety certification for autonomous agronomic decision-making.

## Reproducible checks

From the repository root:

```bash
npm run test:mars --workspace @edgechain/freedom-node
npm run test:ai-farm-manager:evals --workspace @edgechain/freedom-node
```

For the Python AI Oversight Lab:

```bash
cd research/python-lab
uv sync
uv run pytest
uv run ruff check .
uv run mypy src
uv run python -m edgechain_lab.experiments.mars_baselines
uv run python -m edgechain_lab.experiments.llm_oversight
```

Generated Python lab artifacts under `data/`, `evals/`, and `reports/` are intentionally ignored by git and can be regenerated locally.

## Suggested reviewer reading order

1. `README.md` for the overall product and architecture.
2. This file for implementation status and prototype boundaries.
3. `research/python-lab/README.md` for the AI Oversight Lab.
4. `packages/mars/` for contribution scoring logic.
5. `apps/freedom-node/src/ai-farm-manager/` for the applied AI Farm Manager backend.
6. `docs/ai-farm-manager-personalization-spec.md` for the farmer-personalization design.
7. `ARCHITECTURE.md` for the production-domain target architecture and farmer-owned nodes principle.
