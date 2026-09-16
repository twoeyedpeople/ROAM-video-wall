"use client";

import { useEffect, useState, type ReactNode } from "react";
import { STAGE } from "@/theme/regions";

/**
 * The 1920x1080 design space, scaled to whatever the display actually is and letterboxed on
 * black. Everything inside places itself in design pixels (`theme/regions.ts`), so the wall
 * is right on a 1080p output, a 4K one and a laptop under review alike. The same approach as
 * the gallery's `kiosk-frame.tsx`.
 *
 * Nothing renders until the first measurement, so the videos never mount at the wrong scale
 * and jump.
 */
export function WallStage({ children }: { children: ReactNode }) {
  const [fit, setFit] = useState<{ scale: number; left: number; top: number } | null>(null);

  useEffect(() => {
    const update = () => {
      const scale = Math.min(window.innerWidth / STAGE.w, window.innerHeight / STAGE.h);
      setFit({
        scale,
        left: (window.innerWidth - STAGE.w * scale) / 2,
        top: (window.innerHeight - STAGE.h * scale) / 2,
      });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-ink">
      {fit && (
        <div
          className="absolute overflow-hidden bg-ink"
          style={{
            left: fit.left,
            top: fit.top,
            width: STAGE.w,
            height: STAGE.h,
            transform: `scale(${fit.scale})`,
            transformOrigin: "top left",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
