/** @type {import('tailwindcss').Config} */
// Design tokens. Values are intentionally literal hex rather than var(--token):
// Tailwind's opacity modifiers (e.g. `bg-primary/90`, `ring-primary/40`) are used
// throughout the app and do NOT work against a plain `var()` colour. The same
// values are mirrored as CSS custom properties in src/index.css for hand-written
// CSS; keep the two in sync.
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#eef7fb",
          100: "#d5eaf3",
          300: "#7fbcd7",
          500: "#217aa3",
          600: "#1b6485",
          700: "#154e68",
          DEFAULT: "#217aa3", // brand anchor, retained for continuity
        },
        surface: "#ffffff",
        canvas: "#f1f5f9",
        ink: "#0f172a", // 16.1:1 on white
        muted: "#64748b", // 4.76:1 on white — AA body text
        success: { DEFAULT: "#15803d", bg: "#f0fdf4" },
        warning: { DEFAULT: "#a16207", bg: "#fefce8" },
        danger: { DEFAULT: "#b91c1c", bg: "#fef2f2" },
        info: { DEFAULT: "#1d4ed8", bg: "#eff6ff" },
      },
      fontFamily: {
        sans: [
          "Segoe UI", "system-ui", "-apple-system", "BlinkMacSystemFont",
          "Noto Sans Arabic", "Helvetica Neue", "Arial", "sans-serif",
        ],
        mono: [
          "Share Tech Mono", "SFMono-Regular", "Menlo", "Consolas",
          "Liberation Mono", "monospace",
        ],
      },
      borderRadius: {
        md: "0.5rem",
        lg: "0.75rem",
        xl: "1rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.06)",
        overlay: "0 20px 50px rgba(15,23,42,0.18)",
      },
      screens: {
        // Only ADD a breakpoint below Tailwind's smallest. The defaults
        // (sm 640 / md 768 / lg 1024 / xl 1280) are deliberately left intact —
        // redefining them would silently shift every existing responsive class
        // across the app. Verified viewports 360/390 fall below `sm` (base
        // styles), 768 = md, 1024 = lg, 1440 = xl.
        xs: "360px",
      },
    },
  },
  plugins: [],
};
