import { useMemo, useState } from "react";
import type { Client, Session } from "../lib/types";
import type { RangeKey } from "../lib/settings";
import { RANGE_KEYS, RANGE_LABELS } from "../lib/settings";
import {
  bucketGranularity,
  bucketSeries,
  computeRecords,
  earningsByClient,
  formatClockMinutes,
  rangeStart,
  sessionLengthBuckets,
  summarize,
  weekHourMatrix,
} from "../lib/analytics";
import { formatCurrency, formatDate, formatDurationShort } from "../lib/utils";
import BarChartH from "./charts/BarChartH";
import DonutChart from "./charts/DonutChart";
import StackedBars from "./charts/StackedBars";
import Heatmap from "./charts/Heatmap";

interface Props {
  sessions: Session[];
  clients: Client[];
  range: RangeKey;
  onRangeChange: (range: RangeKey) => void;
  loading?: boolean;
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs text-muted uppercase tracking-wider font-medium">{title}</span>
        {subtitle && <span className="text-[10px] text-[#444]">{subtitle}</span>}
      </div>
      {children}
    </section>
  );
}

function Hero({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-surface border border-border rounded-xl px-4 py-3 flex flex-col gap-1">
      <span className="text-xs text-muted uppercase tracking-wider">{label}</span>
      <span className="font-mono text-2xl font-medium text-white">{value}</span>
      {sub && <span className="text-xs text-muted">{sub}</span>}
    </div>
  );
}

function Record({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[10px] text-muted uppercase tracking-wider">{label}</span>
      <span className="text-sm text-white truncate">{value}</span>
      {sub && <span className="text-xs text-muted truncate">{sub}</span>}
    </div>
  );
}

