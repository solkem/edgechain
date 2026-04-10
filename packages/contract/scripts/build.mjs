import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, copyFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageDir = path.resolve(__dirname, '..');
const srcDir = path.join(packageDir, 'src');
const distDir = path.join(packageDir, 'dist');
const managedSrcDir = path.join(srcDir, 'managed');
const managedDistDir = path.join(distDir, 'managed');

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

rmSync(distDir, { recursive: true, force: true });

run('tsc', ['--project', 'tsconfig.build.json']);

mkdirSync(managedDistDir, { recursive: true });

for (const managedName of ['edgechain', 'arduino-iot']) {
  const sourcePath = path.join(managedSrcDir, managedName);
  if (!existsSync(sourcePath)) continue;

  const targetPath = path.join(managedDistDir, managedName);
  cpSync(sourcePath, targetPath, { recursive: true, force: true });
  mkdirSync(path.join(targetPath, 'keys'), { recursive: true });
  mkdirSync(path.join(targetPath, 'zkir'), { recursive: true });
}

for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
  if (entry.isFile() && entry.name.endsWith('.compact')) {
    copyFileSync(path.join(srcDir, entry.name), path.join(distDir, entry.name));
  }
}
