import { useEffect, useState } from "react";
import type { ActiveSession } from "../lib/types";
import { activeElapsed, formatDurationTimer } from "../lib/utils";

interface Props {
  session: ActiveSession;
  onTick?: (seconds: number) => void;
}

export default function LiveTimer({ session, onTick }: Props) {
  const [elapsed, setElapsed] = useState(() => activeElapsed(session));
  const paused = !!session.paused_at;

  useEffect(() => {
    setElapsed(activeElapsed(session));
    if (paused) return;
    const interval = setInterval(() => {
      const s = activeElapsed(session);
      setElapsed(s);
      onTick?.(s);
    }, 1000);
    return () => clearInterval(interval);
  }, [session, paused, onTick]);

  return (
    <span
      className={`font-mono text-5xl font-medium tracking-widest tabular-nums transition-colors ${
        paused ? "text-muted" : "text-white"
      }`}
    >
      {formatDurationTimer(elapsed)}
    </span>
  );
}
