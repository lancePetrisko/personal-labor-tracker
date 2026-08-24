import Database from "@tauri-apps/plugin-sql";
import type { Client, Session, ActiveSession } from "./types";

let _db: Database | null = null;

async function getDb(): Promise<Database> {
  if (!_db) {
    _db = await Database.load("sqlite:labor.db");
    await initSchema(_db);
  }
  return _db;
}

async function initSchema(db: Database) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      hourly_rate REAL,
      color TEXT NOT NULL DEFAULT '#6366f1'
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      notes TEXT,
      duration_seconds INTEGER
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
}

export async function loadSettings(): Promise<Record<string, string>> {
  const db = await getDb();
  const rows = await db.select<{ key: string; value: string }[]>("SELECT key, value FROM settings");
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function saveSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    "INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [key, value]
  );
}

export async function loadClients(): Promise<Client[]> {
  const db = await getDb();
  return db.select<Client[]>("SELECT * FROM clients ORDER BY name ASC");
}

export async function addClient(name: string, hourly_rate: number | null, color: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    "INSERT INTO clients (name, hourly_rate, color) VALUES ($1, $2, $3)",
    [name, hourly_rate, color]
  );
}

export async function updateClient(id: number, name: string, hourly_rate: number | null, color: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE clients SET name = $1, hourly_rate = $2, color = $3 WHERE id = $4",
    [name, hourly_rate, color, id]
  );
}

export async function deleteClient(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM clients WHERE id = $1", [id]);
}

export async function loadSessions(): Promise<Session[]> {
  const db = await getDb();
  return db.select<Session[]>(`
    SELECT
      s.id, s.client_id, s.started_at, s.ended_at, s.notes, s.duration_seconds,
      c.name as client_name, c.color as client_color
    FROM sessions s
    LEFT JOIN clients c ON s.client_id = c.id
    WHERE s.ended_at IS NOT NULL
    ORDER BY s.started_at DESC
    LIMIT 100
  `);
}

/** Every finished session in a window — no LIMIT, for analytics. `null` means all time. */
export async function loadSessionsSince(sinceIso: string | null): Promise<Session[]> {
  const db = await getDb();
  const where = sinceIso ? "WHERE s.ended_at IS NOT NULL AND s.started_at >= $1" : "WHERE s.ended_at IS NOT NULL";
  return db.select<Session[]>(
    `SELECT
      s.id, s.client_id, s.started_at, s.ended_at, s.notes, s.duration_seconds,
      c.name as client_name, c.color as client_color
    FROM sessions s
    LEFT JOIN clients c ON s.client_id = c.id
    ${where}
    ORDER BY s.started_at ASC`,
    sinceIso ? [sinceIso] : []
  );
}

/**
 * Every finished session for one client inside a half-open window
 * `[sinceIso, untilIso)`. No LIMIT — a client report must be complete.
 */
export async function loadSessionsForClient(
  clientId: number,
  sinceIso: string,
  untilIso: string
): Promise<Session[]> {
  const db = await getDb();
  return db.select<Session[]>(
    `SELECT
      s.id, s.client_id, s.started_at, s.ended_at, s.notes, s.duration_seconds,
      c.name as client_name, c.color as client_color
    FROM sessions s
    LEFT JOIN clients c ON s.client_id = c.id
    WHERE s.client_id = $1
      AND s.ended_at IS NOT NULL
      AND s.started_at >= $2
      AND s.started_at < $3
    ORDER BY s.started_at ASC`,
    [clientId, sinceIso, untilIso]
  );
}

export async function getActiveSession(): Promise<ActiveSession | null> {
  const db = await getDb();
  const rows = await db.select<ActiveSession[]>(
    "SELECT id, client_id, started_at, COALESCE(notes, '') as notes FROM sessions WHERE ended_at IS NULL LIMIT 1"
  );
  return rows[0] ?? null;
}

export async function clockIn(client_id: number | null, notes: string): Promise<ActiveSession> {
  const db = await getDb();
  const started_at = new Date().toISOString();
  const result = await db.execute(
    "INSERT INTO sessions (client_id, started_at, notes) VALUES ($1, $2, $3)",
    [client_id, started_at, notes || null]
  );
  return { id: result.lastInsertId ?? 0, client_id, started_at, notes };
}

export async function clockOut(sessionId: number, notes: string): Promise<void> {
  const db = await getDb();
  const ended_at = new Date().toISOString();
  const row = await db.select<{ started_at: string }[]>(
    "SELECT started_at FROM sessions WHERE id = $1",
    [sessionId]
  );
  const duration_seconds = row[0]
    ? Math.round((Date.now() - new Date(row[0].started_at).getTime()) / 1000)
    : 0;
  await db.execute(
    "UPDATE sessions SET ended_at = $1, duration_seconds = $2, notes = $3 WHERE id = $4",
    [ended_at, duration_seconds, notes || null, sessionId]
  );
}

export async function deleteSession(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM sessions WHERE id = $1", [id]);
}

/** Total finished sessions — `loadSessions()` is capped at 100, so counts come from here. */
export async function countSessions(): Promise<number> {
  const db = await getDb();
  const rows = await db.select<{ n: number }[]>(
    "SELECT COUNT(*) as n FROM sessions WHERE ended_at IS NOT NULL"
  );
  return rows[0]?.n ?? 0;
}

/**
 * Wipes every finished session. A session that is still running (ended_at IS NULL)
 * is left alone so an in-progress clock-in survives. Returns rows removed.
 */
export async function deleteAllSessions(): Promise<number> {
  const db = await getDb();
  const result = await db.execute("DELETE FROM sessions WHERE ended_at IS NOT NULL");
  return result.rowsAffected ?? 0;
}

export async function updateSessionNotes(id: number, notes: string): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE sessions SET notes = $1 WHERE id = $2", [notes || null, id]);
}

export async function updateSession(
  id: number,
  client_id: number | null,
  started_at: string,
  ended_at: string,
  duration_seconds: number,
  notes: string
): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE sessions SET client_id = $1, started_at = $2, ended_at = $3, duration_seconds = $4, notes = $5 WHERE id = $6",
    [client_id, started_at, ended_at, duration_seconds, notes || null, id]
  );
}
