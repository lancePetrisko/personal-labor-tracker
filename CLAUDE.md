# Labor Tracker — Claude Code Guide

## Stack

- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS
- **Desktop shell:** Tauri v2 (Rust)
- **Database:** SQLite via `@tauri-apps/plugin-sql` / `tauri-plugin-sql`
- **Dev server port:** 1420

## Commands

```bash
npm run tauri dev       # Start dev app (Vite + Rust, first run ~5 min)
npm run dev             # Vite only (no Tauri window, for pure UI work)
npx tsc --noEmit        # Type check
npm run build           # Production frontend build
npm run tauri build     # Full release binary
```

## Architecture

All database logic lives in `src/lib/db.ts`. It exports async functions — never call `@tauri-apps/plugin-sql` directly from components. State is lifted to `App.tsx` and flows down as props; components do not fetch their own data.

```
App.tsx  →  ClockPanel, StatsBar, SessionHistory, AddClientModal
              ↓
           src/lib/db.ts  →  SQLite (labor.db)
```

## Key files

| File | Purpose |
|------|---------|
| `src/App.tsx` | Root state, all DB calls, layout |
| `src/lib/db.ts` | Every SQLite operation |
| `src/lib/types.ts` | `Client`, `Session`, `ActiveSession` interfaces |
| `src/lib/utils.ts` | Duration/date formatting, stats aggregation |
| `src/components/ClockPanel.tsx` | Clock in/out + live timer |
| `src/components/SessionHistory.tsx` | History table with delete |
| `src/components/StatsBar.tsx` | Today/week/month/all-time totals |
| `src-tauri/src/lib.rs` | Tauri builder — add new plugins here |
| `src-tauri/tauri.conf.json` | Window config, app identifier |
| `src-tauri/capabilities/default.json` | Tauri permission grants |

## Database schema

```sql
clients  (id, name, hourly_rate REAL, color TEXT)
sessions (id, client_id, started_at TEXT, ended_at TEXT, notes TEXT, duration_seconds INTEGER)
```

- `started_at` / `ended_at` are ISO 8601 strings (JavaScript `new Date().toISOString()`)
- An active session has `ended_at IS NULL`
- `duration_seconds` is written on clock-out; compute it as `Math.round((Date.now() - new Date(started_at)) / 1000)`

## Adding a new Tauri plugin

1. Add the crate to `src-tauri/Cargo.toml` under `[dependencies]`
2. Register it in `src-tauri/src/lib.rs` via `.plugin(...)`
3. Add the required permissions to `src-tauri/capabilities/default.json`

## Style conventions

- Dark theme: background `#0a0a0a`, surface `#141414`, border `#2a2a2a`
- Accent: `#6366f1` (indigo), active/clocked-in state: `#22c55e` (green)
- Timer digits use `font-mono` (JetBrains Mono)
- Tailwind utility classes only — no CSS modules, no inline style objects except for dynamic client colors
- Client colors are dynamic hex values from `CLIENT_COLORS` in `utils.ts`; use inline `style` for those

## Data file location

```
Windows  C:\Users\<user>\AppData\Roaming\com.labortracker.app\labor.db
macOS    ~/Library/Application Support/com.labortracker.app/labor.db
Linux    ~/.local/share/com.labortracker.app/labor.db
```

## Roadmap

- GitHub OAuth integration — attach commits/PRs to sessions
- CSV export for invoicing
- Earnings view (rate × hours per client)
- Edit session notes after clock-out
