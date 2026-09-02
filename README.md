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

### Step-by-step: building on an Apple Silicon Mac (M1/M2/M3)

This walkthrough produces `Labor Tracker.app` and a `.dmg` for the `aarch64-apple-darwin` target —
the native architecture of an M1 MacBook. Total time on a first build is roughly 5–8 minutes, almost
all of it Cargo compiling the Rust dependencies.

**1. Install the Xcode command line tools**

```bash
xcode-select --install
```

If it prints `command line tools are already installed`, you are done with this step. This provides
`clang`, `ld`, and the macOS SDK that the Rust linker needs.

**2. Install Rust**

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

Accept the default installation. Then either restart your terminal or run:

```bash
source "$HOME/.cargo/env"
```

**3. Confirm the toolchain targets Apple Silicon**

```bash
rustc -vV | grep host
# host: aarch64-apple-darwin
```

If it says `x86_64-apple-darwin`, your terminal is running under Rosetta. Quit it, uncheck
**Open using Rosetta** in Finder (right-click Terminal → Get Info), reopen, and reinstall Rust.

**4. Install Node.js 18 or later**

```bash
node --version
```

If Node is missing or older than v18, install it from [nodejs.org](https://nodejs.org) or with
Homebrew (`brew install node`).

**5. Clone and install dependencies**

```bash
git clone https://github.com/lancePetrisko/personal-labor-tracker.git
cd personal-labor-tracker
npm install
```

**6. Sanity check in dev mode (optional but recommended)**

```bash
npm run tauri dev
```

An app window should open. Confirm you can clock in and out, then quit the window before building —
a running dev instance holds a lock on the build directory.

**7. Build the release bundle**

```bash
npm run tauri build
```

Cargo compiles in release mode with optimizations, so expect several minutes and a warm laptop. The
build finishes with a line pointing at the bundle directory.

**8. Collect the output**

```bash
open src-tauri/target/release/bundle/macos/     # the .app
open src-tauri/target/release/bundle/dmg/       # the .dmg
```

| File                                      | What to do with it                       |
| ----------------------------------------- | ---------------------------------------- |
| `macos/Labor Tracker.app`                 | Drag into `/Applications` to install     |
| `dmg/Labor Tracker_0.1.0_aarch64.dmg`     | Hand to someone else with an M-series Mac |

**9. Install it**

Double-click the `.dmg` and drag the app onto **Applications** — see
[Installing from the .dmg](#installing-from-the-dmg-macos) below for the full flow.

The installed app reads and writes
`~/Library/Application Support/com.labortracker.app/labor.db` — the same file `npm run tauri dev`
uses, so any sessions you logged in dev mode are already there.

**Troubleshooting**

| Symptom                                              | Fix                                                                                     |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `xcrun: error: invalid active developer path`         | Rerun `xcode-select --install`                                                            |
| `linker 'cc' not found`                               | Command line tools missing — same fix as above                                            |
| `error: failed to run custom build command for ...`   | `cd src-tauri && cargo clean`, then rebuild                                               |
| Port 1420 already in use during `tauri dev`           | Another dev instance is running — `lsof -ti:1420 \| xargs kill`                            |
| Build succeeds but no `.dmg`                          | The dmg step needs a GUI session; do not run the build over plain SSH                     |
| `"Labor Tracker" is damaged and can't be opened`      | Gatekeeper quarantine — see the next section                                              |

### Installing from the .dmg (macOS)

On macOS the `.dmg` **is** the installer — there is no separate `setup.exe`-style program to run. The
build produces one at:

```
src-tauri/target/release/bundle/dmg/Labor Tracker_<version>_aarch64.dmg
```

**To install:**

1. Double-click the `.dmg` (or run `open "src-tauri/target/release/bundle/dmg/Labor Tracker_0.1.0_aarch64.dmg"`).
2. A window opens showing the app icon next to an **Applications** shortcut.
3. Drag **Labor Tracker** onto **Applications**.
4. Eject the mounted disk image — drag it to the Trash, or `Cmd`+`E` in Finder.
5. Launch from Launchpad, Spotlight, or `/Applications`.

The same thing from the terminal, if you prefer:

```bash
cp -R "src-tauri/target/release/bundle/macos/Labor Tracker.app" /Applications/
open "/Applications/Labor Tracker.app"
```

**To uninstall,** drag the app out of `/Applications`. That leaves your data behind — delete
`~/Library/Application Support/com.labortracker.app/` as well if you want it gone.

> **Note:** Tauri's macOS bundler emits `.app` and `.dmg` only — there is no `.pkg` target. A `.pkg`
> would need `pkgbuild`/`productbuild` by hand, and unsigned it hits the same Gatekeeper prompt the
> `.dmg` does, so it buys nothing for personal use.

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
