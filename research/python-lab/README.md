# EdgeChain AI Oversight Lab

These experiments use synthetic or public data only. They do not expose farmer identities, private keys, deployment secrets, raw pilot readings, wallet data, real GPS coordinates, or production EdgeChain internals.

EdgeChain AI Oversight Lab is a reproducible research harness for privacy-preserving federated learning experiments in an Odzi-like smallholder agriculture setting. The lab supports synthetic microclimate generation, MARS contribution scoring, adversarial FL scenarios, and evaluated LLM oversight.

This lab is separate from the applied AI Farm Manager pilot. The farmer pilot helps farmers record observations and receive practical guidance. This lab asks a narrower safety question: when EdgeChain intentionally hides raw farm data for privacy, can the system still detect suspicious or low-quality federated-learning contributions well enough to support fair rewards and human oversight?

## Research framing

EdgeChain is a farmer-first privacy system whose architecture creates a concrete empirical problem in oversight: how to score, supervise, and reward contributors when the raw evidence is intentionally hidden.

The lab tests that problem in three layers:

```text
EdgeChain product:
  FL + ZK + rewards

MARS:
  scores FL contributions and determines reward weighting

AI Oversight Lab:
  tests whether MARS and FL rewards behave safely

LLM Oversight:
  tests whether an LLM can help audit ambiguous MARS failures
```

Reward values in this lab are abstract accounting units for simulation and fairness analysis. They are not DUST or tDUST. DUST/tDUST are transaction-execution resources, not farmer compensation. A production reward layer should use a separate settlement or redemption instrument such as NIGHT, a stablecoin, cooperative credits, or mobile money.

## What is implemented

- Synthetic Odzi-like weather and farm-condition generation.
- PyTorch federated-learning update simulation.
- MARS contribution scoring and reward-allocation experiments.
- Adversarial scenarios for harmful, noisy, or suspicious participant behavior.
- Baseline aggregation comparisons.
- Privacy-safe oversight reports that expose enough information for audit without revealing hidden participant data.
- Heuristic oversight and LLM oversight dry-runs over the same visible reports.
- Pytest, Ruff, and MyPy validation targets.

## What is not claimed

- The lab does not train on real pilot farmer data.
- The lab does not reveal or process wallet credentials, private keys, real GPS coordinates, or production secrets.
- The LLM oversight path is not an autonomous decision-maker. It is an audit aid for ambiguous cases.
- The default LLM run is a dry-run. Live provider calls require explicit configuration and should be treated as an experiment.
- Lab reward values are simulation units only; they are not on-chain farmer payments.

## Quick start

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

The oversight experiment writes privacy-separated artifacts:

- `evals/oversight_cases_private.jsonl` contains full synthetic cases for local evaluation.
- `evals/oversight_cases_visible.jsonl` contains the privacy-safe visible reports given to monitors.
- `reports/llm_oversight/results.csv` contains heuristic and LLM/dry-run labels.
- `reports/llm_oversight/summary.md` summarizes accuracy and case metadata.

## LLM oversight modes

The LLM oversight pipeline compares a fixed heuristic monitor with an LLM-style monitor over the same visible reports.

By default, `edgechain_lab.experiments.llm_oversight` uses dry-run behavior so the experiment is reproducible without network access or API keys. Live Anthropic calls are opt-in through the experiment code path and environment setup. This keeps the default lab safe for reviewers while preserving a path for real LLM oversight experiments.

## Evaluation signals

The current evaluator reports:

- ground-truth scenario label,
- heuristic label and correctness,
- LLM/dry-run label and correctness,
- LLM/dry-run confidence.

Those outputs are intentionally simple and auditable. Future work can extend the same harness with precision/recall by attack type, recall at fixed false-positive rate, calibration curves, cost/latency telemetry, and regression gates for new monitor prompts.

## Current status

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
