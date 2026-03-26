import fs from 'node:fs/promises';
import path from 'node:path';

const DATA_DIR = path.resolve(process.cwd(), 'data');

const FILES = {
  events: path.join(DATA_DIR, 'events.json'),
  sessions: path.join(DATA_DIR, 'sessions.json'),
  anchors: path.join(DATA_DIR, 'anchors.json'),
  operations: path.join(DATA_DIR, 'operations-log.json'),
};

const INITIAL = {
  events: [],
  sessions: [],
  anchors: [],
  operations: { entries: [] },
};

async function ensureFile(filePath, initialContent) {
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, JSON.stringify(initialContent, null, 2));
  }
}

export async function ensureDataStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await Promise.all([
    ensureFile(FILES.events, INITIAL.events),
    ensureFile(FILES.sessions, INITIAL.sessions),
    ensureFile(FILES.anchors, INITIAL.anchors),
    ensureFile(FILES.operations, INITIAL.operations),
  ]);
}

async function readJson(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, JSON.stringify(value, null, 2));
}

export async function readEvents() {
  return readJson(FILES.events, INITIAL.events);
}

export async function writeEvents(events) {
  return writeJson(FILES.events, events);
}

export async function readSessions() {
  return readJson(FILES.sessions, INITIAL.sessions);
}

export async function writeSessions(sessions) {
  return writeJson(FILES.sessions, sessions);
}

export async function readAnchors() {
  return readJson(FILES.anchors, INITIAL.anchors);
}

export async function writeAnchors(anchors) {
  return writeJson(FILES.anchors, anchors);
}

export async function appendOperation(entry) {
  const operations = await readJson(FILES.operations, INITIAL.operations);
  operations.entries.push({
    ...entry,
    logged_at_iso: new Date().toISOString(),
  });

  if (operations.entries.length > 3000) {
    operations.entries = operations.entries.slice(-2000);
  }

  await writeJson(FILES.operations, operations);
}
