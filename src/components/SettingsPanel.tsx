import { useState } from "react";
import type { Settings } from "../lib/settings";
import { HISTORY_LENGTH_MIN, HISTORY_LENGTH_MAX, clampHistoryLength } from "../lib/settings";

interface Props {
  settings: Settings;
  onChange: <K extends keyof Settings>(key: K, value: Settings[K]) => Promise<void>;
}

const PRESETS = [5, 10, 25, 50];

export default function SettingsPanel({ settings, onChange }: Props) {
  const [draft, setDraft] = useState(String(settings.historyLength));

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
    </div>
  );
}
