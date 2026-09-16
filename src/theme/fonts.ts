/**
 * The ROAM type roles the wall uses, copied from `roam-tablet/src/theme/fonts.ts` along
 * with the files in `./fonts/`. Components name a role (`font-headline`, `font-ui`,
 * `font-body`), never a typeface, so re-licensing a face touches this file only.
 *
 * Licensing state is the tablet's: FranklinCondITC Ultra, Modern Gothic and Ford F-1 VF are
 * held. The tablet's fourth role, Ticketing, is deliberately not copied: its commercial
 * licence is unconfirmed and nothing on the wall calls for it. Add it back only once the
 * licence is settled.
 *
 * `localFont` rather than a hand-written `@font-face` because it fails the build when a
 * file is missing, where a hand-written rule silently falls back.
 */

import localFont from "next/font/local";

/** Display type: the countdown title, the digits and the Up Next name. */
export const headlineFont = localFont({
  src: [{ path: "./fonts/headline.woff2", weight: "100 900", style: "normal" }],
  variable: "--font-headline",
  display: "swap",
  // Franklin ships as a single Ultra weight; declaring the whole range stops the browser
  // synthesising a bold or a condense for it.
  declarations: [{ prop: "font-stretch", value: "50% 200%" }],
  adjustFontFallback: false,
  fallback: ["ITC Franklin Gothic Cond", "Impact", "Arial", "sans-serif"],
});

/** Tracked-out caps labels ("UP NEXT:"), and the debug overlay. */
export const uiFont = localFont({
  src: [
    { path: "./fonts/ui-regular.woff2", weight: "400", style: "normal" },
    // Regular and Medium are held, Bold is not, so Medium covers 500-700.
    { path: "./fonts/ui-medium.woff2", weight: "500 700", style: "normal" },
  ],
  variable: "--font-ui",
  display: "swap",
  fallback: ["Arial", "sans-serif"],
});

/** Body copy. Ford F-1 VF, Latin subset, one variable file covering Light to Bold. */
export const bodyFont = localFont({
  src: [{ path: "./fonts/body.woff2", weight: "300 700", style: "normal" }],
  variable: "--font-body",
  display: "swap",
  fallback: ["Arial", "sans-serif"],
});

/** Applied once, on `<html>`. */
export const fontVariables = [headlineFont.variable, uiFont.variable, bodyFont.variable].join(" ");
