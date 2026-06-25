import * as fs from 'fs';
import * as path from 'path';
import { Pool, PoolClient } from 'pg';

const MIGRATIONS_PATH = path.join(__dirname, 'migrations');
const MIGRATION_FILE_PATTERN = /^(\d{3})_[a-z0-9_]+\.sql$/;

export async function runDatabaseMigrations(db: Pool): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      applied_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT)
    )
  `);

  if (!fs.existsSync(MIGRATIONS_PATH)) {
    throw new Error(`Database migrations directory not found: ${MIGRATIONS_PATH}`);
  }

  const files = fs.readdirSync(MIGRATIONS_PATH)
    .filter((filename) => MIGRATION_FILE_PATTERN.test(filename))
    .sort();

  for (const filename of files) {
    const version = filename.slice(0, 3);
    const existing = await db.query(
      'SELECT 1 FROM schema_migrations WHERE version = $1',
      [version]
    );
    if ((existing.rowCount ?? 0) > 0) {
      continue;
    }

    const client = await db.connect();
    try {
      await applyMigration(client, version, filename);
      console.log(`Applied database migration ${filename}`);
    } finally {
      client.release();
    }
  }
}

async function applyMigration(
  client: PoolClient,
  version: string,
  filename: string
): Promise<void> {
  const sql = fs.readFileSync(path.join(MIGRATIONS_PATH, filename), 'utf-8');
  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query(
      'INSERT INTO schema_migrations (version, filename) VALUES ($1, $2)',
      [version, filename]
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}
