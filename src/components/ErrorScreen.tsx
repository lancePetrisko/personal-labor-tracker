import { useState } from "react";

interface Props {
  title: string;
  error: string;
  version: string;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  }
}

export default function ErrorScreen({ title, error, version }: Props) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function handleCopy() {
    const report = `${title}\n${error}\n\nLabor Tracker v${version} · ${navigator.userAgent}`;
    setStatus((await copyText(report)) ? "copied" : "failed");
    setTimeout(() => setStatus("idle"), 2000);
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center gap-4 px-6">
      <span className="text-danger text-sm font-medium">{title}</span>
      <pre className="max-w-lg w-full bg-surface border border-border px-4 py-3 text-xs text-muted font-mono whitespace-pre-wrap break-words select-text">
        {error}
      </pre>
      <button
        onClick={handleCopy}
        className="h-9 px-4 border border-border bg-surface-2 text-xs font-semibold tracking-[0.15em] uppercase text-white hover:border-[#444] transition-colors"
      >
        {status === "copied" ? "Copied" : status === "failed" ? "Copy failed — select text above" : "Copy error"}
      </button>
    </div>
  );
}
