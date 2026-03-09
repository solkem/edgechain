#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const MIN_COMPACTC = "0.28.0";

function compareSemver(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);

  for (let i = 0; i < 3; i += 1) {
    if (pa[i] > pb[i]) return 1;
    if (pa[i] < pb[i]) return -1;
  }

  return 0;
}

function extractVersion(text) {
  const match = text.match(/(\d+)\.(\d+)\.(\d+)/);
  return match ? `${match[1]}.${match[2]}.${match[3]}` : null;
}

function fail(message) {
  console.error(`\n[toolchain-check] ${message}\n`);
  process.exit(1);
}

const result = spawnSync("compactc", ["--version"], { encoding: "utf8" });

if (result.error) {
  fail(
    `compactc is not available on PATH. Install CompactC >= ${MIN_COMPACTC} before running this command.`
  );
}

const output = `${result.stdout || ""}\n${result.stderr || ""}`.trim();
const detected = extractVersion(output);

if (!detected) {
  fail(`Unable to parse compactc version from output: "${output}"`);
}

if (compareSemver(detected, MIN_COMPACTC) < 0) {
  fail(
    `Detected compactc ${detected}, but CompactC >= ${MIN_COMPACTC} is required for PreProd deployment readiness.`
  );
}

console.log(`[toolchain-check] compactc ${detected} satisfies minimum ${MIN_COMPACTC}.`);
