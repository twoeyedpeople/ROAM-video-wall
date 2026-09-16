import { COPY, upNextTitle } from "@/content/copy";
import type { WallFilm } from "@/lib/types";
import { REGIONS, rectStyle } from "@/theme/regions";
import { fitHeadline } from "@/theme/type";

const PADDING_X = 24;
const NAME_MAX_PX = 58;

/**
 * UP NEXT: {NAME}'S JOURNEY. Ford Skyview, which is also the colour the brief drew the box
 * in. With nothing queued it reads "YOUR JOURNEY", an invitation, rather than going blank.
 *
 * Keyed on the film so a change of guest fades in rather than swapping mid-frame.
 */
export function UpNextPanel({ film }: { film: WallFilm | null }) {
  const title = upNextTitle(film ? film.firstName : null);

  return (
    <div
      className="flex flex-col justify-center gap-4 bg-ford-skyview text-white"
      style={{ ...rectStyle(REGIONS.upNext), paddingLeft: PADDING_X, paddingRight: PADDING_X }}
    >
      <p className="font-ui text-[18px] font-medium uppercase leading-none tracking-caps">{COPY.upNextLabel}</p>
      <p
        key={film?.id ?? "empty"}
        className="animate-fade-in whitespace-pre-line font-headline uppercase leading-[0.92] tracking-display"
        style={{ fontSize: fitHeadline(title, REGIONS.upNext.w - PADDING_X * 2, NAME_MAX_PX) }}
      >
        {title}
      </p>
    </div>
  );
}
