export type RangeKey = "7d" | "30d" | "90d" | "year" | "all";

export const RANGE_KEYS: RangeKey[] = ["7d", "30d", "90d", "year", "all"];

export const RANGE_LABELS: Record<RangeKey, string> = {
  "7d": "7 Days",
  "30d": "30 Days",
  "90d": "90 Days",
  year: "This Year",
  all: "All Time",
};

export interface Settings {
  /** Rows of session history visible before the list scrolls. */
  historyLength: number;
  /** Window the Dashboard tab aggregates over. */
  dashboardRange: RangeKey;
  /** Name printed at the top of exported client reports. Blank falls back to "Labor Tracker". */
  businessName: string;
}

export const DEFAULT_SETTINGS: Settings = {
  historyLength: 5,
  dashboardRange: "30d",
  businessName: "",
};

export const BUSINESS_NAME_MAX = 60;

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
    dashboardRange: RANGE_KEYS.includes(rows.dashboardRange as RangeKey)
      ? (rows.dashboardRange as RangeKey)
      : DEFAULT_SETTINGS.dashboardRange,
    businessName:
      rows.businessName != null
        ? rows.businessName.slice(0, BUSINESS_NAME_MAX)
        : DEFAULT_SETTINGS.businessName,
  };
}
