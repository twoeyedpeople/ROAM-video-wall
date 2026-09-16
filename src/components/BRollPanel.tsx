"use client";

import { useEffect, useRef } from "react";
import { REGIONS, rectStyle } from "@/theme/regions";

/** Placeholder until the real B-roll is supplied. Swap the file, keep the path. */
export const B_ROLL_SRC = "/assets/wall/b-roll.mp4";

/**
 * B-roll highlights: one muted clip looping on its own, independent of the main loop. The
 * explicit `play()` backs up `autoPlay`, which a browser may skip for an element it created
 * before the page was visible.
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
