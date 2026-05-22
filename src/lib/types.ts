export interface Client {
  id: number;
  name: string;
  hourly_rate: number | null;
  color: string;
}

export interface Session {
  id: number;
  client_id: number | null;
  client_name: string | null;
  client_color: string | null;
  started_at: string;
  ended_at: string | null;
  notes: string | null;
  duration_seconds: number | null;
}

export interface ActiveSession {
  id: number;
  client_id: number | null;
  started_at: string;
  notes: string;
}
