import ChartTooltip, { useChartTooltip } from "./ChartTooltip";

export interface BarRow {
  label: string;
  value: number;
  color: string;
  /** Shown at the end of the bar and in the tooltip. */
  display: string;
  sublabel?: string;
}

interface Props {
  rows: BarRow[];
  emptyMessage?: string;
}

/** Horizontal bars — one row per entity, labelled directly so color is never the only cue. */
export default function BarChartH({ rows, emptyMessage = "No data" }: Props) {
  const { tooltip, show, hide } = useChartTooltip();
  const max = Math.max(...rows.map((r) => r.value), 0);

  if (rows.length === 0 || max <= 0) {
    return <p className="text-xs text-muted py-6 text-center">{emptyMessage}</p>;
  }

  return (
    <div data-chart-root className="relative flex flex-col gap-3">
      {rows.map((row) => (
        <div key={row.label} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-xs text-white truncate">{row.label}</span>
            <span className="text-xs font-mono text-muted shrink-0">{row.display}</span>
          </div>
          <div
            className="h-2 w-full rounded-sm bg-[#1c1c1c] overflow-hidden"
            onMouseMove={(e) =>
              show(
                e,
                <div className="flex flex-col gap-0.5">
                  <span className="text-white">{row.label}</span>
                  <span className="text-muted font-mono">{row.display}</span>
                  {row.sublabel && <span className="text-muted">{row.sublabel}</span>}
                </div>
              )
            }
            onMouseLeave={hide}
          >
            <div
              className="h-full rounded-sm transition-all duration-300"
              style={{
                width: `${Math.max((row.value / max) * 100, row.value > 0 ? 2 : 0)}%`,
                background: row.color,
              }}
            />
          </div>
        </div>
      ))}
      <ChartTooltip tooltip={tooltip} />
    </div>
  );
}
