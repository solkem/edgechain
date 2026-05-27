# EdgeChain Python Lab

These experiments use synthetic or public data only. They do not expose farmer identities, private keys, deployment secrets, raw pilot readings, wallet data, real GPS coordinates, or production EdgeChain internals.

EdgeChain Python Lab is a reproducible research harness for privacy-preserving federated learning experiments in an Odzi-like smallholder agriculture setting. The lab supports synthetic microclimate generation, MARS contribution scoring, adversarial FL scenarios, and evaluated LLM oversight.

## Research Framing

EdgeChain is a farmer-first privacy system whose architecture creates a concrete empirical problem in oversight: how to score, supervise, and reward contributors when the raw evidence is intentionally hidden.

The lab tests that problem in three layers:

```text
EdgeChain product:
  FL + ZK + rewards

MARS:
  scores FL contributions and determines reward weighting

Python Lab:
  tests whether MARS and FL rewards behave safely

LLM Oversight:
  tests whether an LLM can help audit ambiguous MARS failures
```

Reward values in this lab are abstract accounting units for simulation and fairness analysis. They are not DUST or tDUST. DUST/tDUST are transaction-execution resources, not farmer compensation. A production reward layer should use a separate settlement or redemption instrument such as NIGHT, a stablecoin, cooperative credits, or mobile money.

## Quick Start

```bash
uv sync
uv run pytest
uv run mypy src
uv run ruff check .
uv run python -m edgechain_lab.experiments.synthetic_odzi
```

If `uv` is unavailable, use a normal Python 3.12 virtual environment and install the project with the dev extra:

```bash
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -e ".[dev]"
```

## Experiments

```bash
uv run python -m edgechain_lab.experiments.synthetic_odzi
uv run python -m edgechain_lab.experiments.mars_baselines
uv run python -m edgechain_lab.experiments.llm_oversight
```

Generated `data/`, `evals/`, and `reports/` artifacts are ignored by git. Regenerate them locally when needed.

## Current Status

The MVP includes:

- synthetic Odzi microclimate generation
- PyTorch FL update simulation
- MARS scoring and reward allocation
- adversarial attack suite
- baseline aggregator comparison
- LLM oversight dry-run pipeline

Verification target:

```bash
uv run pytest
uv run ruff check .
uv run mypy src
```

At handoff, the local implementation passed:

```text
pytest: 43 passed
ruff: All checks passed
mypy: Success
```
