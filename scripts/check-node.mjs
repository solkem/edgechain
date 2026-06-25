#!/usr/bin/env node

const MINIMUM_NODE = [22, 17, 0];
const detected = process.versions.node.split('.').map(Number);

function isSupported() {
  for (let index = 0; index < MINIMUM_NODE.length; index += 1) {
    if (detected[index] > MINIMUM_NODE[index]) return true;
    if (detected[index] < MINIMUM_NODE[index]) return false;
  }
  return true;
}

if (!isSupported()) {
  console.error(
    `\n[node-check] Node.js ${process.versions.node} is unsupported. `
      + 'EdgeChain requires Node.js 22.17.0 or newer. '
      + 'Run your Node version manager in the repository root to use .nvmrc.\n'
  );
  process.exit(1);
}

console.log(`[node-check] Node.js ${process.versions.node} is supported.`);