export default function Dashboard({ sessions, clients, range, onRangeChange, loading }: Props) {
  const [metric, setMetric] = useState<"earnings" | "seconds">("earnings");

  const totals = useMemo(() => summarize(sessions, clients), [sessions, clients]);
  const byClient = useMemo(() => earningsByClient(sessions, clients), [sessions, clients]);
  const records = useMemo(() => computeRecords(sessions, clients), [sessions, clients]);
  const matrix = useMemo(() => weekHourMatrix(sessions), [sessions]);
  const lengths = useMemo(() => sessionLengthBuckets(sessions), [sessions]);

  const granularity = useMemo(() => bucketGranularity(range, sessions), [range, sessions]);
  const buckets = useMemo(
    () => bucketSeries(sessions, clients, granularity, rangeStart(range)),
    [sessions, clients, granularity, range]
  );

  const series = useMemo(
    () =>
      byClient.map((row) => ({
        key: row.id == null ? "none" : String(row.id),
        name: row.name,
        color: row.color,
      })),
    [byClient]
  );

  const formatMetric = (value: number) =>
    metric === "earnings" ? formatCurrency(value) : formatDurationShort(Math.round(value));

  const rangeLabel = RANGE_LABELS[range].toLowerCase();

  return (
    <div className="flex flex-col gap-5 max-w-5xl mx-auto">
      {/* Range picker */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          {RANGE_KEYS.map((key) => (
            <button
              key={key}
              onClick={() => onRangeChange(key)}
              className={`px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                range === key
                  ? "border-accent text-accent bg-accent/10"
                  : "border-border text-muted hover:text-white hover:border-[#444]"
              }`}
            >
              {RANGE_LABELS[key]}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted">
          {loading ? "Loading..." : `${sessions.length} ${sessions.length === 1 ? "session" : "sessions"}`}
        </span>
      </div>

      {sessions.length === 0 && !loading ? (
        <div className="bg-surface border border-border rounded-xl py-16 flex flex-col items-center gap-2">
          <span className="text-[#333] text-4xl">◷</span>
          <span className="text-muted text-sm">No sessions in the last {rangeLabel}.</span>
        </div>
      ) : (
        <>
          {/* Headline totals */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Hero label="Total Earned" value={formatCurrency(totals.earnings)} />
            <Hero label="Total Hours" value={formatDurationShort(totals.seconds)} />
            <Hero
              label="Blended Rate"
              value={totals.rate > 0 ? `${formatCurrency(totals.rate)}/hr` : "—"}
              sub={totals.rate > 0 ? "across all tracked time" : "no rates set"}
            />
            <Hero
              label="Sessions"
              value={String(totals.count)}
              sub={
                totals.count > 0
                  ? `avg ${formatDurationShort(Math.round(totals.seconds / totals.count))}`
                  : undefined
              }
            />
          </div>

          {/* Records */}
          <div className="bg-surface border border-border rounded-xl px-5 py-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <Record
              label="Best Day"
              value={records.bestDay ? formatCurrency(records.bestDay.earnings) : "—"}
              sub={
                records.bestDay
                  ? `${formatDate(records.bestDay.date.toISOString())} · ${formatDurationShort(records.bestDay.seconds)}`
                  : undefined
              }
            />
            <Record
              label="Longest Session"
              value={
                records.longestSession
                  ? formatDurationShort(records.longestSession.duration_seconds ?? 0)
                  : "—"
              }
              sub={
                records.longestSession
                  ? formatDate(records.longestSession.started_at)
                  : undefined
              }
            />
            <Record
              label="Current Streak"
              value={records.streakDays > 0 ? `${records.streakDays} ${records.streakDays === 1 ? "day" : "days"}` : "—"}
              sub={records.streakDays > 0 ? "consecutive days worked" : "no active streak"}
            />
            <Record
              label="Busiest Client"
              value={records.busiestClient?.name ?? "—"}
              sub={
                records.busiestClient
                  ? formatDurationShort(records.busiestClient.seconds)
                  : undefined
              }
            />
            <Record
              label="Avg Start Time"
              value={records.avgStartMinutes != null ? formatClockMinutes(records.avgStartMinutes) : "—"}
              sub="when you clock in"
            />
          </div>

          {/* Earnings by client */}
          <Panel title="Earnings by Client" subtitle={`${byClient.length} active`}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <BarChartH
                rows={byClient.map((row) => ({
                  label: row.name,
                  value: row.earnings,
                  color: row.color,
                  display: row.rate != null ? formatCurrency(row.earnings) : "no rate",
                  sublabel: `${formatDurationShort(row.seconds)} · ${row.sessions} sessions`,
                }))}
                emptyMessage="No earnings — set an hourly rate on a client"
              />
              <DonutChart
                slices={byClient
                  .filter((row) => row.earnings > 0)
                  .map((row) => ({
                    label: row.name,
                    value: row.earnings,
                    color: row.color,
                    display: formatCurrency(row.earnings),
                  }))}
                centerLabel="Total"
                centerValue={formatCurrency(totals.earnings)}
              />
            </div>

            {/* Table view — identity and numbers without relying on color */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted uppercase tracking-wider border-b border-border">
                    <th className="text-left font-normal py-2">Client</th>
                    <th className="text-right font-normal py-2">Hours</th>
                    <th className="text-right font-normal py-2">Rate</th>
                    <th className="text-right font-normal py-2">Sessions</th>
                    <th className="text-right font-normal py-2">Avg</th>
                    <th className="text-right font-normal py-2">Earned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {byClient.map((row) => (
                    <tr key={row.id ?? "none"}>
                      <td className="py-2">
                        <span className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ background: row.color }}
                          />
                          <span className="text-white truncate">{row.name}</span>
                        </span>
                      </td>
                      <td className="py-2 text-right font-mono text-muted">
                        {formatDurationShort(row.seconds)}
                      </td>
                      <td className="py-2 text-right font-mono text-muted">
                        {row.rate != null ? `${formatCurrency(row.rate)}/hr` : "no rate"}
                      </td>
                      <td className="py-2 text-right font-mono text-muted">{row.sessions}</td>
                      <td className="py-2 text-right font-mono text-muted">
                        {formatDurationShort(row.avgSeconds)}
                      </td>
                      <td className="py-2 text-right font-mono text-active">
                        {row.earnings > 0 ? formatCurrency(row.earnings) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          {/* Over time */}
          <Panel title="Earnings Over Time" subtitle={`by ${granularity}`}>
            <div className="flex items-center gap-1.5">
              {(["earnings", "seconds"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMetric(m)}
                  className={`px-3 py-1 rounded-lg border text-xs transition-colors ${
                    metric === m
                      ? "border-accent text-accent bg-accent/10"
                      : "border-border text-muted hover:text-white hover:border-[#444]"
                  }`}
                >
                  {m === "earnings" ? "Earnings" : "Hours"}
                </button>
              ))}
            </div>
            <StackedBars
              buckets={buckets}
              series={series}
              metric={metric}
              formatValue={formatMetric}
            />
          </Panel>

          {/* Work patterns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Panel title="When You Work" subtitle="time worked per hour">
              <Heatmap matrix={matrix} />
            </Panel>
            <Panel title="Session Lengths" subtitle={`${totals.count} sessions`}>
              <BarChartH
                rows={lengths.map((bucket) => ({
                  label: bucket.label,
                  value: bucket.count,
                  color: "#6366f1",
                  display: `${bucket.count}`,
                }))}
                emptyMessage="No sessions in this range"
              />
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
