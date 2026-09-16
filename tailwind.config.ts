import type { Config } from "tailwindcss";

/**
 * The ROAM tokens the wall uses, copied from `roam-tablet/tailwind.config.ts` rather than
 * shared: the three ROAM apps share no code, and a palette is small enough that a copy is
 * cheaper than a package. If the brand moves, move both.
 *
 * Colours are literal values, not `var()`, for the reason the tablet gives: on Tailwind 3 a
 * `var()` colour silently breaks every opacity modifier.
 */
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ford: {
          skyview: "#066fef",
          bright: "#0073f9",
        },
        paper: "#f9faf9",
        ink: "#000000",
        muted: "rgba(255, 255, 255, 0.45)",
        line: "rgba(255, 255, 255, 0.18)",
      },
      fontFamily: {
        // Components name a role, never a typeface; see `src/theme/fonts.ts`.
        headline: ["var(--font-headline)", "ITC Franklin Gothic Cond", "Arial", "sans-serif"],
        ui: ["var(--font-ui)", "Arial", "sans-serif"],
        body: ["var(--font-body)", "Arial", "sans-serif"],
      },
      letterSpacing: {
        caps: "0.14em",
        display: "-0.01em",
      },
      transitionTimingFunction: {
        roam: "cubic-bezier(0.22, 0.61, 0.36, 1)",
      },
      keyframes: {
        // One countdown digit: lands big and settles, then the next replaces it.
        "count-in": {
          "0%": { opacity: "0", transform: "scale(1.35)" },
          "18%": { opacity: "1", transform: "scale(1)" },
          "82%": { opacity: "1", transform: "scale(1)" },
          "100%": { opacity: "0", transform: "scale(0.94)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        // Must match COUNTDOWN_STEP_MS in `src/machine/timings.ts`.
        "count-in": "count-in 1000ms cubic-bezier(0.22, 0.61, 0.36, 1) both",
        "fade-in": "fade-in 400ms cubic-bezier(0.22, 0.61, 0.36, 1) both",
      },
    },
  },
  plugins: [],
} satisfies Config;
