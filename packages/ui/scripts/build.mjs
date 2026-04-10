import { cpSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageDir = path.resolve(__dirname, '..');
const contractManagedDir = path.resolve(packageDir, '../contract/dist/managed/edgechain');
const distDir = path.join(packageDir, 'dist');

const run = (command, args) => {
  const result = spawnSync(command, args, {
    cwd: packageDir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

run('tsc', []);
run('vite', ['build', '--mode', 'testnet']);

for (const directoryName of ['keys', 'zkir']) {
  const sourcePath = path.join(contractManagedDir, directoryName);
  const targetPath = path.join(distDir, directoryName);

  if (existsSync(sourcePath)) {
    cpSync(sourcePath, targetPath, { recursive: true, force: true });
  } else {
    mkdirSync(targetPath, { recursive: true });
  }
}
