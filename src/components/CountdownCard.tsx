import { countdownTitle } from "@/content/copy";
import type { WallFilm } from "@/lib/types";
import { COUNTDOWN_FROM, COUNTDOWN_STEP_MS, COUNTDOWN_TITLE_MS } from "@/machine/timings";
import { REGIONS } from "@/theme/regions";
import { fitHeadline } from "@/theme/type";

const TITLE_MAX_PX = 120;
const TITLE_WIDTH = REGIONS.main.w - 120;

/**
 * "{NAME}'S ROAM", then 3, 2, 1, before each play of a guest's film.
 *
 * Pure CSS timing: every digit is mounted at once and waits out its own `animationDelay`
 * (the `count-in` fill keeps it invisible until then). The loop owns the one timer that
 * matters, the move to the film at COUNTDOWN_TOTAL_MS, so there is nothing here to drift
 * against it. Remounted per pass by the player's `key`, which restarts the animation.
 */
export function CountdownCard({ film }: { film: WallFilm }) {
  const title = countdownTitle(film.firstName);
  const digits = Array.from({ length: COUNTDOWN_FROM }, (_, index) => COUNTDOWN_FROM - index);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-ink">
      <p
        className="animate-fade-in whitespace-nowrap font-headline uppercase leading-[0.92] tracking-display text-white"
        style={{ fontSize: fitHeadline(title, TITLE_WIDTH, TITLE_MAX_PX) }}
      >
        {title}
      </p>
      <div className="relative h-[230px] w-[230px]" aria-hidden>
        {digits.map((digit, index) => (
          <span
            key={digit}
            className="absolute inset-0 flex animate-count-in items-center justify-center font-headline text-[230px] leading-none text-ford-skyview"
            style={{ animationDelay: `${COUNTDOWN_TITLE_MS + index * COUNTDOWN_STEP_MS}ms` }}
          >
            {digit}
          </span>
        ))}
      </div>
    </div>
  );
}
