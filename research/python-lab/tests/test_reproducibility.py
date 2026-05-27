import random

import numpy as np

from edgechain_lab.reproducibility import set_all_seeds


def test_set_all_seeds_repeats_random_streams() -> None:
    set_all_seeds(123)
    first = (random.random(), np.random.random())

    set_all_seeds(123)
    second = (random.random(), np.random.random())

    assert first == second
