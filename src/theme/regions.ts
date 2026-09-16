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

/**
 * The main region's own design space.
 *
 * Everything that plays in the main region is comped on a 1920x1080 frame (Figma
 * `Screen-Video_01` .. `Screen-Video_07`), while `REGIONS.main` is 1024x640. So the screen
 * is a 16:9 box centred in that region, and everything inside it is laid out in the comps'
 * own pixels and scaled down once by `SCREEN_SCALE`. A measurement off the comp can be
 * typed in as it is written, which is the whole point of the indirection.
 *
 * The bands above and below the screen are the same design space the region sits in: black,
 * because the brief leaves them black.
 */
export const SCREEN = { w: 1920, h: 1080 } as const;

export const SCREEN_SCALE = REGIONS.main.w / SCREEN.w;

export const SCREEN_BOX: Rect = {
  x: 0,
  y: (REGIONS.main.h - SCREEN.h * SCREEN_SCALE) / 2,
  w: SCREEN.w * SCREEN_SCALE,
  h: SCREEN.h * SCREEN_SCALE,
};
