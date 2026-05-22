import { useState } from "react";
import { CLIENT_COLORS } from "../lib/utils";

interface Props {
  onAdd: (name: string, rate: number | null, color: string) => Promise<void>;
  onClose: () => void;
}

export default function AddClientModal({ onAdd, onClose }: Props) {
  const [name, setName] = useState("");
  const [rate, setRate] = useState("");
  const [color, setColor] = useState(CLIENT_COLORS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setLoading(true);
    try {
      await onAdd(name.trim(), rate ? Number(rate) : null, color);
      onClose();
    } catch {
      setError("Failed to add client");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <h2 className="text-base font-semibold text-white mb-5">Add Client</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted uppercase tracking-wider">Name</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Client name"
              className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-accent"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted uppercase tracking-wider">Hourly Rate (optional)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
              <input
                type="number"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full bg-surface-2 border border-border rounded-lg pl-7 pr-3 py-2 text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted uppercase tracking-wider">Color</label>
            <div className="flex gap-2 flex-wrap">
              {CLIENT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
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
              {loading ? "Adding..." : "Add Client"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
