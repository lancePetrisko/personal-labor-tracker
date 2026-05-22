/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        mono: ["'JetBrains Mono'", "'Fira Code'", "Consolas", "monospace"],
      },
      colors: {
        bg: "#0a0a0a",
        surface: "#141414",
        "surface-2": "#1e1e1e",
        border: "#2a2a2a",
        accent: "#6366f1",
        "accent-hover": "#4f46e5",
        active: "#22c55e",
        "active-hover": "#16a34a",
        danger: "#ef4444",
        muted: "#666",
      },
      animation: {
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};
