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
