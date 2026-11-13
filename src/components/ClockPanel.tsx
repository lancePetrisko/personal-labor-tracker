import { useState } from "react";
import type { Client, ActiveSession } from "../lib/types";
import LiveTimer from "./LiveTimer";
import ClientSelect from "./ClientSelect";
import { readableTextOn } from "../lib/utils";

const DEFAULT_COLOR = "#6366f1";

interface Props {
  clients: Client[];
  activeSession: ActiveSession | null;
  selectedClientId: number | null;
  onSelectClient: (id: number | null) => void;
  onClockIn: (clientId: number | null, notes: string) => Promise<void>;
  onClockOut: (notes: string) => Promise<void>;
  onPause: () => Promise<void>;
  onResume: () => Promise<void>;
}

export default function ClockPanel({
  clients,
  activeSession,
  selectedClientId,
  onSelectClient,
  onClockIn,
  onClockOut,
  onPause,
  onResume,
}: Props) {
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const isActive = !!activeSession;
  const isPaused = !!activeSession?.paused_at;

  async function run(fn: () => Promise<void>) {
    setLoading(true);
    try {
      await fn();
    } finally {
      setLoading(false);
    }
  }

  const handleClockIn = () => run(() => onClockIn(selectedClientId, notes));
  const handleClockOut = () =>
    run(async () => {
      await onClockOut(notes);
      setNotes("");
    });
  const handlePauseToggle = () => run(isPaused ? onResume : onPause);

  const activeClient = clients.find((c) => c.id === (activeSession?.client_id ?? selectedClientId));
  const color = activeClient?.color ?? DEFAULT_COLOR;
  const textOnColor = readableTextOn(color);

  const statusLabel = isPaused ? "Paused" : isActive ? "Clocked In" : "Not Tracking";
  const statusColor = isPaused ? "#f59e0b" : isActive ? "#22c55e" : undefined;

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-sm">
      {/* Status */}
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 ${isActive && !isPaused ? "dot-blink" : ""} ${statusColor ? "" : "bg-[#333]"}`}
          style={statusColor ? { background: statusColor } : undefined}
        />
        <span
          className={`text-[11px] font-medium tracking-[0.2em] uppercase ${statusColor ? "" : "text-muted"}`}
          style={statusColor ? { color: statusColor } : undefined}
        >
          {statusLabel}
        </span>
      </div>

      {/* Timer */}
      <div className="flex flex-col items-center gap-1 min-h-[72px] justify-center">
        {isActive ? (
          <LiveTimer session={activeSession} />
        ) : (
          <span className="font-mono text-5xl font-medium tracking-widest text-[#2a2a2a] tabular-nums">
            00:00:00
          </span>
        )}
        {activeClient && (
          <div className="flex items-center gap-2 mt-2 text-xs">
            <span style={{ color: activeClient.color }}>{activeClient.name}</span>
            {activeClient.hourly_rate != null && (
              <span className="text-muted font-mono">${activeClient.hourly_rate.toFixed(2)}/hr</span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="w-full flex gap-2">
        {isActive ? (
          <>
            <button
              onClick={handlePauseToggle}
              disabled={loading}
              className="flex-1 h-12 border border-border bg-surface-2 text-white text-xs font-semibold tracking-[0.2em] uppercase transition-colors hover:border-[#444] disabled:opacity-50"
            >
              {isPaused ? "Resume" : "Pause"}
            </button>
            <button
              onClick={handleClockOut}
              disabled={loading}
              className="flex-1 h-12 border text-xs font-semibold tracking-[0.2em] uppercase transition-[filter] hover:brightness-110 disabled:opacity-50"
              style={{ background: color, borderColor: color, color: textOnColor }}
            >
              {loading ? "..." : "Clock Out"}
            </button>
          </>
        ) : (
          <button
            onClick={handleClockIn}
            disabled={loading}
            className="w-full h-12 border text-xs font-semibold tracking-[0.2em] uppercase transition-[filter] hover:brightness-110 disabled:opacity-50"
            style={{ background: color, borderColor: color, color: textOnColor }}
          >
            {loading ? "..." : "Clock In"}
          </button>
        )}
      </div>

      {/* Client selector — only when not clocked in */}
      {!isActive && (
        <div className="w-full flex flex-col gap-2">
          <label className="text-[11px] text-muted uppercase tracking-[0.15em]">Client</label>
          <ClientSelect clients={clients} value={selectedClientId} onChange={onSelectClient} />
        </div>
      )}

      {/* Notes */}
      <div className="w-full flex flex-col gap-2">
        <label className="text-[11px] text-muted uppercase tracking-[0.15em]">Notes</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={isActive ? "What are you working on?" : "Session notes..."}
          className="bg-surface-2 border border-border px-3 py-2 text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-accent"
        />
      </div>
    </div>
  );
}
