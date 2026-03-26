import { sha256Hex } from './crypto.js';

function normalizeLeaf(value) {
  return String(value || '').toLowerCase().replace(/^0x/, '');
}

function hashPair(left, right) {
  return sha256Hex(`${left}${right}`);
}

export function buildMerkleTree(rawLeaves) {
  const leaves = rawLeaves.map(normalizeLeaf);

  if (leaves.length === 0) {
    const root = sha256Hex('edgechain:empty-merkle-root');
    return {
      root,
      leafCount: 0,
      getProof: () => [],
    };
  }

  const layers = [leaves.slice()];

  while (layers[layers.length - 1].length > 1) {
    const currentLayer = layers[layers.length - 1];
    const nextLayer = [];

    for (let i = 0; i < currentLayer.length; i += 2) {
      const left = currentLayer[i];
      const right = currentLayer[i + 1] || currentLayer[i];
      nextLayer.push(hashPair(left, right));
    }

    layers.push(nextLayer);
  }

  function getProof(index) {
    let cursor = index;
    const proof = [];

    for (let layerIdx = 0; layerIdx < layers.length - 1; layerIdx += 1) {
      const layer = layers[layerIdx];
      const isRightNode = cursor % 2 === 1;
      const siblingIndex = isRightNode ? cursor - 1 : cursor + 1;
      const siblingHash = layer[siblingIndex] || layer[cursor];

      proof.push({
        position: isRightNode ? 'left' : 'right',
        hash: siblingHash,
      });

      cursor = Math.floor(cursor / 2);
    }

    return proof;
  }

  return {
    root: layers[layers.length - 1][0],
    leafCount: leaves.length,
    getProof,
  };
}
