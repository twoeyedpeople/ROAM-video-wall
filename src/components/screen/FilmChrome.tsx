import type { CSSProperties } from "react";
import { displayName } from "@/content/copy";
import { MacheWordmark, RoamLogo } from "./Marks";

/**
 * What the wall draws over a guest's film (Figma `Screen-Video_01`): the mach-e lockup down
 * the top-left and up the bottom-right, the guest's name up the top-right and down the
 * bottom-left, and the ROAM logo up the right edge.
 *
 * It is drawn here rather than baked into the render: the RealtimeFX project the booth
 * renders from carries no edge branding, and the tablet's `/download` frames the same film
 * with its own marks for the same reason. Check that before adding a mark, because a mark
 * in both places lands twice.
 *
 * Nothing here is over the middle of the frame, so none of it is ever over a face.
 */
const NAME_SIZE = 43.901;
const LOCKUP = { length: 222.621, thickness: 38 };
const ROAM = { width: 138.168, height: 27.4781 };

export function FilmChrome({ firstName }: { firstName: string }) {
  const name = displayName(firstName);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <MacheWordmark
        length={LOCKUP.length}
        direction="down"
        style={{ position: "absolute", left: 19.89, top: 32.78 }}
      />
      <MacheWordmark
        length={LOCKUP.length}
        direction="up"
        style={{ position: "absolute", right: 20.11, bottom: 33.22 }}
      />

      <RoamLogo
        width={ROAM.width}
        direction="up"
        style={{ position: "absolute", right: 27.52, top: (1080 - ROAM.width) / 2 }}
      />

      {name && (
        <>
          <EdgeName name={name} direction="down" style={{ left: 25.9, bottom: 33.3 }} />
          <EdgeName name={name} direction="up" style={{ right: 26.1, top: 32.8 }} />
        </>
      )}
    </div>
  );
}

/**
 * A name stood on its edge.
 *
 * `writing-mode` rather than a rotated box, because the run's length is the name's and is
 * not known here. `down` reads top-to-bottom, which is what vertical-rl does to Latin on its
 * own; `up` is the same turned over, the trick the tablet's `EdgeMark` uses.
 */
function EdgeName({
  name,
  direction,
  style,
}: {
  name: string;
  direction: "up" | "down";
  style: CSSProperties;
}) {
  return (
    <span
      className="absolute block whitespace-nowrap font-headline uppercase leading-none tracking-display text-ford-bright"
      style={{
        fontSize: NAME_SIZE,
        writingMode: "vertical-rl",
        transform: direction === "up" ? "rotate(180deg)" : undefined,
        ...style,
      }}
    >
      {name}
    </span>
  );
}
