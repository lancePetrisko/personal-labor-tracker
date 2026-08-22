export function formatDurationTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function formatDurationShort(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  if (m > 0) return `${m}m`;
  return `${seconds}s`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function secondsSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
}

export function totalSeconds(sessions: { duration_seconds: number | null }[]): number {
  return sessions.reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0);
}

export function sessionsToday(sessions: { started_at: string; duration_seconds: number | null }[]): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return totalSeconds(sessions.filter((s) => new Date(s.started_at) >= today));
}

export function sessionsThisWeek(sessions: { started_at: string; duration_seconds: number | null }[]): number {
  const start = new Date();
  start.setDate(start.getDate() - start.getDay());
  start.setHours(0, 0, 0, 0);
  return totalSeconds(sessions.filter((s) => new Date(s.started_at) >= start));
}

export function sessionsThisMonth(sessions: { started_at: string; duration_seconds: number | null }[]): number {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return totalSeconds(sessions.filter((s) => new Date(s.started_at) >= start));
}

export function formatCurrency(amount: number): string {
  return "$" + amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function earningsInWindow(
  sessions: { client_id: number | null; duration_seconds: number | null; started_at: string }[],
  clients: { id: number; hourly_rate: number | null }[],
  since: Date | null
): number {
  const rateMap = new Map(clients.map((c) => [c.id, c.hourly_rate ?? 0]));
  const filtered = since ? sessions.filter((s) => new Date(s.started_at) >= since) : sessions;
  return filtered.reduce((sum, s) => {
    const rate = s.client_id != null ? (rateMap.get(s.client_id) ?? 0) : 0;
    return sum + ((s.duration_seconds ?? 0) / 3600) * rate;
  }, 0);
}

export const CLIENT_COLORS = [
  "#6366f1",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#f97316",
  "#14b8a6",
];

/** ISO string -> value for an <input type="datetime-local"> in the user's local timezone. */
export function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** <input type="datetime-local"> value (local time) -> ISO string. */
export function fromLocalInputValue(value: string): string {
  return new Date(value).toISOString();
}

export function splitDuration(seconds: number): { h: number; m: number; s: number } {
  return {
    h: Math.floor(seconds / 3600),
    m: Math.floor((seconds % 3600) / 60),
    s: seconds % 60,
  };
}
