import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const tempDir = await mkdtemp(path.join(tmpdir(), 'edgechain-ui-inference-'));
const outputFile = path.join(tempDir, 'inference.test.cjs');

try {
  await build({
    entryPoints: [path.resolve('src/fl/inference.test.ts')],
    outfile: outputFile,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node20',
    sourcemap: 'inline',
    logLevel: 'silent',
  });

  await import(pathToFileURL(outputFile).href);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
