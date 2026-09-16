import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { BRAND_ART, FORD_SCRIPT, MACHE, ROAM_LOGO } from "@/theme/brand";

/**
 * The small marks the main region's cards repeat.
 *
 * The two logos and the mach-e lockup are exported art. The registration crosshairs are
 * drawn, because Figma expresses them as plain rectangles rather than as a vector asset,
 * which is the same call the tablet's `ui/Marks.tsx` makes about the black ones on the phone.
 */

/** One crosshair: four Skyview bars around a gap. Figma 33361:21090 and its three siblings. */
const ARM = 15.568;
const BAR = 2.15;
export const MARK_SIZE = 43.31;

/** Where the four of them sit on the 1920x1080 frame. */
export const MARK_INSET = { left: 37, top: 36, right: 1833, bottom: 1006 } as const;

export type MarkCorner = "topLeft" | "topRight" | "bottomLeft" | "bottomRight";

const ALL_CORNERS: readonly MarkCorner[] = ["topLeft", "topRight", "bottomLeft", "bottomRight"];

export function RegistrationMark({ className, style }: { className?: string; style?: CSSProperties }) {
  const centre = MARK_SIZE / 2 - BAR / 2;
  return (
    // The positioned box is the inner one. A `relative` out here would beat a caller's
    // `absolute`, because Tailwind emits `relative` after it, and the marks would stack down
    // the frame in normal flow instead of sitting in the corners.
    <div
      aria-hidden
      className={cn("pointer-events-none", className)}
      style={{ width: MARK_SIZE, height: MARK_SIZE, ...style }}
    >
      <div className="relative h-full w-full">
        <span className="absolute left-0 bg-ford-skyview" style={{ top: centre, width: ARM, height: BAR }} />
        <span
          className="absolute bg-ford-skyview"
          style={{ left: MARK_SIZE - ARM, top: centre, width: ARM, height: BAR }}
        />
        <span className="absolute top-0 bg-ford-skyview" style={{ left: centre, width: BAR, height: ARM }} />
        <span
          className="absolute bg-ford-skyview"
          style={{ left: centre, top: MARK_SIZE - ARM, width: BAR, height: ARM }}
        />
      </div>
    </div>
  );
}

/**
 * The frame's crosshairs. The campaign card drops the bottom-right one, where the mach-e
 * lockup sits instead, which is what `corners` is for.
 */
export function RegistrationMarks({ corners = ALL_CORNERS }: { corners?: readonly MarkCorner[] }) {
  return (
    <>
      {corners.map((corner) => (
        <RegistrationMark
          key={corner}
          className="absolute"
          style={{
            left: corner === "topLeft" || corner === "bottomLeft" ? MARK_INSET.left : MARK_INSET.right,
            top: corner === "topLeft" || corner === "topRight" ? MARK_INSET.top : MARK_INSET.bottom,
          }}
        />
      ))}
    </>
  );
}

/**
 * A horizontal mark stood on its end.
 *
 * The caller positions the box it can see (thickness by length) and this turns the mark
 * inside it, about the top-left and pushed back into view, so no caller has to think in
 * rotated coordinates. `down` reads top-to-bottom, `up` bottom-to-top.
 */
export function Turned({
  length,
  thickness,
  direction,
  className,
  style,
  children,
}: {
  length: number;
  thickness: number;
  direction: "up" | "down";
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none overflow-hidden", className)}
      style={{ width: thickness, height: length, ...style }}
    >
      <div
        className="relative"
        style={{
          width: length,
          height: thickness,
          transformOrigin: "top left",
          transform: direction === "up" ? "rotate(-90deg) translateX(-100%)" : "rotate(90deg) translateY(-100%)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * The MUSTANG mach-e lockup, cropped out of its wider export plate.
 *
 * `length` is the long edge; the thickness follows from the mark's own proportions.
 */
export function MacheWordmark({
  length,
  direction,
  className,
  style,
}: {
  length: number;
  direction?: "up" | "down";
  className?: string;
  style?: CSSProperties;
}) {
  const thickness = (length * MACHE.thickness) / MACHE.length;
  const plate = (
    <div className="absolute inset-0 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={BRAND_ART.macheWordmark}
        alt=""
        className="absolute max-w-none"
        style={{ width: MACHE.plateWidth, height: MACHE.plateHeight, left: MACHE.plateLeft, top: MACHE.plateTop }}
      />
    </div>
  );

  if (!direction) {
    return (
      <div
        aria-hidden
        className={cn("pointer-events-none overflow-hidden", className)}
        style={{ width: length, height: thickness, ...style }}
      >
        {/* The positioned box is inside, so a caller's own `absolute` is never fought over. */}
        <div className="relative h-full w-full">{plate}</div>
      </div>
    );
  }

  return (
    <Turned length={length} thickness={thickness} direction={direction} className={className} style={style}>
      {plate}
    </Turned>
  );
}

/** The outline ROAM logo. Height follows the export's own aspect. */
export function RoamLogo({
  width,
  direction,
  className,
  style,
}: {
  width: number;
  direction?: "up" | "down";
  className?: string;
  style?: CSSProperties;
}) {
  const height = (width * ROAM_LOGO.h) / ROAM_LOGO.w;
  const mark = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={BRAND_ART.roamLogo}
      alt=""
      className="block max-w-none"
      style={direction ? { width, height } : { width: "100%", height: "100%" }}
    />
  );

  if (!direction) {
    return (
      <div
        aria-hidden
        className={cn("pointer-events-none", className)}
        style={{ width, height, ...style }}
      >
        {mark}
      </div>
    );
  }

  return (
    <Turned length={width} thickness={height} direction={direction} className={className} style={style}>
      {mark}
    </Turned>
  );
}

/** The Ford script. */
export function FordScript({ width, className, style }: { width: number; className?: string; style?: CSSProperties }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={BRAND_ART.fordScript}
      alt=""
      aria-hidden
      className={cn("pointer-events-none block max-w-none", className)}
      style={{ width, height: (width * FORD_SCRIPT.h) / FORD_SCRIPT.w, ...style }}
    />
  );
}
