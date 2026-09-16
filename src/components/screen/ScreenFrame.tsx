import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SCREEN, SCREEN_BOX, SCREEN_SCALE } from "@/theme/regions";

/**
 * The 1920x1080 frame the main region's comps are drawn on, scaled into the region and
 * centred in it.
 *
 * Everything inside places itself in the comps' own pixels. `isolation` keeps the backdrop's
 * blend modes inside this frame, so the still can blend with the black behind the cards and
 * with nothing else on the wall.
 */
export function ScreenFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn("absolute overflow-hidden bg-ink", className)}
      style={{
        left: SCREEN_BOX.x,
        top: SCREEN_BOX.y,
        width: SCREEN_BOX.w,
        height: SCREEN_BOX.h,
        isolation: "isolate",
      }}
    >
      <div
        className="relative"
        style={{
          width: SCREEN.w,
          height: SCREEN.h,
          transform: `scale(${SCREEN_SCALE})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
}
