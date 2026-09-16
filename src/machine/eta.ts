/**
 * How long until the film the Up Next panel names starts.
 *
 * The comp's panel says "APROX 3 MINS AWAY", so the wall has to answer it. Nothing on the
 * feed carries a length, so the estimate is built from the beats the wall already owns and
 * from the film's own duration once the file reports it.
 *
 * Pure, and with no imports, for the reason `playlist.ts` is: it is arithmetic over the
 * loop's own timings, and it is the same figure the booth's `/download` tray will want when
 * that phase is built.
 *
 * It answers for the guest who follows the one on screen, which is exactly who the panel
 * names. During a campaign card that is the guest about to start, so the run is the card's
 * own remainder and one countdown.
 */
export interface EtaInput {
  step: "interstitial" | "countdown" | "film";
  /** Which of this guest's plays is on screen. Ignored on the campaign card. */
  pass: number;
  /** Milliseconds since this step began. Used on the campaign card and the countdown. */
  elapsedMs: number;
  /** The film's length. `ASSUMED_FILM_MS` until the file has reported its own. */
  filmMs: number;
  /** How far into the film on screen the player has reached. */
  playedMs: number;
  playsPerGuest: number;
  countdownMs: number;
  interstitialMs: number;
}

export function upNextEtaMs(input: EtaInput): number {
  const { playsPerGuest, countdownMs, interstitialMs, filmMs } = input;

  // Whatever is on screen now, the next guest's film is still behind a campaign card and a
  // countdown. Except during the card itself, which is already that card.
  const tail = interstitialMs + countdownMs;

  switch (input.step) {
    case "interstitial":
      return Math.max(0, interstitialMs - input.elapsedMs) + countdownMs;

    case "countdown": {
      const passesLeft = Math.max(0, playsPerGuest - input.pass);
      return Math.max(0, countdownMs - input.elapsedMs) + filmMs + passesLeft * (countdownMs + filmMs) + tail;
    }

    case "film": {
      const passesLeft = Math.max(0, playsPerGuest - input.pass);
      return Math.max(0, filmMs - input.playedMs) + passesLeft * (countdownMs + filmMs) + tail;
    }
  }
}
