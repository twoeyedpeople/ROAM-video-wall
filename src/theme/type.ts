/**
 * Fits a line of headline type to a width without measuring it.
 *
 * FranklinCondITC Ultra's capitals average close to this fraction of the font size in
 * advance width, so a name's length predicts its width well enough for a screen with no
 * scroll and no second chance. It errs a little wide, so a fitted line lands just inside.
 */
const CONDENSED_CAPS_EM = 0.46;

export function fitHeadline(text: string, width: number, maxPx: number): number {
  const longest = Math.max(1, ...text.split("\n").map((line) => line.length));
  return Math.min(maxPx, Math.floor(width / (CONDENSED_CAPS_EM * longest)));
}

/**
 * Cap height as a fraction of the font size, per type role.
 *
 * The comps place every line by its capitals, not by a line box, and are marked up with
 * `text-box-trim`, so a measurement off the comp is a cap height. `capSize` turns one back
 * into the font size that produces it, and `.cap-trim` in `globals.css` makes the element
 * box the cap box so the number lands where the comp puts it.
 *
 * Both are measured from the licensed files as the browser renders them, not from Figma's
 * own text nodes, which report a slightly taller cap for Franklin than the woff2 draws.
 * Re-measure by reading the height of a `.cap-trim` element back off the page and dividing
 * by its font size; a wrong ratio here moves every line on the wall at once.
 */
export const CAP_RATIO = { headline: 0.667, ui: 0.69 } as const;

export function capSize(capHeight: number, role: keyof typeof CAP_RATIO): number {
  return capHeight / CAP_RATIO[role];
}
