import type { Client, Session } from "./types";
import type { RangeKey } from "./settings";
import { totalSeconds } from "./utils";

export interface ClientTotals {
  id: number | null;
  name: string;
  color: string;
  rate: number | null;
  seconds: number;
  earnings: number;
  sessions: number;
  avgSeconds: number;
}

export interface Bucket {
  key: string;
  label: string;
  start: Date;
  seconds: number;
  earnings: number;
  /** Keyed by client id, or "none" for sessions with no client. */
  byClient: Record<string, { seconds: number; earnings: number }>;
}

export type Granularity = "day" | "week" | "month";

export const UNASSIGNED_COLOR = "#3f3f46";

export function rangeStart(key: RangeKey): Date | null {
  if (key === "all") return null;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (key === "7d") d.setDate(d.getDate() - 6);
  else if (key === "30d") d.setDate(d.getDate() - 29);
  else if (key === "90d") d.setDate(d.getDate() - 89);
  else if (key === "year") {
    d.setMonth(0);
    d.setDate(1);
  }
  return d;
}

function rateFor(clients: Client[], clientId: number | null): number {
  if (clientId == null) return 0;
  return clients.find((c) => c.id === clientId)?.hourly_rate ?? 0;
}

export function sessionEarnings(session: Session, clients: Client[]): number {
  return ((session.duration_seconds ?? 0) / 3600) * rateFor(clients, session.client_id);
}

export function blendedRate(earnings: number, seconds: number): number {
  return seconds > 0 ? earnings / (seconds / 3600) : 0;
}

/** Per-client totals, richest first. Sessions with no client fold into one "No client" row. */
export function earningsByClient(sessions: Session[], clients: Client[]): ClientTotals[] {
  const rows = new Map<string, ClientTotals>();

  for (const s of sessions) {
    const key = s.client_id == null ? "none" : String(s.client_id);
    const client = s.client_id != null ? clients.find((c) => c.id === s.client_id) : undefined;
    let row = rows.get(key);
    if (!row) {
      row = {
        id: s.client_id,
        name: client?.name ?? s.client_name ?? "No client",
        color: client?.color ?? s.client_color ?? UNASSIGNED_COLOR,
        rate: client?.hourly_rate ?? null,
        seconds: 0,
        earnings: 0,
        sessions: 0,
        avgSeconds: 0,
      };
      rows.set(key, row);
    }
    row.seconds += s.duration_seconds ?? 0;
    row.earnings += sessionEarnings(s, clients);
    row.sessions += 1;
  }

  const list = [...rows.values()];
  for (const row of list) row.avgSeconds = row.sessions > 0 ? Math.round(row.seconds / row.sessions) : 0;
  return list.sort((a, b) => b.earnings - a.earnings || b.seconds - a.seconds);
}

export function bucketGranularity(key: RangeKey, sessions: Session[]): Granularity {
  if (key === "7d" || key === "30d") return "day";
  if (key === "90d") return "week";
  if (key === "year") return "month";
  // All time — pick from the actual span of the data
  if (sessions.length === 0) return "month";
  const first = new Date(sessions[0].started_at).getTime();
  const last = new Date(sessions[sessions.length - 1].started_at).getTime();
  const days = (last - first) / 86_400_000;
  if (days <= 31) return "day";
  if (days <= 180) return "week";
  return "month";
}

function startOfBucket(date: Date, granularity: Granularity): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  if (granularity === "week") d.setDate(d.getDate() - d.getDay());
  if (granularity === "month") d.setDate(1);
  return d;
}

function advance(date: Date, granularity: Granularity): Date {
  const d = new Date(date);
  if (granularity === "day") d.setDate(d.getDate() + 1);
  if (granularity === "week") d.setDate(d.getDate() + 7);
  if (granularity === "month") d.setMonth(d.getMonth() + 1);
  return d;
}

