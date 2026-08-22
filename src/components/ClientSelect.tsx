import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Client } from "../lib/types";

interface Props {
  clients: Client[];
  value: number | null;
  onChange: (id: number | null) => void;
  disabled?: boolean;
}

const NO_CLIENT = -1;

export default function ClientSelect({ clients, value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [dropUp, setDropUp] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const options: { id: number; name: string; color: string | null; rate: number | null }[] = [
    { id: NO_CLIENT, name: "No client", color: null, rate: null },
    ...clients.map((c) => ({ id: c.id, name: c.name, color: c.color, rate: c.hourly_rate })),
  ];

  const selectedIndex = Math.max(0, options.findIndex((o) => o.id === (value ?? NO_CLIENT)));
  const selected = options[selectedIndex];

  // Close on outside click / window blur
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onBlur() {
      setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("blur", onBlur);
    };
  }, [open]);

  // Flip upward when there is not enough room below
  useLayoutEffect(() => {
    if (!open) return;
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const needed = Math.min(options.length * 40 + 8, 248);
    setDropUp(rect.bottom + needed > window.innerHeight && rect.top > needed);
  }, [open, options.length]);

  // Keep the highlighted row in view
  useEffect(() => {
    if (!open) return;
    listRef.current?.children[highlight]?.scrollIntoView({ block: "nearest" });
  }, [open, highlight]);

  function openMenu(startIndex = selectedIndex) {
    if (disabled) return;
    setHighlight(startIndex);
    setOpen(true);
  }

  function commit(index: number) {
    const opt = options[index];
    if (opt) onChange(opt.id === NO_CLIENT ? null : opt.id);
    setOpen(false);
    buttonRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    switch (e.key) {
      case "Escape":
        e.preventDefault();
        setOpen(false);
        buttonRef.current?.focus();
        break;
      case "ArrowDown":
        e.preventDefault();
        setHighlight((i) => (i + 1) % options.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlight((i) => (i - 1 + options.length) % options.length);
        break;
      case "Home":
        e.preventDefault();
        setHighlight(0);
        break;
      case "End":
        e.preventDefault();
        setHighlight(options.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        commit(highlight);
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={handleKeyDown}
        className={`
          w-full flex items-center gap-2 bg-surface-2 border rounded-lg px-3 py-2
          text-sm text-left transition-colors duration-150 disabled:opacity-50
          focus:outline-none
          ${open ? "border-accent" : "border-border hover:border-[#3a3a3a]"}
        `}
      >
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: selected.color ?? "#3a3a3a" }}
        />
        <span className={`flex-1 truncate ${selected.id === NO_CLIENT ? "text-muted" : "text-white"}`}>
          {selected.name}
        </span>
        {selected.rate != null && (
          <span className="text-xs text-muted font-mono shrink-0">${selected.rate.toFixed(2)}/hr</span>
        )}
        <svg
          viewBox="0 0 12 12"
          className={`w-3 h-3 shrink-0 text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2.5 4.5 6 8l3.5-3.5" />
        </svg>
      </button>

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          tabIndex={-1}
          onKeyDown={handleKeyDown}
          className={`
            absolute z-50 left-0 right-0 max-h-60 overflow-y-auto p-1
            bg-surface-2 border border-border rounded-lg shadow-xl shadow-black/60
            dropdown-in
            ${dropUp ? "bottom-full mb-1 origin-bottom" : "top-full mt-1 origin-top"}
          `}
        >
          {options.map((opt, i) => {
            const isSelected = i === selectedIndex;
            return (
              <li
                key={opt.id}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setHighlight(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => commit(i)}
                className={`
                  flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer
                  ${highlight === i ? "bg-[#2a2a2a]" : ""}
                `}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: opt.color ?? "#3a3a3a" }}
                />
                <span className={`flex-1 truncate text-sm ${opt.id === NO_CLIENT ? "text-muted" : "text-white"}`}>
                  {opt.name}
                </span>
                {opt.rate != null && (
                  <span className="text-xs text-muted font-mono shrink-0">${opt.rate.toFixed(2)}/hr</span>
                )}
                <svg
                  viewBox="0 0 12 12"
                  className={`w-3 h-3 shrink-0 text-accent ${isSelected ? "opacity-100" : "opacity-0"}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2.5 6.5 5 9l4.5-5.5" />
                </svg>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
