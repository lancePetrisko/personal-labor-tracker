import { useState, useRef } from "react";
import type { Session } from "../lib/types";
import { formatDate, formatTime, formatDurationShort } from "../lib/utils";

/** Fixed height per row so `historyLength` maps to an exact scroll viewport. */
const ROW_HEIGHT = 56;

interface Props {
  sessions: Session[];
  onDelete: (id: number) => Promise<void>;
  onUpdateNotes: (id: number, notes: string) => Promise<void>;
  onEdit: (session: Session) => void;
  /** Rows visible before the list scrolls. */
  historyLength: number;
}

const COLS = "grid grid-cols-[36px_1fr_120px_80px_1fr_72px] gap-4 px-4";

export default function SessionHistory({ sessions, onDelete, onUpdateNotes, onEdit, historyLength }: Props) {
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [editingNotes, setEditingNotes] = useState<number | null>(null);
  const [draftNotes, setDraftNotes] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function startEditingNotes(session: Session) {
    setEditingNotes(session.id);
    setDraftNotes(session.notes ?? "");
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  async function commitNotes(id: number) {
    await onUpdateNotes(id, draftNotes);
    setEditingNotes(null);
  }

  function handleNotesKeyDown(e: React.KeyboardEvent, id: number) {
    if (e.key === "Enter") commitNotes(id);
    if (e.key === "Escape") setEditingNotes(null);
  }

  async function handleDelete(id: number) {
    setDeleting(id);
    setConfirmDelete(null);
    try {
      await onDelete(id);
    } finally {
      setDeleting(null);
    }
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2">
        <span className="text-[#333] text-4xl">◷</span>
        <span className="text-muted text-sm">No sessions yet. Clock in to start tracking.</span>
      </div>
    );
  }

  const scrolls = sessions.length > historyLength;

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className={`${COLS} py-2 text-xs text-muted uppercase tracking-wider border-b border-border`}>
        <span>#</span>
        <span>Date</span>
        <span>Duration</span>
        <span>Client</span>
        <span>Notes</span>
        <span />
      </div>

      {/* Rows — capped to `historyLength` rows tall, scrolls past that */}
      <div
        className="flex flex-col divide-y divide-border/50 overflow-y-auto"
        style={{ maxHeight: historyLength * ROW_HEIGHT }}
      >
        {sessions.map((session, i) => (
          <div
            key={session.id}
            className={`${COLS} items-center hover:bg-surface/60 transition-colors shrink-0`}
            style={{ height: ROW_HEIGHT }}
          >
            {/* Position in the list */}
            <span className="font-mono text-xs text-[#444] tabular-nums">{i + 1}</span>

            {/* Date + time */}
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-sm text-white truncate">{formatDate(session.started_at)}</span>
              <span className="text-xs text-muted truncate">{formatTime(session.started_at)}</span>
            </div>

            {/* Duration */}
            <span className="font-mono text-sm text-white">
              {session.duration_seconds != null
                ? formatDurationShort(session.duration_seconds)
                : "—"}
            </span>

            {/* Client badge */}
            <div className="min-w-0">
              {session.client_name ? (
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium inline-block max-w-full truncate"
                  style={{
                    background: `${session.client_color ?? "#6366f1"}22`,
                    color: session.client_color ?? "#6366f1",
                    border: `1px solid ${session.client_color ?? "#6366f1"}44`,
                  }}
                >
                  {session.client_name}
                </span>
              ) : (
                <span className="text-xs text-muted">—</span>
              )}
            </div>

            {/* Notes */}
            {editingNotes === session.id ? (
              <input
                ref={inputRef}
                value={draftNotes}
                onChange={(e) => setDraftNotes(e.target.value)}
                onBlur={() => commitNotes(session.id)}
                onKeyDown={(e) => handleNotesKeyDown(e, session.id)}
                className="w-full bg-surface-2 border border-accent rounded px-2 py-0.5 text-sm text-white focus:outline-none"
              />
            ) : (
              <button
                onClick={() => startEditingNotes(session)}
                className="text-left text-sm text-muted truncate w-full hover:text-white transition-colors group"
                title="Click to edit notes"
              >
                {session.notes ?? <span className="text-[#333] group-hover:text-[#555]">Add notes...</span>}
              </button>
            )}

            {/* Row actions */}
            <div className="flex items-center justify-end gap-1">
              <button
                onClick={() => onEdit(session)}
                title="Edit session"
                className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-white hover:bg-surface-2 transition-colors text-xs"
              >
                &#9998;
              </button>
              {confirmDelete === session.id ? (
                <button
                  onClick={() => handleDelete(session.id)}
                  onMouseLeave={() => setConfirmDelete(null)}
                  disabled={deleting === session.id}
                  title="Click again to delete"
                  className="h-7 px-2 flex items-center justify-center rounded-lg bg-danger/15 border border-danger/40 text-danger text-[10px] font-medium uppercase tracking-wider transition-colors hover:bg-danger/25 disabled:opacity-50"
                >
                  {deleting === session.id ? "..." : "Sure?"}
                </button>
              ) : (
                <button
                  onClick={() => setConfirmDelete(session.id)}
                  title="Delete session"
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition-colors text-xs"
                >
                  &#128465;
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {scrolls && (
        <div className="px-4 py-1.5 text-[10px] text-[#444] uppercase tracking-wider border-t border-border/50">
          Showing {historyLength} of {sessions.length} — scroll for more
        </div>
      )}
    </div>
  );
}
