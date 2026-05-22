import { useEffect, useState, useCallback } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { Client, Session, ActiveSession } from "./lib/types";
import {
  loadClients,
  loadSessions,
  getActiveSession,
  addClient,
  clockIn,
  clockOut,
  deleteSession,
} from "./lib/db";
import { formatDurationShort, secondsSince } from "./lib/utils";
import ClockPanel from "./components/ClockPanel";
import StatsBar from "./components/StatsBar";
import SessionHistory from "./components/SessionHistory";
import AddClientModal from "./components/AddClientModal";

export default function App() {
  const [clients, setClients] = useState<Client[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [activeDelta, setActiveDelta] = useState(0);
  const [showAddClient, setShowAddClient] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [c, s, a] = await Promise.all([loadClients(), loadSessions(), getActiveSession()]);
    setClients(c);
    setSessions(s);
    setActiveSession(a);
    if (a) setActiveDelta(secondsSince(a.started_at));
  }, []);

  useEffect(() => {
    refresh()
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [refresh]);

  // Update window title to show current session duration
  useEffect(() => {
    if (!activeSession) {
      getCurrentWindow().setTitle("Labor Tracker").catch(() => {});
      return;
    }
    const interval = setInterval(() => {
      const secs = secondsSince(activeSession.started_at);
      setActiveDelta(secs);
      getCurrentWindow()
        .setTitle(`Labor Tracker — ${formatDurationShort(secs)}`)
        .catch(() => {});
    }, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  async function handleClockIn(clientId: number | null, notes: string) {
    const session = await clockIn(clientId, notes);
    setActiveSession(session);
    setActiveDelta(0);
  }

  async function handleClockOut(notes: string) {
    if (!activeSession) return;
    await clockOut(activeSession.id, notes);
    setActiveSession(null);
    setActiveDelta(0);
    await getCurrentWindow().setTitle("Labor Tracker").catch(() => {});
    await refresh();
  }

  async function handleAddClient(name: string, rate: number | null, color: string) {
    await addClient(name, rate, color);
    const updated = await loadClients();
    setClients(updated);
  }

  async function handleDeleteSession(id: number) {
    await deleteSession(id);
    const updated = await loadSessions();
    setSessions(updated);
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <span className="text-muted text-sm">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-3">
        <span className="text-danger text-sm">Failed to initialize database</span>
        <span className="text-muted text-xs font-mono">{error}</span>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-bg overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-accent text-lg">◷</span>
          <span className="font-semibold text-white tracking-tight">Labor Tracker</span>
        </div>
        <div className="flex items-center gap-2">
          {clients.length > 0 && (
            <div className="flex items-center gap-1.5">
              {clients.slice(0, 5).map((c) => (
                <span
                  key={c.id}
                  title={c.name}
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    background: `${c.color}22`,
                    color: c.color,
                    border: `1px solid ${c.color}44`,
                  }}
                >
                  {c.name}
                </span>
              ))}
            </div>
          )}
          <button
            onClick={() => setShowAddClient(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted hover:text-white hover:border-[#444] transition-colors"
          >
            <span className="text-base leading-none">+</span> Client
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Clock panel */}
        <div className="flex justify-center px-6 py-10 border-b border-border">
          <ClockPanel
            clients={clients}
            activeSession={activeSession}
            onClockIn={handleClockIn}
            onClockOut={handleClockOut}
          />
        </div>

        {/* Stats */}
        <div className="px-6 py-5 border-b border-border">
          <StatsBar sessions={sessions} activeDelta={activeDelta} />
        </div>

        {/* Session history */}
        <div className="px-6 py-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-muted uppercase tracking-wider font-medium">
              Session History
            </span>
            <span className="text-xs text-muted">
              {sessions.length} {sessions.length === 1 ? "session" : "sessions"}
            </span>
          </div>
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <SessionHistory sessions={sessions} onDelete={handleDeleteSession} />
          </div>
        </div>
      </main>

      {showAddClient && (
        <AddClientModal
          onAdd={handleAddClient}
          onClose={() => setShowAddClient(false)}
        />
      )}
    </div>
  );
}
