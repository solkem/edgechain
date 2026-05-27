"""Reproducibility helpers."""

import random

import numpy as np


def set_all_seeds(seed: int) -> None:
    """Seed Python, NumPy, and PyTorch RNGs when PyTorch is installed."""

    random.seed(seed)
    np.random.seed(seed)
    try:
        import torch
    except ModuleNotFoundError:
        return

    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False
