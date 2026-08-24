import { useEffect, useMemo, useRef, useState } from "react";
import type { Client, Session } from "../lib/types";
import { formatDurationShort, totalSeconds } from "../lib/utils";
import ClientSelect from "./ClientSelect";

export interface ExportRequest {
  clientId: number;
  from: Date;
  to: Date;
  includeNotes: boolean;
  includeMoney: boolean;
}

interface Props {
  clients: Client[];
  initialClientId: number | null;
  /** Resolves the sessions a given selection would export, for the preview line. */
  onPreview: (clientId: number, sinceIso: string, untilIso: string) => Promise<Session[]>;
  /** Resolves false when the user dismissed the save dialog. */
  onExport: (request: ExportRequest) => Promise<boolean>;
  onClose: () => void;
}

/** "YYYY-MM-DD" from an <input type="date">, in the user's own timezone. */
function toDayValue(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "YYYY-MM-DD" -> local midnight. Avoids `new Date(str)`, which parses as UTC. */
function fromDayValue(value: string): Date | null {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!parts) return null;
  const d = new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
  d.setHours(0, 0, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** The query's exclusive upper bound: midnight starting the day after `to`. */
function endOfDayExclusive(to: Date): Date {
  const d = new Date(to);
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function monthRange(monthsAgo: number): { from: Date; to: Date } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  const to = new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 0);
  return { from, to };
}

function lastNDays(n: number): { from: Date; to: Date } {
  const to = new Date();
  to.setHours(0, 0, 0, 0);
  const from = new Date(to);
  from.setDate(from.getDate() - (n - 1));
  return { from, to };
}

const PRESETS: { label: string; range: () => { from: Date; to: Date } }[] = [
  { label: "This month", range: () => monthRange(0) },
  { label: "Last month", range: () => monthRange(1) },
  { label: "Last 30 days", range: () => lastNDays(30) },
];

const LABEL = "text-xs text-muted uppercase tracking-wider";
const INPUT =
  "bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-accent";

export default function ExportReportModal({ clients, initialClientId, onPreview, onExport, onClose }: Props) {
  const initialRange = monthRange(0);
  const [clientId, setClientId] = useState<number | null>(initialClientId);
  const [fromValue, setFromValue] = useState(toDayValue(initialRange.from));
  const [toValue, setToValue] = useState(toDayValue(initialRange.to));
  const [includeNotes, setIncludeNotes] = useState(true);
  const [includeMoney, setIncludeMoney] = useState(true);
  const [preview, setPreview] = useState<Session[] | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = fromDayValue(fromValue);
  const to = fromDayValue(toValue);
  const rangeValid = from != null && to != null && from <= to;
  const canExport = clientId != null && rangeValid && !loading;

  // Preview reruns on every input change; a request counter drops stale answers
  // so a slow query can't overwrite a newer one.
  const requestId = useRef(0);
  useEffect(() => {
    if (clientId == null || !rangeValid) {
      setPreview(null);
      return;
    }
    const id = ++requestId.current;
    setPreviewing(true);
    const timer = setTimeout(() => {
      onPreview(clientId, from.toISOString(), endOfDayExclusive(to).toISOString())
        .then((rows) => {
          if (id === requestId.current) setPreview(rows);
        })
        .catch(() => {
          if (id === requestId.current) setPreview(null);
        })
        .finally(() => {
          if (id === requestId.current) setPreviewing(false);
        });
    }, 150);
    return () => clearTimeout(timer);
  }, [clientId, fromValue, toValue, rangeValid, onPreview]);

  const previewLabel = useMemo(() => {
    if (clientId == null) return "Pick a client";
    if (!rangeValid) return "Check the dates";
    if (previewing || preview == null) return "Counting...";
    const count = preview.length;
    if (count === 0) return "No sessions in this range";
    return `${count} ${count === 1 ? "session" : "sessions"} · ${formatDurationShort(totalSeconds(preview))}`;
  }, [clientId, rangeValid, previewing, preview]);

  function applyPreset(range: { from: Date; to: Date }) {
    setFromValue(toDayValue(range.from));
    setToValue(toDayValue(range.to));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (clientId == null) return setError("Pick a client to export.");
    if (!rangeValid) return setError("The start date must be on or before the end date.");
    if (preview != null && preview.length === 0) {
      return setError("No sessions in this range — nothing to export.");
    }
    setError(null);
    setLoading(true);
    try {
      const saved = await onExport({ clientId, from, to, includeNotes, includeMoney });
      if (saved) onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <h2 className="text-base font-semibold text-white mb-1">Export Work Report</h2>
        <p className="text-xs text-muted mb-5">
          One client per PDF — no other client's work appears in the file.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Client</label>
            <ClientSelect clients={clients} value={clientId} onChange={setClientId} disabled={loading} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Period</label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyPreset(preset.range())}
                  className="px-2.5 py-1 rounded-lg border border-border text-xs text-muted hover:text-white hover:border-[#444] transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="date"
                value={fromValue}
                onChange={(e) => setFromValue(e.target.value)}
                className={`${INPUT} flex-1`}
              />
              <span className="text-xs text-muted">to</span>
              <input
                type="date"
                value={toValue}
                onChange={(e) => setToValue(e.target.value)}
                className={`${INPUT} flex-1`}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
              <input
                type="checkbox"
                checked={includeNotes}
                onChange={(e) => setIncludeNotes(e.target.checked)}
                className="accent-accent"
              />
              Include session notes
            </label>
            <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
              <input
                type="checkbox"
                checked={includeMoney}
                onChange={(e) => setIncludeMoney(e.target.checked)}
                className="accent-accent"
              />
              Include rate &amp; amounts
            </label>
          </div>

          <div className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-xs text-muted">
            {previewLabel}
          </div>

          {error && <p className="text-xs text-danger">{error}</p>}

          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-border text-sm text-muted hover:text-white hover:border-[#444] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canExport}
              className="flex-1 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {loading ? "Generating..." : "Export PDF"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
