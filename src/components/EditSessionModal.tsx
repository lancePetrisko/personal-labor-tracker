import { useState } from "react";
import type { Client, Session } from "../lib/types";
import { toLocalInputValue, fromLocalInputValue, splitDuration, formatDurationShort } from "../lib/utils";
import ClientSelect from "./ClientSelect";

interface Props {
  session: Session;
  clients: Client[];
  onSave: (
    id: number,
    client_id: number | null,
    started_at: string,
    ended_at: string,
    duration_seconds: number,
    notes: string
  ) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onClose: () => void;
}

export default function EditSessionModal({ session, clients, onSave, onDelete, onClose }: Props) {
  const initial = splitDuration(session.duration_seconds ?? 0);
  const [start, setStart] = useState(toLocalInputValue(session.started_at));
  const [hours, setHours] = useState(String(initial.h));
  const [minutes, setMinutes] = useState(String(initial.m));
  const [seconds, setSeconds] = useState(String(initial.s));
  const [clientId, setClientId] = useState<number | null>(session.client_id);
  const [notes, setNotes] = useState(session.notes ?? "");
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");

  const totalSeconds =
    (Number(hours) || 0) * 3600 + (Number(minutes) || 0) * 60 + (Number(seconds) || 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!start) {
      setError("Start time is required");
      return;
    }
    const startedDate = new Date(start);
    if (isNaN(startedDate.getTime())) {
      setError("Start time is invalid");
      return;
    }
    if (totalSeconds < 0) {
      setError("Duration cannot be negative");
      return;
    }
    setLoading(true);
    try {
      const started_at = fromLocalInputValue(start);
      const ended_at = new Date(startedDate.getTime() + totalSeconds * 1000).toISOString();
      await onSave(session.id, clientId, started_at, ended_at, totalSeconds, notes);
      onClose();
    } catch {
      setError("Failed to save session");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setLoading(true);
    try {
      await onDelete(session.id);
      onClose();
    } catch {
      setError("Failed to delete session");
    } finally {
      setLoading(false);
    }
  }

  const numberField =
    "w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white font-mono text-center focus:outline-none focus:border-accent";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <h2 className="text-base font-semibold text-white mb-5">Edit Session</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted uppercase tracking-wider">Started</label>
            <input
              autoFocus
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent [color-scheme:dark]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted uppercase tracking-wider">Duration</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "hrs", value: hours, set: setHours, max: undefined },
                { label: "min", value: minutes, set: setMinutes, max: 59 },
                { label: "sec", value: seconds, set: setSeconds, max: 59 },
              ].map((f) => (
                <div key={f.label} className="flex flex-col gap-1">
                  <input
                    type="number"
                    min="0"
                    max={f.max}
                    value={f.value}
                    onChange={(e) => f.set(e.target.value)}
                    className={numberField}
                  />
                  <span className="text-[10px] text-muted uppercase tracking-wider text-center">
                    {f.label}
                  </span>
                </div>
              ))}
            </div>
            <span className="text-xs text-muted">
              Total: <span className="font-mono text-white">{formatDurationShort(totalSeconds)}</span>
              <span className="text-[#444]"> — end time recalculated from start + duration</span>
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted uppercase tracking-wider">Client</label>
            <ClientSelect clients={clients} value={clientId} onChange={setClientId} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted uppercase tracking-wider">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Session notes..."
              className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-accent"
            />
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
              disabled={loading}
              className="flex-1 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </div>

          <div className="border-t border-border pt-3">
            {confirmDelete ? (
              <div className="flex gap-2">
                <span className="flex-1 text-xs text-muted self-center">Delete this session?</span>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted hover:text-white transition-colors"
                >
                  No
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="px-3 py-1.5 rounded-lg bg-danger/10 border border-danger/30 text-xs text-danger hover:bg-danger/20 transition-colors disabled:opacity-50"
                >
                  Yes, delete
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="w-full py-1.5 rounded-lg text-xs text-danger/70 hover:text-danger hover:bg-danger/10 transition-colors"
              >
                Delete session
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
