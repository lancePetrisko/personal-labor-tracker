import { useEffect, useRef, useState } from "react";
import type { Settings } from "../lib/settings";
import { HISTORY_LENGTH_MIN, HISTORY_LENGTH_MAX, clampHistoryLength } from "../lib/settings";

interface Props {
  settings: Settings;
  onChange: <K extends keyof Settings>(key: K, value: Settings[K]) => Promise<void>;
  /** Number of finished sessions currently stored. */
  sessionCount: number;
  /** Wipes every finished session; resolves with how many were removed. */
  onClearSessions: () => Promise<number>;
}

/** Seconds the armed delete button stays armed before disarming itself. */
const CONFIRM_TIMEOUT_MS = 5000;

const PRESETS = [5, 10, 25, 50];

export default function SettingsPanel({ settings, onChange, sessionCount, onClearSessions }: Props) {
  const [draft, setDraft] = useState(String(settings.historyLength));
  const [armed, setArmed] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [cleared, setCleared] = useState<number | null>(null);
  const timer = useRef<number | null>(null);

  // Never leave the button armed — disarm on a timer and on unmount
  useEffect(() => {
    if (!armed) return;
    timer.current = window.setTimeout(() => setArmed(false), CONFIRM_TIMEOUT_MS);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [armed]);

  async function handleClear() {
    if (!armed) {
      setCleared(null);
      setArmed(true);
      return;
    }
    setArmed(false);
    setClearing(true);
    try {
      setCleared(await onClearSessions());
    } finally {
      setClearing(false);
    }
  }

  async function commitHistoryLength(raw: string) {
    const value = clampHistoryLength(Number(raw));
    setDraft(String(value));
    if (value !== settings.historyLength) await onChange("historyLength", value);
  }

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col gap-6">
      <div>
        <h2 className="text-sm font-semibold text-white">Settings</h2>
        <p className="text-xs text-muted mt-1">Stored in labor.db, so they travel with your data.</p>
      </div>

      <section className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-4">
        <span className="text-xs text-muted uppercase tracking-wider font-medium">History</span>

        <div className="flex flex-col gap-2">
          <label className="text-sm text-white">Rows visible before scrolling</label>
          <p className="text-xs text-muted">
            The session list stays this tall and scrolls past it. {HISTORY_LENGTH_MIN}–{HISTORY_LENGTH_MAX}.
          </p>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="number"
              min={HISTORY_LENGTH_MIN}
              max={HISTORY_LENGTH_MAX}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={(e) => commitHistoryLength(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
              className="w-24 bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white font-mono text-center focus:outline-none focus:border-accent"
            />
            <div className="flex gap-1.5">
              {PRESETS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => commitHistoryLength(String(n))}
                  className={`px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                    settings.historyLength === n
                      ? "border-accent text-accent bg-accent/10"
                      : "border-border text-muted hover:text-white hover:border-[#444]"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <p className="text-[10px] text-[#444] mt-1">
            History loads the 100 most recent sessions.
          </p>
        </div>
      </section>

      <section className="bg-surface border border-danger/25 rounded-xl p-5 flex flex-col gap-4">
        <span className="text-xs text-danger/80 uppercase tracking-wider font-medium">Danger Zone</span>

        <div className="flex flex-col gap-2">
          <label className="text-sm text-white">Delete all sessions</label>
          <p className="text-xs text-muted">
            Removes every finished session from labor.db. Clients and their rates are kept, and a
            session that is still running is left alone. This cannot be undone.
          </p>

          <div className="flex items-center gap-3 mt-2">
            <button
              type="button"
              onClick={handleClear}
              disabled={clearing || sessionCount === 0}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 ${
                armed
                  ? "bg-danger text-white hover:bg-danger/90"
                  : "bg-danger/10 border border-danger/30 text-danger hover:bg-danger/20"
              }`}
            >
              {clearing
                ? "Deleting..."
                : armed
                  ? `Click again to delete ${sessionCount} ${sessionCount === 1 ? "session" : "sessions"}`
                  : "Delete all sessions"}
            </button>

            {armed && (
              <button
                type="button"
                onClick={() => setArmed(false)}
                className="px-3 py-2 rounded-lg border border-border text-xs text-muted hover:text-white hover:border-[#444] transition-colors"
              >
                Cancel
              </button>
            )}

            {!armed && cleared != null && (
              <span className="text-xs text-active">
                Deleted {cleared} {cleared === 1 ? "session" : "sessions"}
              </span>
            )}

            {!armed && cleared == null && sessionCount === 0 && (
              <span className="text-xs text-muted">No sessions stored</span>
            )}
          </div>

          {armed && (
            <span className="text-xs text-muted">
              Confirm within 5 seconds or this disarms itself.
            </span>
          )}
        </div>
      </section>
    </div>
  );
}
