import { COPY, titleLine } from "@/content/copy";
import { RoamLogo } from "./Marks";
import { capSize, fitHeadline } from "@/theme/type";

/**
 * "UP NEXT / {NAME}'S" over the ROAM logo (Figma `Screen-Video_06`), on the leader's dial.
 *
 * Drawn without its own backdrop: the countdown owns one dial and cross-fades this card
 * into the digits over it, which is what stops the rings jumping at the seam.
 *
 * Every number is the comp's, in the comp's own 1920x1080 pixels. The label is centred on
 * the name's box rather than on the name itself, so it holds its place whatever the name
 * turns out to be.
 */
const LABEL = { left: 76.343, width: 1201.75, top: 226.585, cap: 30.9 };
const NAME = { left: 76.343, top: 290.4, cap: 297.2 };
const LOGO = { left: 541, top: 613, width: 1312.388 };

/** The name runs from its left edge to the frame's right margin before it has to shrink. */
const NAME_MAX_WIDTH = 1704;

export function TitleCard({ firstName }: { firstName: string }) {
  const line = titleLine(firstName);

  return (
    <>
      <p
        className="cap-trim absolute whitespace-nowrap text-center font-ui font-medium uppercase tracking-caps text-ford-skyview"
        style={{ left: LABEL.left, top: LABEL.top, width: LABEL.width, fontSize: capSize(LABEL.cap, "ui") }}
      >
        {COPY.upNextLabel}
      </p>

      <p
        className="cap-trim absolute whitespace-nowrap font-headline uppercase tracking-display text-ford-skyview"
        style={{
          left: NAME.left,
          top: NAME.top,
          fontSize: fitHeadline(line, NAME_MAX_WIDTH, capSize(NAME.cap, "headline")),
        }}
      >
        {line}
      </p>

      <RoamLogo width={LOGO.width} className="absolute" style={{ left: LOGO.left, top: LOGO.top }} />
    </>
  );
}
