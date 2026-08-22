import type { Client, Session } from "../lib/types";
import {
  formatDurationShort,
  formatCurrency,
  earningsInWindow,
  sessionsToday,
  sessionsThisWeek,
  sessionsThisMonth,
  totalSeconds,
} from "../lib/utils";

interface Props {
  sessions: Session[];
  clients: Client[];
  activeDelta?: number;
  activeClientId?: number | null;
  /** When set, every tile counts only this client's time and earnings. */
  filterClientId?: number | null;
  /** Omitted while a session is running — the filter follows the running client then. */
  onClearFilter?: () => void;
}

export default function StatsBar({
  sessions,
  clients,
  activeDelta = 0,
  activeClientId,
  filterClientId = null,
  onClearFilter,
}: Props) {
  const filterClient = clients.find((c) => c.id === filterClientId) ?? null;

  const scopedSessions = filterClient
    ? sessions.filter((s) => s.client_id === filterClient.id)
    : sessions;
  const scopedClients = filterClient ? [filterClient] : clients;

  // The running session only counts toward the tiles when it belongs to the scope
  const liveDelta = !filterClient || activeClientId === filterClient.id ? activeDelta : 0;

  const todaySecs = sessionsToday(scopedSessions) + liveDelta;
  const weekSecs = sessionsThisWeek(scopedSessions) + liveDelta;
  const monthSecs = sessionsThisMonth(scopedSessions) + liveDelta;
  const allSecs = totalSeconds(scopedSessions) + liveDelta;

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay()); weekStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

  const hasRates = scopedClients.some((c) => c.hourly_rate != null && c.hourly_rate > 0);

  const activeLiveEarnings = (() => {
    if (!hasRates || activeClientId == null || liveDelta === 0) return 0;
    const rate = clients.find((c) => c.id === activeClientId)?.hourly_rate ?? 0;
    return (liveDelta / 3600) * rate;
  })();

  const todayEarnings = earningsInWindow(scopedSessions, scopedClients, today) + activeLiveEarnings;
  const weekEarnings = earningsInWindow(scopedSessions, scopedClients, weekStart) + activeLiveEarnings;
  const monthEarnings = earningsInWindow(scopedSessions, scopedClients, monthStart) + activeLiveEarnings;
  const allEarnings = earningsInWindow(scopedSessions, scopedClients, null) + activeLiveEarnings;

  const stats = [
    { label: "Today", secs: todaySecs, earnings: todayEarnings },
    { label: "This Week", secs: weekSecs, earnings: weekEarnings },
    { label: "This Month", secs: monthSecs, earnings: monthEarnings },
    { label: "All Time", secs: allSecs, earnings: allEarnings },
  ];

  return (
    <div className="flex flex-col gap-2">
      {/* Scope indicator */}
      <div className="flex items-center gap-2 h-5">
        {filterClient ? (
          <>
            <span className="text-xs text-muted">Showing</span>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{
                background: `${filterClient.color}22`,
                color: filterClient.color,
                border: `1px solid ${filterClient.color}44`,
              }}
            >
              {filterClient.name}
            </span>
            <span className="text-xs text-muted">only</span>
            {onClearFilter && (
              <button
                onClick={onClearFilter}
                className="text-xs text-muted hover:text-white transition-colors underline underline-offset-2 decoration-[#333]"
              >
                Show all
              </button>
            )}
          </>
        ) : (
          <span className="text-xs text-muted">All clients</span>
        )}
      </div>

      <div className="grid grid-cols-4 gap-3">
        {stats.map(({ label, secs, earnings }) => (
          <div
            key={label}
            className="bg-surface border border-border rounded-xl px-4 py-3 flex flex-col gap-1"
            style={filterClient ? { borderColor: `${filterClient.color}33` } : undefined}
          >
            <span className="text-xs text-muted uppercase tracking-wider">{label}</span>
            <span className="font-mono text-lg font-medium text-white">
              {secs > 0 ? formatDurationShort(secs) : "—"}
            </span>
            {hasRates && earnings > 0 && (
              <span className="font-mono text-sm font-medium text-active">
                {formatCurrency(earnings)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
