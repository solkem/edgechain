import numpy as np

from edgechain_lab.data.schemas import ScenarioName, SiteType
from edgechain_lab.data.synthetic_odzi import build_default_sites, generate_readings


def test_default_sites_have_one_hardware_and_six_whatsapp_sites() -> None:
    sites = build_default_sites(seed=42)
    site_types = [site.site_type for site in sites]

    assert len(sites) == 7
    assert site_types.count(SiteType.HARDWARE) == 1
    assert site_types.count(SiteType.WHATSAPP) == 6


def test_same_seed_produces_identical_readings() -> None:
    sites = build_default_sites(seed=42)
    first = generate_readings(sites, ScenarioName.HONEST_BASELINE, n_rounds=12, seed=99)
    second = generate_readings(sites, ScenarioName.HONEST_BASELINE, n_rounds=12, seed=99)

    assert first.equals(second)


def test_different_seed_changes_readings() -> None:
    sites = build_default_sites(seed=42)
    first = generate_readings(sites, ScenarioName.HONEST_BASELINE, n_rounds=12, seed=99)
    second = generate_readings(sites, ScenarioName.HONEST_BASELINE, n_rounds=12, seed=100)

    assert not first.equals(second)


def test_honest_baseline_observed_readings_stay_inside_bounds() -> None:
    sites = build_default_sites(seed=42)
    readings = generate_readings(sites, ScenarioName.HONEST_BASELINE, n_rounds=24, seed=42)
    observed = readings[readings["is_observed"]]

    assert observed["soil_temp_c"].between(8.0, 42.0).all()
    assert observed["soil_moisture"].between(0.05, 0.95).all()
    assert observed["air_temp_c"].between(12.0, 38.0).all()
    assert observed["pressure_hpa"].between(895.0, 925.0).all()


def test_ds18b20_missing_pullup_failure_emits_minus_127() -> None:
    sites = build_default_sites(seed=42)
    readings = generate_readings(sites, ScenarioName.SENSOR_FAILURE, n_rounds=24, seed=42)
    failures = readings[readings["failure_code"] == "ds18b20_missing_pullup"]

    assert not failures.empty
    assert (failures["soil_temp_c"] == -127.0).all()


def test_whatsapp_sites_have_greater_missingness_than_hardware_site() -> None:
    sites = build_default_sites(seed=42)
    readings = generate_readings(sites, ScenarioName.HONEST_BASELINE, n_rounds=200, seed=42)
    missingness = 1.0 - readings.groupby("site_type")["is_observed"].mean()

    assert missingness["whatsapp"] > missingness["hardware"]


def test_spatial_correlation_decays_with_distance_on_average() -> None:
    sites = build_default_sites(seed=42)
    site_by_id = {site.site_id: site for site in sites}
    readings = generate_readings(sites, ScenarioName.HONEST_BASELINE, n_rounds=96, seed=7)
    pivot = readings.pivot(index="round_id", columns="site_id", values="air_temp_c")
    corr = pivot.corr()

    near_values = []
    far_values = []
    for left in sites:
        for right in sites:
            if left.site_id >= right.site_id:
                continue
            distance = np.hypot(left.x_km - right.x_km, left.y_km - right.y_km)
            value = corr.loc[left.site_id, right.site_id]
            if np.isnan(value):
                continue
            if distance < 1.0:
                near_values.append(value)
            elif distance > 1.5:
                far_values.append(value)

    assert np.mean(near_values) > np.mean(far_values)
    assert site_by_id["site-001"].site_type == SiteType.HARDWARE
