"""Spatial jury scoring."""

from __future__ import annotations

import numpy as np

from edgechain_lab.fl.metrics import cosine_similarity


def spatial_jury_score(
    site_id: str,
    updates_by_site: dict[str, np.ndarray],
    cluster_by_site: dict[str, str],
) -> float:
    """Compare one site update to its cluster peer consensus."""

    cluster_id = cluster_by_site[site_id]
    peers = [
        update
        for peer_site, update in updates_by_site.items()
        if peer_site != site_id and cluster_by_site.get(peer_site) == cluster_id
    ]
    if not peers:
        return 0.5

    consensus = np.mean(peers, axis=0)
    score = max(0.0, cosine_similarity(updates_by_site[site_id], consensus))
    return float(np.clip(score, 0.0, 1.0))
