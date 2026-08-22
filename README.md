# Labor Tracker

A lightweight desktop app for tracking billable hours by client. Built with Tauri v2, React, and SQLite — data stays local on your machine.

![Stack](https://img.shields.io/badge/Tauri-v2-blue) ![Stack](https://img.shields.io/badge/React-18-61DAFB) ![Stack](https://img.shields.io/badge/SQLite-local-green)

## Features

- Clock in / clock out with a live running timer
- Per-client session tracking with color coding
- Notes on each session
- Stats for today, this week, this month, and all time
- Window title updates with elapsed time while clocked in
- Session history with delete

## Prerequisites

### 1. Node.js

Download and install from [nodejs.org](https://nodejs.org) (v18 or later).

### 2. Rust

Install from [rustup.rs](https://rustup.rs):

```
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

On Windows, run the installer from the site. After installing, restart your terminal.

### 3. Tauri system dependencies

**Windows**

- [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) — install the **"Desktop development with C++"** workload
- WebView2 — already included on Windows 10 (1803+) and Windows 11

**macOS**

```
xcode-select --install
```

**Linux (Debian/Ubuntu)**

```
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
```

## Getting Started

```bash
# 1. Clone the repo
git clone https://github.com/lancePetrisko/personal-labor-tracker.git
cd personal-labor-tracker

# 2. Install JS dependencies
npm install

# 3. Run in development mode
npm run tauri dev
```

The first run takes 3–5 minutes while Cargo compiles Tauri and its dependencies. Subsequent runs are fast.

## Building a release binary

```bash
npm run tauri build
```

This compiles the frontend, builds the Rust backend in release mode, and bundles everything into installers. The first build takes ~5 minutes; subsequent builds are much faster.

Output files land in `src-tauri/target/release/bundle/`. Which ones you get depends on the OS you build from — you cannot cross-compile a Windows installer from macOS or vice versa.

**Windows**

| File                                         | Description                                               |
| -------------------------------------------- | --------------------------------------------------------- |
| `nsis/Labor Tracker_<version>_x64-setup.exe` | Standard Windows installer (recommended for personal use) |
| `msi/Labor Tracker_<version>_x64_en-US.msi`  | MSI package for enterprise/Group Policy deployment        |

Run the `.exe` to install the app like any other Windows program.

**macOS**

| File                                              | Description                            |
| ------------------------------------------------- | -------------------------------------- |
| `macos/Labor Tracker.app`                         | The app bundle — drag to `/Applications` |
| `dmg/Labor Tracker_<version>_aarch64.dmg`         | Disk image for handing to someone else |

Builds target Apple Silicon (`aarch64-apple-darwin`) by default — that is your machine's native
architecture. For an Intel or universal build, pass a target explicitly:

```bash
npm run tauri build -- --target universal-apple-darwin   # requires: rustup target add x86_64-apple-darwin
```

### Unsigned builds on macOS

These builds are **not code-signed or notarized** (that needs a paid Apple Developer account). The app
you build yourself runs fine locally, but a `.dmg` copied to another Mac will be quarantined by
Gatekeeper — "Apple could not verify..." On that Mac, either right-click the app and choose **Open**
once, or strip the quarantine flag:

```bash
xattr -dr com.apple.quarantine "/Applications/Labor Tracker.app"
```

### Automated releases

Pushing a `v*` tag (e.g. `git tag v0.1.0 && git push origin v0.1.0`) triggers
`.github/workflows/release.yml`, which builds on both `macos-latest` and `windows-latest` and attaches
the installers to a **draft** GitHub Release. The same Gatekeeper caveat applies to the CI `.dmg`.

## Where data is stored

The SQLite database (`labor.db`) is stored in the OS app data directory:

| OS      | Path                                                           |
| ------- | -------------------------------------------------------------- |
| Windows | `C:\Users\<you>\AppData\Roaming\com.labortracker.app\labor.db` |
| macOS   | `~/Library/Application Support/com.labortracker.app/labor.db`  |
| Linux   | `~/.local/share/com.labortracker.app/labor.db`                 |

You can open this file with any SQLite viewer (e.g. [DB Browser for SQLite](https://sqlitebrowser.org/)) to inspect or back up your data.

## Project structure

```
personal-labor-tracker/
├── src/                        # React frontend
│   ├── App.tsx                 # Root component, state, DB calls
│   ├── components/
│   │   ├── ClockPanel.tsx      # Clock in/out button + live timer
│   │   ├── LiveTimer.tsx       # Ticking HH:MM:SS display
│   │   ├── SessionHistory.tsx  # History table
│   │   ├── StatsBar.tsx        # Today/week/month/all-time totals
│   │   └── AddClientModal.tsx  # Add client dialog
│   └── lib/
│       ├── db.ts               # All SQLite operations
│       ├── types.ts            # TypeScript interfaces
│       └── utils.ts            # Date/duration formatting helpers
├── src-tauri/                  # Rust / Tauri backend
│   ├── src/
│   │   ├── main.rs
│   │   └── lib.rs              # Tauri builder with SQL plugin
│   ├── capabilities/
│   │   └── default.json        # SQL permissions
│   └── tauri.conf.json         # App config (window size, identifier)
├── index.html
├── vite.config.ts
└── tailwind.config.js
```

## Roadmap

- [ ] GitHub integration — attach commits/PRs to sessions via GitHub API
- [ ] CSV export for invoicing
- [ ] Earnings view (hourly rate × hours per client)
- [ ] Edit session notes after the fact
- [ ] Feature for editing how long you worked in case the client crashes
