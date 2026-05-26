"""Attack perturbations over FL client updates."""

from __future__ import annotations

import numpy as np

from edgechain_lab.data.schemas import ClientUpdate, ScenarioName


def sign_flip(update: ClientUpdate, scale: float = 5.0) -> ClientUpdate:
    """Flip an update direction and scale it."""

    vector = -scale * np.asarray(update.update_vector, dtype=float)
    return update.model_copy(update={"update_vector": vector.tolist()})


def scale_attack(update: ClientUpdate, target_norm: float = 25.0) -> ClientUpdate:
    """Inflate an update norm while keeping direction."""

    vector = np.asarray(update.update_vector, dtype=float)
    norm = float(np.linalg.norm(vector))
    if norm == 0.0:
        attacked = np.ones_like(vector) * (target_norm / np.sqrt(vector.size))
    else:
        attacked = vector / norm * target_norm
    return update.model_copy(update={"update_vector": attacked.tolist()})


def invalid_attestation(update: ClientUpdate) -> ClientUpdate:
    """Mark a contribution as failing hardware attestation."""

    return update.model_copy(
        update={
            "scenario": ScenarioName.INVALID_ATTESTATION,
            "has_valid_attestation": False,
            "metadata": {**update.metadata, "attack": "invalid_attestation"},
        }
    )


def label_flip_equivalent(update: ClientUpdate) -> ClientUpdate:
    """Record a label-flip-equivalent attack in metadata.

    The MVP attack suite operates on updates, so this marks the update as label-flipped and
    reverses its direction as a proxy for corrupt local training.
    """

    attacked = sign_flip(update, scale=1.0)
    return attacked.model_copy(
        update={"metadata": {**update.metadata, "attack": "label_flip_equivalent"}}
    )


def physical_impossibility(update: ClientUpdate) -> ClientUpdate:
    """Create a large implausible update proxying physically impossible readings."""

    return scale_attack(
        update.model_copy(
            update={
                "scenario": ScenarioName.SINGLE_ADVERSARY,
                "metadata": {**update.metadata, "attack": "physical_impossibility"},
            }
        ),
        target_norm=40.0,
    )


def colluding_direction(
    update: ClientUpdate,
    direction: np.ndarray,
    scale: float = 18.0,
) -> ClientUpdate:
    """Force one update onto a shared colluding direction."""

    norm = float(np.linalg.norm(direction))
    if norm == 0.0:
        raise ValueError("colluding direction must be non-zero")
    attacked = direction / norm * scale
    return update.model_copy(
        update={
            "scenario": ScenarioName.COLLUDING_MAJORITY,
            "update_vector": attacked.tolist(),
            "metadata": {**update.metadata, "attack": "colluding_majority"},
        }
    )
