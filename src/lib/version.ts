import { getVersion, getTauriVersion } from "@tauri-apps/api/app";

/** Injected by Vite from package.json — see `define` in vite.config.ts. */
declare const __APP_VERSION__: string;

export interface VersionInfo {
  /** App version, e.g. "0.1.0". */
  app: string;
  /** Tauri runtime version, or null when running outside the desktop shell. */
  tauri: string | null;
}

/**
 * Version compiled into the bundle from package.json. tauri.conf.json reads its
 * version from the same file, so this matches what the installed app reports.
 */
export const BUILD_VERSION = __APP_VERSION__;

/**
 * Reads the version from the Tauri shell, falling back to the compiled-in value
 * when there is no shell (plain `npm run dev` in a browser).
 */
export async function loadVersion(): Promise<VersionInfo> {
  try {
    const [app, tauri] = await Promise.all([getVersion(), getTauriVersion()]);
    return { app, tauri };
  } catch {
    return { app: BUILD_VERSION, tauri: null };
  }
}
