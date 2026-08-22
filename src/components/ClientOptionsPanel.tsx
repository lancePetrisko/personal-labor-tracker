import { useEffect, useState } from "react";
import type { Client } from "../lib/types";
import { CLIENT_COLORS } from "../lib/utils";
import ClientSelect from "./ClientSelect";

const STORAGE_KEY = "clientOptions.open";

interface Props {
  clients: Client[];
  selectedClientId: number | null;
  onSelectClient: (id: number | null) => void;
  onSave: (id: number, name: string, rate: number | null, color: string) => Promise<void>;
  /** Locked while a session is running — the client of a running session should not change mid-flight. */
  locked?: boolean;
}

export default function ClientOptionsPanel({
  clients,
  selectedClientId,
  onSelectClient,
  onSave,
  locked,
}: Props) {
  const client = clients.find((c) => c.id === selectedClientId) ?? null;

  const [rate, setRate] = useState("");
  const [color, setColor] = useState(CLIENT_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(0);
  const [open, setOpen] = useState(() => localStorage.getItem(STORAGE_KEY) === "1");

  function toggleOpen() {
    setOpen((prev) => {
      localStorage.setItem(STORAGE_KEY, prev ? "0" : "1");
      return !prev;
    });
  }

  // Reload the draft whenever the target client (or its stored values) change
  useEffect(() => {
    setRate(client?.hourly_rate != null ? String(client.hourly_rate) : "");
    setColor(client?.color ?? CLIENT_COLORS[0]);
  }, [client?.id, client?.hourly_rate, client?.color]);

  const parsedRate = rate.trim() === "" ? null : Number(rate);
  const rateInvalid = parsedRate != null && (isNaN(parsedRate) || parsedRate < 0);
  const dirty =
    !!client &&
    !rateInvalid &&
    (parsedRate !== (client.hourly_rate ?? null) || color !== client.color);

  async function handleSave() {
    if (!client || !dirty) return;
    setSaving(true);
    try {
      await onSave(client.id, client.name, parsedRate, color);
      setSavedAt(Date.now());
    } finally {
      setSaving(false);
    }
  }

  function handleRevert() {
    setRate(client?.hourly_rate != null ? String(client.hourly_rate) : "");
    setColor(client?.color ?? CLIENT_COLORS[0]);
  }

  return (
    <div className={`w-full max-w-md mx-auto bg-surface border border-border rounded-xl flex flex-col transition-all ${
        open ? "p-5 gap-4" : "px-5 py-3"
      }`}>
      <button
        type="button"
        onClick={toggleOpen}
        aria-expanded={open}
        className="flex items-center gap-3 w-full text-left group"
      >
        <svg
          viewBox="0 0 12 12"
          className={`w-3 h-3 shrink-0 text-muted transition-transform duration-200 ${open ? "rotate-90" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4.5 2.5 8 6l-3.5 3.5" />
        </svg>
        <span className="text-xs text-muted uppercase tracking-wider font-medium group-hover:text-white transition-colors">
          Client Options
        </span>
        {/* Collapsed summary of the current client */}
        {!open && client && (
          <span className="flex items-center gap-2 ml-auto min-w-0">
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium truncate"
              style={{
                background: `${client.color}22`,
                color: client.color,
                border: `1px solid ${client.color}44`,
              }}
            >
              {client.name}
            </span>
            <span className="text-xs text-muted font-mono shrink-0">
              {client.hourly_rate != null ? `$${client.hourly_rate.toFixed(2)}/hr` : "no rate"}
            </span>
          </span>
        )}
        {!open && dirty && (
          <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" title="Unsaved changes" />
        )}
        {!open && !client && (
          <span className="text-xs text-muted ml-auto">No client selected</span>
        )}
        {open && savedAt > 0 && !dirty && <span className="text-xs text-active ml-auto">Saved</span>}
      </button>

      {open && (
      <>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted uppercase tracking-wider">Client</label>
        <ClientSelect
          clients={clients}
          value={selectedClientId}
          onChange={onSelectClient}
          disabled={locked}
        />
      </div>

      {!client ? (
        <p className="text-xs text-muted py-2">
          {clients.length === 0
            ? "No clients yet — add one from the header to set a rate and color."
            : "Pick a client above to edit its hourly rate and color."}
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted uppercase tracking-wider">Hourly Rate</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
              <input
                type="number"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className={`w-full bg-surface-2 border rounded-lg pl-7 pr-14 py-2 text-sm text-white font-mono placeholder:text-[#444] focus:outline-none ${
                  rateInvalid ? "border-danger" : "border-border focus:border-accent"
                }`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-xs">/hr</span>
            </div>
            {rateInvalid ? (
              <span className="text-xs text-danger">Rate must be a number of 0 or more</span>
            ) : (
              <span className="text-xs text-muted">Leave blank for no rate.</span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs text-muted uppercase tracking-wider">Color</label>
            <div className="flex gap-2 flex-wrap">
              {CLIENT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  title={c}
                  className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                  style={{
                    background: c,
                    outline: color === c ? `2px solid ${c}` : "2px solid transparent",
                    outlineOffset: "2px",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Live preview of how the client renders elsewhere */}
          <div className="flex items-center gap-3 border-t border-border pt-3">
            <span className="text-xs text-muted uppercase tracking-wider">Preview</span>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{
                background: `${color}22`,
                color,
                border: `1px solid ${color}44`,
              }}
            >
              {client.name}
            </span>
            <span className="text-xs text-muted font-mono">
              {parsedRate != null && !rateInvalid ? `$${parsedRate.toFixed(2)}/hr` : "no rate"}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleRevert}
              disabled={!dirty}
              className="flex-1 py-2 rounded-lg border border-border text-sm text-muted hover:text-white hover:border-[#444] transition-colors disabled:opacity-40 disabled:hover:text-muted disabled:hover:border-border"
            >
              Revert
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!dirty || saving}
              className="flex-1 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-40"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </>
      )}
      </>
      )}
    </div>
  );
}
