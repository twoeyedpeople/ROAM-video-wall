import { COPY, countdownFooter } from "@/content/copy";
import { COUNTDOWN_FROM, COUNTDOWN_STEP_MS, COUNTDOWN_TITLE_MS } from "@/machine/timings";
import { SCREEN } from "@/theme/regions";
import { capSize } from "@/theme/type";

/**
 * The leader (Figma `Screen-Video_07`): UP NEXT, the digit, the guest's journey underneath,
 * and the sweep going round behind them.
 *
 * The comp draws one still of the sweep, a conic trail with a hard leading edge at -30
 * degrees, which is a frame of a hand going round. So it goes round: one turn per digit, the
 * beat an academy leader has always kept. `COUNTDOWN_STEP_MS` drives both.
 *
 * The digits are the pure-CSS timing this card has always used: all of them are mounted at
 * once and each waits out its own `animationDelay`, so the only timer that matters is still
 * the loop's move to the film at `COUNTDOWN_TOTAL_MS` and there is nothing here to drift
 * against it. Remounted per countdown by the player's `key`, which restarts the animation.
 *
 * On the last digit the leader cuts to black as the hand passes straight down, and holds
 * black until the loop starts the film at `COUNTDOWN_TOTAL_MS`. The cut is placed by the
 * hand's angle, so moving the hand moves the cut with it.
 */
const LABEL = { top: 51.555, cap: 22.0 };
const DIGIT = { top: 396.551, cap: 277.394 };
const FOOTER = { top: 1006.4, cap: 23.0 };

/** The sweep's square has to cover the frame at every angle: half its side beats the
 *  frame's own half-diagonal of 1102. */
const SWEEP = 2400;
const HAND_LENGTH = 1316;
/** The hand at the start of each turn, in CSS degrees (0 is 3 o'clock, positive is clockwise). */
const HAND_DEG = -30;

/** When the hand points straight down (90 degrees) on the last digit. */
const CUT_MS =
  COUNTDOWN_TITLE_MS +
  (COUNTDOWN_FROM - 1) * COUNTDOWN_STEP_MS +
  COUNTDOWN_STEP_MS * (((90 - HAND_DEG + 360) % 360) / 360);

const SWEEP_GRADIENT =
  "conic-gradient(from 60deg, rgba(6, 111, 239, 0) 0%, rgba(6, 106, 229, 0.098) 44.231%, " +
  "rgba(5, 97, 210, 0.288) 67.308%, rgba(4, 80, 173, 0.644) 83.654%, rgb(3, 64, 137) 100%)";

export function CountdownDial({ firstName }: { firstName: string }) {
  const footer = countdownFooter(firstName);
  const digits = Array.from({ length: COUNTDOWN_FROM }, (_, index) => COUNTDOWN_FROM - index);

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute animate-sweep"
        style={{
          left: (SCREEN.w - SWEEP) / 2,
          top: (SCREEN.h - SWEEP) / 2,
          width: SWEEP,
          height: SWEEP,
          background: SWEEP_GRADIENT,
          // Turns start with the digits, so the hand is at HAND_DEG as each one lands,
          // whatever the title card's length.
          animationDelay: `${COUNTDOWN_TITLE_MS}ms`,
        }}
      >
        {/* The hand rides the trail's leading edge, out from the centre. */}
        <div
          className="absolute bg-ford-skyview"
          style={{
            left: SWEEP / 2,
            top: SWEEP / 2 - 4,
            width: HAND_LENGTH,
            height: 8,
            transformOrigin: "0 50%",
            transform: `rotate(${HAND_DEG}deg)`,
          }}
        />
      </div>

      <p
        className="cap-trim absolute inset-x-0 whitespace-nowrap text-center font-ui font-medium uppercase tracking-caps text-ford-skyview"
        style={{ top: LABEL.top, fontSize: capSize(LABEL.cap, "ui") }}
      >
        {COPY.upNextLabel}
      </p>

      <div className="absolute inset-x-0" style={{ top: DIGIT.top, height: DIGIT.cap }} aria-hidden>
        {digits.map((digit, index) => (
          <span
            key={digit}
            className="cap-trim absolute inset-x-0 block animate-count-in text-center font-headline text-ford-skyview"
            style={{
              fontSize: capSize(DIGIT.cap, "headline"),
              animationDelay: `${COUNTDOWN_TITLE_MS + index * COUNTDOWN_STEP_MS}ms`,
            }}
          >
            {digit}
          </span>
        ))}
      </div>

      <p
        className="cap-trim absolute inset-x-0 whitespace-nowrap text-center font-ui font-medium uppercase tracking-caps text-ford-skyview"
        style={{ top: FOOTER.top, fontSize: capSize(FOOTER.cap, "ui") }}
      >
        {footer}
      </p>

      {/* Last in the card's top layer, so it covers everything, marks and all. */}
      <div className="absolute inset-0 animate-cut bg-ink" style={{ animationDelay: `${CUT_MS}ms` }} />
    </>
  );
}
