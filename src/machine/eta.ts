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
 * own remainder and one countdown. During a guest's film, it is the rest of that film, the
 * campaign card if one falls between them, and one countdown.
 */
export interface EtaInput {
  step: "interstitial" | "countdown" | "film";
  /**
   * Whether a campaign card comes between the guest on screen and the one named: true after
   * the last slot of a break, or when there is no other guest to fill the next slot. Ignored
   * on the campaign card itself.
   */
  cardBetween: boolean;
  /** Milliseconds since this step began. Used on the campaign card and the countdown. */
  elapsedMs: number;
  /** The film's length. `ASSUMED_FILM_MS` until the file has reported its own. */
  filmMs: number;
  /** How far into the film on screen the player has reached. */
  playedMs: number;
  countdownMs: number;
  interstitialMs: number;
}

/**
 * The whole minutes the panel shows for an estimate. The loop redraws the panel only when this
 * changes, and the copy words it, so the two cannot disagree about when the figure moved.
 */
export function etaMinutes(etaMs: number): number {
  return Math.round(etaMs / 60_000);
}

export function upNextEtaMs(input: EtaInput): number {
  const { countdownMs, interstitialMs, filmMs } = input;
  const tail = (input.cardBetween ? interstitialMs : 0) + countdownMs;

  switch (input.step) {
    case "interstitial":
      return Math.max(0, interstitialMs - input.elapsedMs) + countdownMs;

    case "countdown":
      return Math.max(0, countdownMs - input.elapsedMs) + filmMs + tail;

    case "film":
      return Math.max(0, filmMs - input.playedMs) + tail;
  }
}
