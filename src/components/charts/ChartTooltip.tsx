import { useState, type ReactNode } from "react";

export interface TooltipState {
  x: number;
  y: number;
  content: ReactNode;
}

/** Pointer-following tooltip shared by every chart. */
export function useChartTooltip() {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  function show(e: React.MouseEvent, content: ReactNode) {
    const box = e.currentTarget.closest("[data-chart-root]") as HTMLElement | null;
    const rect = box?.getBoundingClientRect();
    setTooltip({
      x: rect ? e.clientX - rect.left : e.clientX,
      y: rect ? e.clientY - rect.top : e.clientY,
      content,
    });
  }

  return { tooltip, show, hide: () => setTooltip(null) };
}

export default function ChartTooltip({ tooltip }: { tooltip: TooltipState | null }) {
  if (!tooltip) return null;
  return (
    <div
      className="pointer-events-none absolute z-30 bg-[#1e1e1e] border border-border rounded-lg px-3 py-2 shadow-xl text-xs whitespace-nowrap"
      style={{
        left: tooltip.x,
        top: tooltip.y,
        transform: `translate(${tooltip.x > 220 ? "-105%" : "12px"}, -50%)`,
      }}
    >
      {tooltip.content}
    </div>
  );
}

/** Colored swatch + label + value row, used inside tooltips and legends. */
export function LegendRow({ color, label, value }: { color: string; label: string; value?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
      <span className="text-muted">{label}</span>
      {value && <span className="text-white font-mono ml-auto pl-3">{value}</span>}
    </div>
  );
}
