import { clamp, cosineSimilarity, vectorMean } from './math';

export function spatialJuryScore(
  siteId: string,
  updatesBySite: Record<string, number[]>,
  clusterBySite: Record<string, string>,
): number {
  const clusterId = clusterBySite[siteId];
  const peers = Object.entries(updatesBySite)
    .filter(([peerSite]) => peerSite !== siteId && clusterBySite[peerSite] === clusterId)
    .map(([, update]) => update);

  if (peers.length === 0) {
    return 0.5;
  }

  const consensus = vectorMean(peers);
  return clamp(Math.max(0, cosineSimilarity(updatesBySite[siteId], consensus)));
}