function bucketLabel(date: Date, granularity: Granularity): string {
  if (granularity === "month") {
    return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Ordered buckets covering the whole range, including empty ones so gaps in the
 * work show up as gaps in the chart.
 */
export function bucketSeries(
  sessions: Session[],
  clients: Client[],
  granularity: Granularity,
  from: Date | null
): Bucket[] {
  if (sessions.length === 0) return [];

  const firstSession = startOfBucket(new Date(sessions[0].started_at), granularity);
  const start = from ? startOfBucket(from, granularity) : firstSession;
  const end = startOfBucket(new Date(), granularity);

  const buckets: Bucket[] = [];
  const index = new Map<string, Bucket>();
  for (let cursor = start; cursor <= end; cursor = advance(cursor, granularity)) {
    const bucket: Bucket = {
      key: cursor.toISOString(),
      label: bucketLabel(cursor, granularity),
      start: new Date(cursor),
      seconds: 0,
      earnings: 0,
      byClient: {},
    };
    buckets.push(bucket);
    index.set(bucket.key, bucket);
  }

  for (const s of sessions) {
    const bucket = index.get(startOfBucket(new Date(s.started_at), granularity).toISOString());
    if (!bucket) continue;
    const secs = s.duration_seconds ?? 0;
    const earned = sessionEarnings(s, clients);
    const key = s.client_id == null ? "none" : String(s.client_id);
    const slot = (bucket.byClient[key] ??= { seconds: 0, earnings: 0 });
    slot.seconds += secs;
    slot.earnings += earned;
    bucket.seconds += secs;
    bucket.earnings += earned;
  }

  return buckets;
}

/**
 * Seconds worked per weekday/hour cell. A session's time is spread across every
 * hour it actually spans, so an 11pm–1am session lights three cells.
 */
export function weekHourMatrix(sessions: Session[]): number[][] {
  const matrix: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0));

  for (const s of sessions) {
    let remaining = s.duration_seconds ?? 0;
    if (remaining <= 0) continue;
    const cursor = new Date(s.started_at);

    while (remaining > 0) {
      const nextHour = new Date(cursor);
      nextHour.setMinutes(0, 0, 0);
      nextHour.setHours(nextHour.getHours() + 1);
      const slice = Math.min(remaining, (nextHour.getTime() - cursor.getTime()) / 1000);
      matrix[cursor.getDay()][cursor.getHours()] += slice;
      remaining -= slice;
      cursor.setTime(nextHour.getTime());
    }
  }

  return matrix;
}

export interface LengthBucket {
  label: string;
  count: number;
}

export function sessionLengthBuckets(sessions: Session[]): LengthBucket[] {
  const edges = [
    { label: "<15m", max: 15 * 60 },
    { label: "15–30m", max: 30 * 60 },
    { label: "30m–1h", max: 3600 },
    { label: "1–2h", max: 2 * 3600 },
    { label: "2–4h", max: 4 * 3600 },
    { label: "4h+", max: Infinity },
  ];
  const counts = edges.map((e) => ({ label: e.label, count: 0 }));
  for (const s of sessions) {
    const secs = s.duration_seconds ?? 0;
    const i = edges.findIndex((e) => secs < e.max);
    counts[i === -1 ? edges.length - 1 : i].count += 1;
  }
  return counts;
}

export interface Records {
  bestDay: { date: Date; earnings: number; seconds: number } | null;
  longestSession: Session | null;
  streakDays: number;
  busiestClient: ClientTotals | null;
  /** Average clock-in time, in minutes after midnight. */
  avgStartMinutes: number | null;
}

export function computeRecords(sessions: Session[], clients: Client[]): Records {
  if (sessions.length === 0) {
    return { bestDay: null, longestSession: null, streakDays: 0, busiestClient: null, avgStartMinutes: null };
  }

  const days = new Map<string, { date: Date; earnings: number; seconds: number }>();
  for (const s of sessions) {
    const d = new Date(s.started_at);
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString();
    const day = days.get(key) ?? { date: d, earnings: 0, seconds: 0 };
    day.earnings += sessionEarnings(s, clients);
    day.seconds += s.duration_seconds ?? 0;
    days.set(key, day);
  }

  const bestDay = [...days.values()].sort(
    (a, b) => b.earnings - a.earnings || b.seconds - a.seconds
  )[0];

  const longestSession = sessions.reduce((best, s) =>
    (s.duration_seconds ?? 0) > (best.duration_seconds ?? 0) ? s : best
  );

  // Streak: consecutive days with work, counted back from today (or yesterday)
  let streakDays = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  if (!days.has(cursor.toISOString())) cursor.setDate(cursor.getDate() - 1);
  while (days.has(cursor.toISOString())) {
    streakDays += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const byClient = earningsByClient(sessions, clients);
  const busiestClient = [...byClient].sort((a, b) => b.seconds - a.seconds)[0] ?? null;

  const avgStartMinutes = Math.round(
    sessions.reduce((sum, s) => {
      const d = new Date(s.started_at);
      return sum + d.getHours() * 60 + d.getMinutes();
    }, 0) / sessions.length
  );

  return { bestDay, longestSession, streakDays, busiestClient, avgStartMinutes };
}

export function summarize(sessions: Session[], clients: Client[]) {
  const seconds = totalSeconds(sessions);
  const earnings = sessions.reduce((sum, s) => sum + sessionEarnings(s, clients), 0);
  return { seconds, earnings, count: sessions.length, rate: blendedRate(earnings, seconds) };
}

export function formatClockMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${m.toString().padStart(2, "0")} ${suffix}`;
}
