import type { WallFilm } from "@/lib/types";
import { COUNTDOWN_TITLE_MS } from "@/machine/timings";
import { Backdrop, BackdropStill } from "./screen/Backdrop";
import { CountdownDial } from "./screen/CountdownDial";
import { RegistrationMarks } from "./screen/Marks";
import { TitleCard } from "./screen/TitleCard";

/**
 * What runs before each play of a guest's film: the title card (Figma `Screen-Video_06`),
 * then the leader counting down (`Screen-Video_07`).
 *
 * One backdrop, two layers over it. The dial's rings belong to both comps and are drawn
 * once, so the only thing that changes at `COUNTDOWN_TITLE_MS` is the type: the name fades
 * out and the count fades in over a field that never moves.
 *
 * Both layers are timed in CSS, from a single mount. The loop still owns the one timer that
 * matters, the move to the film at `COUNTDOWN_TOTAL_MS`, and the player's `key` remounts
 * this card per pass, which restarts every animation on it together.
 */
export function CountdownCard({ film }: { film: WallFilm }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-ink">
      {/* The rings belong to both comps. The still belongs only to the title card, so it
          rides that layer and leaves with it. */}
      <Backdrop glow="dial" />

      {/* Drawn once, outside both layers: cross-fading two identical sets of marks would
          dip them at the seam. */}
      <RegistrationMarks />

      <div className="absolute inset-0 animate-fade-out" style={{ animationDelay: `${COUNTDOWN_TITLE_MS}ms` }}>
        <BackdropStill opacity={0.2} />
        <TitleCard firstName={film.firstName} />
      </div>

      <div className="absolute inset-0 animate-fade-in" style={{ animationDelay: `${COUNTDOWN_TITLE_MS}ms` }}>
        <CountdownDial firstName={film.firstName} />
      </div>
    </div>
  );
}
