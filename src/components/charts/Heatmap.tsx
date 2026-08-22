import ChartTooltip, { useChartTooltip } from "./ChartTooltip";
import { formatDurationShort } from "../../lib/utils";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
/** Sequential single hue — magnitude, not identity. */
const HUE = "#6366f1";
const STEPS = [0.12, 0.3, 0.5, 0.72, 1];

function stepFor(value: number, max: number): number {
  if (value <= 0) return 0;
  const ratio = value / max;
  const index = Math.min(STEPS.length - 1, Math.floor(ratio * STEPS.length));
  return STEPS[index];
}

function hourLabel(hour: number): string {
  if (hour === 0) return "12a";
  if (hour === 12) return "12p";
  return hour < 12 ? `${hour}a` : `${hour - 12}p`;
}

export default function Heatmap({ matrix }: { matrix: number[][] }) {
  const { tooltip, show, hide } = useChartTooltip();
  const max = Math.max(...matrix.flat());

  if (max <= 0) {
    return <p className="text-xs text-muted py-10 text-center">No sessions in this range</p>;
  }

  return (
    <div data-chart-root className="relative flex flex-col gap-2">
      <div className="flex flex-col gap-[3px]">
        {matrix.map((row, day) => (
          <div key={day} className="flex items-center gap-[3px]">
            <span className="w-8 shrink-0 text-[10px] text-[#444] text-right pr-1">{DAYS[day]}</span>
            {row.map((value, hour) => (
              <div
                key={hour}
                className="flex-1 h-4 rounded-[3px] transition-transform hover:scale-125"
                style={{
                  background:
                    value > 0 ? `${HUE}${Math.round(stepFor(value, max) * 255).toString(16).padStart(2, "0")}` : "#1a1a1a",
                }}
                onMouseMove={(e) =>
                  show(
                    e,
                    <div className="flex flex-col gap-0.5">
                      <span className="text-white">
                        {DAYS[day]} · {hourLabel(hour)}
                      </span>
                      <span className="text-muted font-mono">
                        {value > 0 ? formatDurationShort(Math.round(value)) : "No work"}
                      </span>
                    </div>
                  )
                }
                onMouseLeave={hide}
              />
            ))}
          </div>
        ))}

        {/* Hour axis, labelled every 3 hours */}
        <div className="flex items-center gap-[3px] mt-0.5">
          <span className="w-8 shrink-0" />
          {Array.from({ length: 24 }, (_, hour) => (
            <span key={hour} className="flex-1 text-[9px] text-[#444] text-center truncate">
              {hour % 3 === 0 ? hourLabel(hour) : ""}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 justify-end">
        <span className="text-[10px] text-[#444]">Less</span>
        {[0, ...STEPS].map((step, i) => (
          <span
            key={i}
            className="w-4 h-3 rounded-[3px]"
            style={{
              background:
                step > 0 ? `${HUE}${Math.round(step * 255).toString(16).padStart(2, "0")}` : "#1a1a1a",
            }}
          />
        ))}
        <span className="text-[10px] text-[#444]">More</span>
      </div>

      <ChartTooltip tooltip={tooltip} />
    </div>
  );
}
