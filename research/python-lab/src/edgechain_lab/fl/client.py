"""Client-side local training primitives."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import torch
from torch.utils.data import DataLoader

from edgechain_lab.data.schemas import ClientUpdate, ScenarioName
from edgechain_lab.fl.dataset import SensorDataset
from edgechain_lab.fl.model import clone_model


@dataclass(frozen=True)
class TrainingConfig:
    """Local client training configuration."""

    epochs: int = 2
    batch_size: int = 16
    learning_rate: float = 0.01


def train_client_model(
    global_model: torch.nn.Module,
    client_data: SensorDataset,
    config: TrainingConfig,
    *,
    round_id: int,
    site_id: str,
    scenario: ScenarioName,
    has_valid_attestation: bool = True,
) -> ClientUpdate:
    """Train one local model and return a flattened delta update."""

    local_model = clone_model(global_model)
    loader = DataLoader(client_data, batch_size=config.batch_size, shuffle=True)
    optimizer = torch.optim.Adam(local_model.parameters(), lr=config.learning_rate)
    loss_fn = torch.nn.CrossEntropyLoss()

    local_model.train()
    for _ in range(config.epochs):
        for features, labels in loader:
            optimizer.zero_grad()
            logits = local_model(features)
            loss = loss_fn(logits, labels)
            loss.backward()
            optimizer.step()

    update = flatten_model_delta(global_model, local_model)
    return ClientUpdate(
        round_id=round_id,
        site_id=site_id,
        scenario=scenario,
        update_vector=update.tolist(),
        dataset_size=len(client_data),
        has_valid_attestation=has_valid_attestation,
        true_label=_majority_label(client_data),
    )


def flatten_model_delta(global_model: torch.nn.Module, local_model: torch.nn.Module) -> np.ndarray:
    """Flatten local minus global parameters into one vector."""

    deltas: list[np.ndarray] = []
    for global_param, local_param in zip(
        global_model.parameters(), local_model.parameters(), strict=True
    ):
        delta = (local_param.detach() - global_param.detach()).cpu().numpy().reshape(-1)
        deltas.append(delta)
    return np.concatenate(deltas).astype(float)


def _majority_label(client_data: SensorDataset) -> str:
    labels = client_data.labels.detach().cpu().numpy()
    if labels.size == 0:
        return "unknown"
    values, counts = np.unique(labels, return_counts=True)
    label_id = int(values[np.argmax(counts)])
    from edgechain_lab.fl.dataset import ID_TO_LABEL

    return ID_TO_LABEL[label_id]
