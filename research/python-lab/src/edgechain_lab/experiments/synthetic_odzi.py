"""Run the synthetic Odzi generator and write artifacts."""

from contextlib import suppress
from pathlib import Path

from edgechain_lab.data.schemas import ScenarioName
from edgechain_lab.data.synthetic_odzi import build_default_sites, generate_readings
from edgechain_lab.data.validation import missingness_by_site_type, sensor_summary
from edgechain_lab.reproducibility import set_all_seeds


def main() -> None:
    seed = 42
    set_all_seeds(seed)
    sites = build_default_sites(seed=seed)
    readings = generate_readings(
        sites=sites,
        scenario=ScenarioName.HONEST_BASELINE,
        n_rounds=48,
        seed=seed,
    )

    data_dir = Path("data")
    report_dir = Path("reports")
    data_dir.mkdir(exist_ok=True)
    report_dir.mkdir(exist_ok=True)

    readings.to_csv(data_dir / "synthetic_rounds.csv", index=False)
    with suppress(ImportError):
        readings.to_parquet(data_dir / "synthetic_rounds.parquet", index=False)

    report = [
        "# Synthetic Odzi Summary",
        "",
        "## Missingness By Site Type",
        "",
        "```text",
        missingness_by_site_type(readings).to_string(),
        "```",
        "",
        "## Sensor Summary",
        "",
        "```text",
        sensor_summary(readings).to_string(),
        "```",
        "",
    ]
    (report_dir / "synthetic_odzi_summary.md").write_text("\n".join(report), encoding="utf-8")


if __name__ == "__main__":
    main()
