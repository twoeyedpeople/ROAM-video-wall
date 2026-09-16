/**
 * The brand art the wall's comps use, and the geometry that comes with it.
 *
 * All four files are the wall comp's own Figma exports rather than copies of the tablet's.
 * The tablet holds the same two marks at its own crops (`roam-tablet/public/assets/download`)
 * and the three apps share no code, so a second export here is cheaper than reconciling
 * them: the numbers below are the ones the wall's comps are drawn against.
 *
 * Swap a file and keep the path. If a mark's proportions change, change the constant beside
 * it too, because every caller sizes itself from one dimension and takes the other from here.
 */
export const BRAND_ART = {
  /** MUSTANG mach-e. Runs vertically down the film's edges and sits under the campaign line. */
  macheWordmark: "/assets/wall/brand/mache-wordmark.png",
  /** The outline ROAM logo, with the Mustang pony inside the O. */
  roamLogo: "/assets/wall/brand/roam-logo.svg",
  /** The Ford script, as it lands between STAR IN and YOUR. */
  fordScript: "/assets/wall/brand/ford-script.svg",
  /**
   * The film still every card is built over: tinted Skyview and held at a few per cent, it
   * is texture rather than a picture. The comps use one frame throughout.
   */
  backdrop: "/assets/wall/brand/backdrop.png",
} as const;

/**
 * The mach-e export is a wider plate than the mark itself, so every use crops it. The mark
 * reads 222.621 long by 38 thick inside a plate 118.47% x 362.39% of that window, offset up
 * and left. Figma's own percentages, and the same ones the tablet's `MacheWordmark` uses.
 */
export const MACHE = {
  length: 222.621,
  thickness: 38,
  plateWidth: "118.47%",
  plateHeight: "362.39%",
  plateLeft: "-9.35%",
  plateTop: "-145.12%",
} as const;

/** The ROAM logo's export, 5.028:1. Callers give a width and take the height from here. */
export const ROAM_LOGO = { w: 138.168, h: 27.4781 } as const;

/** The Ford script's export. */
export const FORD_SCRIPT = { w: 302.28, h: 119.197 } as const;
