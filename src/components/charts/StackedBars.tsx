import ChartTooltip, { useChartTooltip, LegendRow } from "./ChartTooltip";
import type { Bucket } from "../../lib/analytics";

export interface SeriesMeta {
  key: string;
  name: string;
  color: string;
}

interface Props {
  buckets: Bucket[];
  series: SeriesMeta[];
  metric: "earnings" | "seconds";
  formatValue: (value: number) => string;
}

const HEIGHT = 180;

/** Vertical stacked bars, one column per time bucket. Single value axis. */
export default function StackedBars({ buckets, series, metric, formatValue }: Props) {
  const { tooltip, show, hide } = useChartTooltip();

  const max = Math.max(...buckets.map((b) => b[metric]), 0);
  if (buckets.length === 0 || max <= 0) {
    return <p className="text-xs text-muted py-10 text-center">No sessions in this range</p>;
  }

  // Label roughly six columns so ticks never collide
  const labelEvery = Math.max(1, Math.ceil(buckets.length / 6));

  return (
    <div data-chart-root className="relative flex flex-col gap-3">
      <div className="flex gap-3">
        {/* Value axis */}
        <div
          className="flex flex-col justify-between text-[10px] text-[#444] font-mono text-right shrink-0"
          style={{ height: HEIGHT }}
        >
          <span>{formatValue(max)}</span>
          <span>{formatValue(max / 2)}</span>
          <span>0</span>
        </div>

        <div className="flex-1 min-w-0">
          <div
            className="flex items-end gap-[2px] border-b border-border"
            style={{ height: HEIGHT }}
          >
            {buckets.map((bucket) => {
              const value = bucket[metric];
              const contributions = series
                .map((s) => ({ ...s, value: bucket.byClient[s.key]?.[metric] ?? 0 }))
                .filter((s) => s.value > 0);

              return (
                <div
                  key={bucket.key}
                  className="flex-1 min-w-0 h-full flex flex-col justify-end gap-[2px] group"
                  onMouseMove={(e) =>
                    show(
                      e,
                      <div className="flex flex-col gap-1 min-w-[140px]">
                        <span className="text-white">{bucket.label}</span>
                        {contributions.length === 0 ? (
                          <span className="text-muted">No work</span>
                        ) : (
                          contributions.map((c) => (
                            <LegendRow
                              key={c.key}
                              color={c.color}
                              label={c.name}
                              value={formatValue(c.value)}
                            />
                          ))
                        )}
                        <span className="text-muted border-t border-border mt-1 pt-1 flex justify-between gap-3">
                          Total <span className="text-white font-mono">{formatValue(value)}</span>
                        </span>
                      </div>
                    )
                  }
                  onMouseLeave={hide}
                >
                  {contributions.map((c, i) => (
                    <div
                      key={c.key}
                      className={`w-full transition-opacity group-hover:opacity-90 ${
                        i === 0 ? "rounded-t-[4px]" : ""
                      }`}
                      style={{
                        height: `${(c.value / max) * 100}%`,
                        background: c.color,
                        minHeight: 2,
                      }}
                    />
                  ))}
                </div>
              );
            })}
          </div>

          {/* Time axis */}
          <div className="flex gap-[2px] mt-1.5">
            {buckets.map((bucket, i) => (
              <span
                key={bucket.key}
                className="flex-1 min-w-0 text-[10px] text-[#444] text-center truncate"
              >
                {i % labelEvery === 0 ? bucket.label : ""}
              </span>
            ))}
          </div>
        </div>
      </div>

      {series.length > 1 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 pl-12">
          {series.map((s) => (
            <LegendRow key={s.key} color={s.color} label={s.name} />
          ))}
        </div>
      )}

      <ChartTooltip tooltip={tooltip} />
    </div>
  );
}
