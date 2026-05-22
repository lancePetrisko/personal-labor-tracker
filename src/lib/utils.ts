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
