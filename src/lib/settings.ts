export interface Settings {
  /** Rows of session history visible before the list scrolls. */
  historyLength: number;
}

export const DEFAULT_SETTINGS: Settings = {
  historyLength: 5,
};

export const HISTORY_LENGTH_MIN = 1;
export const HISTORY_LENGTH_MAX = 100;

export function clampHistoryLength(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_SETTINGS.historyLength;
  return Math.min(HISTORY_LENGTH_MAX, Math.max(HISTORY_LENGTH_MIN, Math.round(n)));
}

/** Turn the raw key/value rows from SQLite into a typed Settings object. */
export function parseSettings(rows: Record<string, string>): Settings {
  return {
    historyLength:
      rows.historyLength != null
        ? clampHistoryLength(Number(rows.historyLength))
        : DEFAULT_SETTINGS.historyLength,
  };
}
