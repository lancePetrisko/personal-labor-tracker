import type { Session } from "../lib/types";
import { formatDurationShort, sessionsToday, sessionsThisWeek, sessionsThisMonth, totalSeconds } from "../lib/utils";

interface Props {
  sessions: Session[];
  activeDelta?: number;
}

export default function StatsBar({ sessions, activeDelta = 0 }: Props) {
  const todaySecs = sessionsToday(sessions) + activeDelta;
  const weekSecs = sessionsThisWeek(sessions) + activeDelta;
  const monthSecs = sessionsThisMonth(sessions) + activeDelta;
  const allSecs = totalSeconds(sessions) + activeDelta;

  const stats = [
    { label: "Today", value: todaySecs },
    { label: "This Week", value: weekSecs },
    { label: "This Month", value: monthSecs },
    { label: "All Time", value: allSecs },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {stats.map(({ label, value }) => (
        <div
          key={label}
          className="bg-surface border border-border rounded-xl px-4 py-3 flex flex-col gap-1"
        >
          <span className="text-xs text-muted uppercase tracking-wider">{label}</span>
          <span className="font-mono text-lg font-medium text-white">
            {value > 0 ? formatDurationShort(value) : "—"}
          </span>
        </div>
      ))}
    </div>
  );
}
