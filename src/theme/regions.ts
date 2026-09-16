import type { CSSProperties } from "react";

/**
 * The wall's raster and where each part of it sits, in design pixels.
 *
 * Measured from `reference.png` (the brief), which is a 1920x1080 full screen with three
 * regions flush to its edges. The black between them is design space, not dead pixels: it
 * is empty now because the brief leaves it empty, and it is the place a revised comp's
 * branding goes. A revised comp is an edit to this file and nothing else.
 */
export const STAGE = { w: 1920, h: 1080 } as const;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const REGIONS = {
  /** The loop: countdown, film, countdown, film, interstitial. Films are 16:9 inside it. */
  main: { x: 0, y: 0, w: 1024, h: 640 },
  /** UP NEXT: {NAME}'S JOURNEY. */
  upNext: { x: 1664, y: 0, w: 256, h: 256 },
  /** B-roll highlights, looping on their own. */
  bRoll: { x: 0, y: 824, w: 256, h: 256 },
} as const satisfies Record<string, Rect>;

export function rectStyle(rect: Rect): CSSProperties {
  return { position: "absolute", left: rect.x, top: rect.y, width: rect.w, height: rect.h };
}
