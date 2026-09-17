"use client";

import { useEffect, useRef } from "react";
import { REGIONS, rectStyle } from "@/theme/regions";

/**
 * The delivered 20 s loop. Swap the file, keep the path.
 *
 * It is encoded square at 512, because this panel is square; a 16:9 master would have its
 * crop baked in rather than left to `object-cover`. Re-encode from the master in
 * `assets-master/` (the README has the command).
 */
export const B_ROLL_SRC = "/assets/wall/b-roll.mp4";

/**
 * B-roll highlights: one muted clip looping on its own, independent of the main loop. The
 * explicit `play()` backs up `autoPlay`, which a browser may skip for an element it created
 * before the page was visible.
 *
 * Nothing here watches for a failure. This panel is decoration on a corner of the wall, and a
 * black square in it is not the wall going down; the loop in the main region is what must
 * never stop, and it has its own exits.
 */
export function BRollPanel() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.muted = true;
    video.play().catch(() => {});
  }, []);

  return (
    <div className="overflow-hidden bg-ink" style={rectStyle(REGIONS.bRoll)}>
      <video
        ref={ref}
        src={B_ROLL_SRC}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className="h-full w-full object-cover"
      />
    </div>
  );
}
