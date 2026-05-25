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
}

export default function StatsBar({ sessions, clients, activeDelta = 0, activeClientId }: Props) {
  const todaySecs = sessionsToday(sessions) + activeDelta;
  const weekSecs = sessionsThisWeek(sessions) + activeDelta;
  const monthSecs = sessionsThisMonth(sessions) + activeDelta;
  const allSecs = totalSeconds(sessions) + activeDelta;

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay()); weekStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

  const hasRates = clients.some((c) => c.hourly_rate != null && c.hourly_rate > 0);

  const activeLiveEarnings = (() => {
    if (!hasRates || activeClientId == null) return 0;
    const rate = clients.find((c) => c.id === activeClientId)?.hourly_rate ?? 0;
    return (activeDelta / 3600) * rate;
  })();

  const todayEarnings = earningsInWindow(sessions, clients, today) + activeLiveEarnings;
  const weekEarnings = earningsInWindow(sessions, clients, weekStart) + activeLiveEarnings;
  const monthEarnings = earningsInWindow(sessions, clients, monthStart) + activeLiveEarnings;
  const allEarnings = earningsInWindow(sessions, clients, null) + activeLiveEarnings;

  const stats = [
    { label: "Today", secs: todaySecs, earnings: todayEarnings },
    { label: "This Week", secs: weekSecs, earnings: weekEarnings },
    { label: "This Month", secs: monthSecs, earnings: monthEarnings },
    { label: "All Time", secs: allSecs, earnings: allEarnings },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {stats.map(({ label, secs, earnings }) => (
        <div
          key={label}
          className="bg-surface border border-border rounded-xl px-4 py-3 flex flex-col gap-1"
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
  );
}
