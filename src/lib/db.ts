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

export async function updateSessionNotes(id: number, notes: string): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE sessions SET notes = $1 WHERE id = $2", [notes || null, id]);
}
