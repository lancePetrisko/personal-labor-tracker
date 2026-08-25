import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import type { Client, Session } from "./types";
import { sessionEarnings, summarize } from "./analytics";
import { formatCurrency, formatDate, formatDurationShort, formatTime } from "./utils";

export interface ReportOptions {
  client: Client;
  /** Already scoped to `client` and to the range — this function does not filter. */
  sessions: Session[];
  from: Date;
  /** Inclusive last day shown in the header, not the exclusive query bound. */
  to: Date;
  businessName: string;
  includeNotes: boolean;
  includeMoney: boolean;
}

const MARGIN = 48;
const INK = [24, 24, 27] as const;
const MUTED = [113, 113, 122] as const;
const RULE = [228, 228, 231] as const;
const ACCENT = "#6366f1";

/** "#6366f1" -> [99, 102, 241]. Falls back to the app accent for anything unparseable. */
function hexToRgb(hex: string | null): [number, number, number] {
  const value = /^#?([0-9a-f]{6})$/i.exec((hex ?? "").trim());
  const digits = value ? value[1] : ACCENT.slice(1);
  return [
    parseInt(digits.slice(0, 2), 16),
    parseInt(digits.slice(2, 4), 16),
    parseInt(digits.slice(4, 6), 16),
  ];
}

function slug(text: string): string {
  return (
    text
      .normalize("NFD")
      // Strip combining marks so "Ünïcode" becomes "Unicode" rather than "n-code".
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "client"
  );
}

