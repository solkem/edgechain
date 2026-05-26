"""Physical plausibility scoring for MARS."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from edgechain_lab.fl.metrics import cosine_similarity


@dataclass(frozen=True)
class PhysicalBounds:
    """Odzi-like physical bounds used to generate reference update directions."""

    soil_temp_c: tuple[float, float] = (8.0, 42.0)
    soil_moisture: tuple[float, float] = (0.05, 0.95)
    air_temp_c: tuple[float, float] = (12.0, 38.0)
    humidity: tuple[float, float] = (0.0, 100.0)
    pressure_hpa: tuple[float, float] = (895.0, 925.0)
    lux: tuple[float, float] = (0.0, 110_000.0)


def physical_plausibility_score(
    update_vector: np.ndarray,
    bounds: PhysicalBounds,
    seed: int,
    n_virtual_samples: int = 64,
) -> float:
    """Score whether an update is directionally compatible with plausible bounds.

    This function intentionally accepts no simulator labels, failure codes, or attack metadata.
    """

    if update_vector.size == 0:
        return 0.0

    references = _virtual_reference_updates(
        dimension=update_vector.size,
        bounds=bounds,
        seed=seed,
        n_virtual_samples=n_virtual_samples,
    )
    center = np.mean(references, axis=0)
    direction_score = max(0.0, cosine_similarity(update_vector, center))

    reference_norms = np.linalg.norm(references, axis=1)
    update_norm = float(np.linalg.norm(update_vector))
    mean_norm = float(np.mean(reference_norms))
    std_norm = float(np.std(reference_norms))
    if std_norm == 0.0:
        norm_score = 1.0
    else:
        z_score = abs(update_norm - mean_norm) / std_norm
        norm_score = float(np.clip(1.0 - max(0.0, z_score - 2.0) / 2.0, 0.0, 1.0))

    return float(np.clip(0.7 * direction_score + 0.3 * norm_score, 0.0, 1.0))


def _virtual_reference_updates(
    dimension: int,
    bounds: PhysicalBounds,
    seed: int,
    n_virtual_samples: int,
) -> np.ndarray:
    rng = np.random.default_rng(seed)
    ranges = np.array(
        [
            bounds.soil_temp_c[1] - bounds.soil_temp_c[0],
            bounds.soil_moisture[1] - bounds.soil_moisture[0],
            bounds.air_temp_c[1] - bounds.air_temp_c[0],
            bounds.humidity[1] - bounds.humidity[0],
            bounds.pressure_hpa[1] - bounds.pressure_hpa[0],
            bounds.lux[1] - bounds.lux[0],
        ],
        dtype=float,
    )
    normalized_ranges = ranges / np.linalg.norm(ranges)
    base = np.resize(normalized_ranges, dimension)
    references = []
    for _ in range(n_virtual_samples):
        noise = rng.normal(0.0, 0.05, size=dimension)
        references.append(base + noise)
    return np.asarray(references, dtype=float)

