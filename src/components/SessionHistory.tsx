import { useState } from "react";
import type { Session } from "../lib/types";
import { formatDate, formatTime, formatDurationShort } from "../lib/utils";

interface Props {
  sessions: Session[];
  onDelete: (id: number) => Promise<void>;
}

export default function SessionHistory({ sessions, onDelete }: Props) {
  const [menuOpen, setMenuOpen] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  async function handleDelete(id: number) {
    setDeleting(id);
    setMenuOpen(null);
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

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="grid grid-cols-[1fr_140px_80px_1fr_36px] gap-4 px-4 py-2 text-xs text-muted uppercase tracking-wider border-b border-border">
        <span>Date</span>
        <span>Duration</span>
        <span>Client</span>
        <span>Notes</span>
        <span />
      </div>

      {/* Rows */}
      <div className="flex flex-col divide-y divide-border/50">
        {sessions.map((session) => (
          <div
            key={session.id}
            className="grid grid-cols-[1fr_140px_80px_1fr_36px] gap-4 px-4 py-3 items-center hover:bg-surface/60 transition-colors relative"
          >
            {/* Date + time */}
            <div className="flex flex-col gap-0.5">
              <span className="text-sm text-white">{formatDate(session.started_at)}</span>
              <span className="text-xs text-muted">{formatTime(session.started_at)}</span>
            </div>

            {/* Duration */}
            <span className="font-mono text-sm text-white">
              {session.duration_seconds != null
                ? formatDurationShort(session.duration_seconds)
                : "—"}
            </span>

            {/* Client badge */}
            <div>
              {session.client_name ? (
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
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
            <span className="text-sm text-muted truncate">
              {session.notes ?? "—"}
            </span>

            {/* Menu */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(menuOpen === session.id ? null : session.id)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-white hover:bg-surface-2 transition-colors text-lg leading-none"
              >
                ⋮
              </button>
              {menuOpen === session.id && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setMenuOpen(null)}
                  />
                  <div className="absolute right-0 top-8 z-20 bg-surface border border-border rounded-lg overflow-hidden shadow-xl min-w-[120px]">
                    <button
                      onClick={() => handleDelete(session.id)}
                      disabled={deleting === session.id}
                      className="w-full px-4 py-2 text-left text-sm text-danger hover:bg-danger/10 transition-colors disabled:opacity-50"
                    >
                      {deleting === session.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
