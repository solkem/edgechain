"""Small PyTorch model for synthetic sensor anomaly detection."""

from __future__ import annotations

from typing import cast

import torch


class SensorAnomalyModel(torch.nn.Module):
    """Tiny MLP used to produce FL update vectors."""

    def __init__(self, input_dim: int = 7, hidden_dim: int = 32, output_dim: int = 4) -> None:
        super().__init__()
        self.net = torch.nn.Sequential(
            torch.nn.Linear(input_dim, hidden_dim),
            torch.nn.ReLU(),
            torch.nn.Linear(hidden_dim, 16),
            torch.nn.ReLU(),
            torch.nn.Linear(16, output_dim),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return cast(torch.Tensor, self.net(x))


def clone_model(model: torch.nn.Module) -> torch.nn.Module:
    """Clone a model via its state dict."""

    cloned = SensorAnomalyModel()
    cloned.load_state_dict(model.state_dict())
    return cloned
