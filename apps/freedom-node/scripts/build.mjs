import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const tsc = require.resolve('typescript/bin/tsc');
const result = spawnSync(process.execPath, [tsc], {
  cwd: root,
  stdio: 'inherit',
});
if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const distDatabase = resolve(root, 'dist', 'database');
mkdirSync(distDatabase, { recursive: true });
cpSync(
  resolve(root, 'src', 'database', 'schema.sql'),
  resolve(distDatabase, 'schema.sql')
);
const distMigrations = resolve(distDatabase, 'migrations');
rmSync(distMigrations, { recursive: true, force: true });
cpSync(
  resolve(root, 'src', 'database', 'migrations'),
  distMigrations,
  { recursive: true }
);
