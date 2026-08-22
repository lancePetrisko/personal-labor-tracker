import { useState } from "react";
import type { Client, ActiveSession } from "../lib/types";
import LiveTimer from "./LiveTimer";
import ClientSelect from "./ClientSelect";

interface Props {
  clients: Client[];
  activeSession: ActiveSession | null;
  selectedClientId: number | null;
  onSelectClient: (id: number | null) => void;
  onClockIn: (clientId: number | null, notes: string) => Promise<void>;
  onClockOut: (notes: string) => Promise<void>;
}

export default function ClockPanel({ clients, activeSession, selectedClientId, onSelectClient, onClockIn, onClockOut }: Props) {
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const isActive = !!activeSession;

  async function handleToggle() {
    setLoading(true);
    try {
      if (isActive) {
        await onClockOut(notes);
        setNotes("");
      } else {
        await onClockIn(selectedClientId, notes);
      }
    } finally {
      setLoading(false);
    }
  }

  const activeClient = clients.find((c) => c.id === (activeSession?.client_id ?? selectedClientId));

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Status dot + label */}
      <div className="flex items-center gap-2">
        <span
          className={`w-2.5 h-2.5 rounded-full ${isActive ? "bg-active dot-blink" : "bg-[#333]"}`}
        />
        <span className={`text-xs font-medium tracking-widest uppercase ${isActive ? "text-active" : "text-muted"}`}>
          {isActive ? "Clocked In" : "Not Tracking"}
        </span>
      </div>

      {/* Timer or idle display */}
      <div className="flex flex-col items-center gap-1 min-h-[72px] justify-center">
        {isActive ? (
          <LiveTimer startedAt={activeSession.started_at} />
        ) : (
          <span className="font-mono text-5xl font-medium tracking-widest text-[#2a2a2a] tabular-nums">
            00:00:00
          </span>
        )}
        {activeClient && (
          <div className="flex flex-col items-center gap-0.5 mt-1">
            <span className="text-xs" style={{ color: activeClient.color }}>
              {activeClient.name}
            </span>
            {activeClient.hourly_rate != null && (
              <span className="text-xs text-muted font-mono">
                ${activeClient.hourly_rate.toFixed(2)}/hr
              </span>
            )}
          </div>
        )}
      </div>

      {/* Clock in/out button */}
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`
          w-36 h-36 rounded-full font-semibold text-sm tracking-widest uppercase
          transition-all duration-300 border-2 disabled:opacity-50
          ${isActive
            ? "bg-active/10 border-active text-active clock-active hover:bg-active/20"
            : "bg-accent/10 border-accent text-accent hover:bg-accent/20"
          }
        `}
      >
        {loading ? "..." : isActive ? "Clock\nOut" : "Clock\nIn"}
      </button>

      {/* Client selector — only when not clocked in */}
      {!isActive && (
        <div className="w-full max-w-xs flex flex-col gap-2">
          <label className="text-xs text-muted uppercase tracking-wider">Client</label>
          <ClientSelect
            clients={clients}
            value={selectedClientId}
            onChange={onSelectClient}
          />
        </div>
      )}

      {/* Notes */}
      <div className="w-full max-w-xs flex flex-col gap-2">
        <label className="text-xs text-muted uppercase tracking-wider">Notes</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={isActive ? "What are you working on?" : "Session notes..."}
          className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-accent"
        />
      </div>
    </div>
  );
}