function isoDay(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function reportFilename(client: Client, from: Date, to: Date): string {
  return `${slug(client.name)}-work-report-${isoDay(from)}-to-${isoDay(to)}.pdf`;
}

/** Renders the label/value summary strip as one borderless two-row table. */
function drawSummary(doc: jsPDF, y: number, cells: { label: string; value: string }[]): number {
  autoTable(doc, {
    startY: y,
    theme: "plain",
    margin: { left: MARGIN, right: MARGIN },
    head: [cells.map((c) => c.label.toUpperCase())],
    body: [cells.map((c) => c.value)],
    headStyles: {
      fontSize: 7,
      textColor: [...MUTED],
      fontStyle: "normal",
      cellPadding: { top: 8, right: 4, bottom: 2, left: 0 },
    },
    bodyStyles: {
      fontSize: 13,
      textColor: [...INK],
      fontStyle: "bold",
      cellPadding: { top: 0, right: 4, bottom: 10, left: 0 },
    },
  });
  return lastY(doc, y);
}

/** autoTable writes the finished table onto the doc; this reads its bottom edge back. */
function lastY(doc: jsPDF, fallback: number): number {
  const table = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable;
  return table?.finalY ?? fallback;
}

export function buildClientReport(opts: ReportOptions): Uint8Array {
  const { client, sessions, from, to, businessName, includeNotes, includeMoney } = opts;

  // A client with no hourly rate has nothing billable, and printing
  // "Total Billable $0.00" on a report they receive reads as a mistake.
  const showMoney = includeMoney && client.hourly_rate != null;

  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const right = pageWidth - MARGIN;

  // A report is printed and forwarded, so it is always light-on-white
  // regardless of the app's dark theme.
  const totals = summarize(sessions, [client]);
  const heading = businessName.trim() || "Labor Tracker";
  const generatedAt = new Date();

  // --- Header ---------------------------------------------------------------
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...INK);
  doc.text(heading, MARGIN, MARGIN + 4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text("WORK REPORT", right, MARGIN + 4, { align: "right" });

  doc.setDrawColor(...hexToRgb(client.color));
  doc.setLineWidth(2);
  doc.line(MARGIN, MARGIN + 16, right, MARGIN + 16);

  // --- Meta -----------------------------------------------------------------
  let y = MARGIN + 38;
  const meta: [string, string][] = [
    ["Client", client.name],
    ["Period", `${formatDate(from.toISOString())} — ${formatDate(to.toISOString())}`],
    ["Generated", formatDate(generatedAt.toISOString())],
  ];
  doc.setFontSize(9);
  for (const [label, value] of meta) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text(label, MARGIN, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...INK);
    doc.text(value, MARGIN + 62, y);
    y += 14;
  }

  // --- Summary strip --------------------------------------------------------
  const avgSeconds = totals.count > 0 ? Math.round(totals.seconds / totals.count) : 0;
  const summary = [
    { label: "Total Hours", value: formatDurationShort(totals.seconds) },
    { label: "Sessions", value: String(totals.count) },
    { label: "Avg Session", value: formatDurationShort(avgSeconds) },
  ];
  if (showMoney) {
    summary.push({ label: "Rate", value: `${formatCurrency(client.hourly_rate ?? 0)}/hr` });
    summary.push({ label: "Total Billable", value: formatCurrency(totals.earnings) });
  }
  y = drawSummary(doc, y + 4, summary) + 18;

  // --- Session detail -------------------------------------------------------
  const head: string[] = ["Date", "Start", "End", "Duration"];
  if (includeNotes) head.push("Notes");
  if (showMoney) head.push("Amount");

  const body = sessions.map((s) => {
    const row: string[] = [
      formatDate(s.started_at),
      formatTime(s.started_at),
      s.ended_at ? formatTime(s.ended_at) : "—",
      formatDurationShort(s.duration_seconds ?? 0),
    ];
    if (includeNotes) row.push(s.notes ?? "");
    if (showMoney) row.push(formatCurrency(sessionEarnings(s, [client])));
    return row;
  });

  const totalRow: string[] = ["Total", "", "", formatDurationShort(totals.seconds)];
  if (includeNotes) totalRow.push(`${totals.count} ${totals.count === 1 ? "session" : "sessions"}`);
  if (showMoney) totalRow.push(formatCurrency(totals.earnings));

  // Notes, when present, soaks up the remaining width so long notes wrap instead
  // of pushing the money column off the page. With no Notes column there is
  // nothing to absorb the slack, so the fixed widths are scaled up to fill the
  // page — otherwise autoTable leaves a ragged gap and warns about it.
  const available = pageWidth - MARGIN * 2;
  const fixed = [78, 52, 52, 58];
  if (showMoney) fixed.push(66);
  const scale = includeNotes ? 1 : available / fixed.reduce((sum, w) => sum + w, 0);

  const columnStyles: Record<string, { cellWidth?: number | "auto"; halign?: "left" | "right" }> = {
    0: { cellWidth: fixed[0] * scale },
    1: { cellWidth: fixed[1] * scale },
    2: { cellWidth: fixed[2] * scale },
    3: { cellWidth: fixed[3] * scale, halign: "right" },
  };
  if (includeNotes) columnStyles[4] = { cellWidth: "auto" };
  if (showMoney) {
    columnStyles[includeNotes ? 5 : 4] = { cellWidth: fixed[4] * scale, halign: "right" };
  }

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN, bottom: MARGIN + 12 },
    head: [head],
    body,
    foot: [totalRow],
    showHead: "everyPage",
    showFoot: "lastPage",
    styles: {
      font: "helvetica",
      fontSize: 8.5,
      cellPadding: 5,
      textColor: [...INK],
      lineColor: [...RULE],
      lineWidth: 0.5,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: hexToRgb(ACCENT),
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: [244, 244, 245] },
    footStyles: {
      fillColor: [255, 255, 255],
      textColor: [...INK],
      fontStyle: "bold",
      fontSize: 9,
    },
    columnStyles,
    didDrawPage: (data) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...MUTED);
      const footY = pageHeight - MARGIN + 12;
      doc.text(`${heading} · ${client.name}`, MARGIN, footY);
      doc.text(`Page ${data.pageNumber} of {tp}`, right, footY, { align: "right" });
    },
  });

  // Backfills the {tp} placeholder now that the page count is known.
  doc.putTotalPages("{tp}");

  return new Uint8Array(doc.output("arraybuffer"));
}
