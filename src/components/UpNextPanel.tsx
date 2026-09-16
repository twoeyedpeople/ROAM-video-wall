import { COPY, panelName, panelNote } from "@/content/copy";
import type { WallFilm } from "@/lib/types";
import { BRAND_ART } from "@/theme/brand";
import { REGIONS, rectStyle } from "@/theme/regions";
import { capSize, fitHeadline } from "@/theme/type";

/**
 * UP NEXT / {NAME} / APPROX. N MINS AWAY (Figma `UpNext-Video_01`).
 *
 * The same field the main region's cards are built over, at this panel's own size: the
 * backdrop still tinted Skyview and blended hard-light, with a soft black weight under the
 * type. It is 256x256 of the wall's own raster, not the main screen's 1920x1080 frame, so
 * the numbers here are the panel comp's.
 *
 * With nothing queued it reads "YOURS", an invitation, rather than going blank, and drops
 * the estimate for the campaign line instead.
 *
 * Keyed on the film so a change of guest fades in rather than swapping mid-frame.
 */
const LABEL = { top: 66, cap: 9 };
/** The name keeps this slot whatever it fits at, so a long one does not ride up. */
const NAME = { top: 91.07, cap: 54, width: 232 };
const NOTE = { top: 229, cap: 7 };

export function UpNextPanel({ film, etaMs }: { film: WallFilm | null; etaMs: number }) {
  const name = panelName(film ? film.firstName : null);
  const note = panelNote(film ? etaMs : null);

  return (
    <div className="overflow-hidden bg-ink" style={rectStyle(REGIONS.upNext)}>
      <Field />

      <div key={film?.id ?? "empty"} className="absolute inset-0 animate-fade-in text-ford-bright">
        <p
          className="cap-trim absolute inset-x-0 whitespace-nowrap text-center font-ui font-medium uppercase tracking-caps"
          style={{ top: LABEL.top, fontSize: capSize(LABEL.cap, "ui") }}
        >
          {COPY.upNextLabel}
        </p>

        <div
          className="absolute inset-x-0 flex items-center justify-center"
          style={{ top: NAME.top, height: NAME.cap }}
        >
          <span
            className="cap-trim block whitespace-nowrap font-headline uppercase"
            style={{
              fontSize: fitHeadline(name, NAME.width, capSize(NAME.cap, "headline")),
              // The panel's own tracking, tighter than the wall's display default.
              letterSpacing: "-0.04em",
            }}
          >
            {name}
          </span>
        </div>

        <p
          className="cap-trim absolute inset-x-0 whitespace-nowrap text-center font-ui font-medium uppercase tracking-caps"
          style={{ top: NOTE.top, fontSize: capSize(NOTE.cap, "ui") }}
        >
          {note}
        </p>
      </div>
    </div>
  );
}

/** The panel's own cut of the backdrop, at the comp's crop and weights. */
function Field() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden" style={{ isolation: "isolate" }}>
      <div
        className="absolute mix-blend-hard-light"
        style={{ left: -320, top: -62, width: 650.58, height: 357.58, opacity: 0.2 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={BRAND_ART.backdrop} alt="" className="absolute h-full w-full object-cover object-bottom" />
        <div className="absolute inset-0 bg-ford-skyview mix-blend-color" />
      </div>

      <div
        className="absolute rounded-full"
        style={{
          left: -404.2,
          top: -20.2,
          width: 787.514,
          height: 787.514,
          background:
            "radial-gradient(circle, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0.5) 51%, rgba(0, 0, 0, 0) 100%)",
        }}
      />
    </div>
  );
}
