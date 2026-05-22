import { useEffect, useState } from "react";
import { formatDurationTimer, secondsSince } from "../lib/utils";

interface Props {
  startedAt: string;
  onTick?: (seconds: number) => void;
}

export default function LiveTimer({ startedAt, onTick }: Props) {
  const [elapsed, setElapsed] = useState(() => secondsSince(startedAt));

  useEffect(() => {
    setElapsed(secondsSince(startedAt));
    const interval = setInterval(() => {
      const s = secondsSince(startedAt);
      setElapsed(s);
      onTick?.(s);
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt, onTick]);

  return (
    <span className="font-mono text-5xl font-medium tracking-widest text-white tabular-nums">
      {formatDurationTimer(elapsed)}
    </span>
  );
}
