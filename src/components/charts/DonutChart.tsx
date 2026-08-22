import ChartTooltip, { useChartTooltip, LegendRow } from "./ChartTooltip";

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
  display: string;
}

interface Props {
  slices: DonutSlice[];
  centerLabel: string;
  centerValue: string;
}

const SIZE = 168;
const STROKE = 22;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** Surface-colored gap between segments, in stroke units. */
const GAP = 2;

export default function DonutChart({ slices, centerLabel, centerValue }: Props) {
  const { tooltip, show, hide } = useChartTooltip();
  const total = slices.reduce((sum, s) => sum + s.value, 0);

  if (total <= 0) {
    return <p className="text-xs text-muted py-6 text-center">No earnings in this range</p>;
  }

  let offset = 0;

  return (
    <div data-chart-root className="relative flex items-center gap-6">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="shrink-0">
        <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
          {slices.map((slice) => {
            const length = (slice.value / total) * CIRCUMFERENCE;
            const dash = Math.max(length - GAP, 0.5);
            const circle = (
              <circle
                key={slice.label}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={slice.color}
                strokeWidth={STROKE}
                strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
                strokeDashoffset={-offset}
                className="transition-opacity hover:opacity-80"
                onMouseMove={(e) =>
                  show(
                    e,
                    <div className="flex flex-col gap-0.5">
                      <span className="text-white">{slice.label}</span>
                      <span className="text-muted font-mono">
                        {slice.display} · {Math.round((slice.value / total) * 100)}%
                      </span>
                    </div>
                  )
                }
                onMouseLeave={hide}
              />
            );
            offset += length;
            return circle;
          })}
        </g>
        <text
          x={SIZE / 2}
          y={SIZE / 2 - 6}
          textAnchor="middle"
          className="fill-[#666]"
          style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase" }}
        >
          {centerLabel}
        </text>
        <text
          x={SIZE / 2}
          y={SIZE / 2 + 14}
          textAnchor="middle"
          className="fill-white font-mono"
          style={{ fontSize: 16, fontWeight: 500 }}
        >
          {centerValue}
        </text>
      </svg>

      <div className="flex flex-col gap-1.5 min-w-0 flex-1">
        {slices.map((slice) => (
          <LegendRow
            key={slice.label}
            color={slice.color}
            label={slice.label}
            value={`${Math.round((slice.value / total) * 100)}%`}
          />
        ))}
      </div>

      <ChartTooltip tooltip={tooltip} />
    </div>
  );
}
