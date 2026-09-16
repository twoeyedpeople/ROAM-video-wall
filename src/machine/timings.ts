/**
 * Every timed beat on the wall, and the tuning behind the feed and the film cache.
 *
 * The countdown's digit animation (`count-in` in `tailwind.config.ts`) runs for exactly
 * COUNTDOWN_STEP_MS. The two must agree, or a digit is still fading when the next lands.
 */

/** The brief's "x2": each guest's countdown and film play twice before the interstitial. */
export const PLAYS_PER_GUEST = 2;

/** The title card alone, before the 3. */
export const COUNTDOWN_TITLE_MS = 1600;
/** Each of 3, 2, 1. */
export const COUNTDOWN_STEP_MS = 1000;
export const COUNTDOWN_FROM = 3;
export const COUNTDOWN_TOTAL_MS = COUNTDOWN_TITLE_MS + COUNTDOWN_FROM * COUNTDOWN_STEP_MS;

/**
 * A film that makes no progress for this long is skipped. It covers a stall, a decode that
 * never starts and a film whose bytes never arrived, none of which fire `error` reliably.
 */
export const FILM_STALL_MS = 10_000;

/** The interstitial's own watchdog, for a placeholder that never fires `ended`. */
export const INTERSTITIAL_MAX_MS = 90_000;
/** How long to hold on black when the interstitial will not play, before moving on. */
export const INTERSTITIAL_ERROR_HOLD_MS = 4_000;

/** How often the wall asks the booth for new films and the hidden list. */
export const POLL_MS = positiveNumber(process.env.NEXT_PUBLIC_WALL_POLL_MS, 15_000);

/** How long a film that failed to download waits before it is tried again. */
export const DOWNLOAD_RETRY_MS = 30_000;
/** How long the cache worker rests once it holds everything wanted. */
export const CACHE_IDLE_MS = 5_000;

/**
 * Films are fetched in ranges of at most this, so no single response through the two
 * serverless hops (this app's proxy, then the booth) comes near Vercel's function response
 * limit, whatever the film's size.
 */
export const CHUNK_BYTES = 4 * 1024 * 1024;

/** How many already-played films stay in the replay rotation, newest kept. */
export const REPLAY_LIMIT = 150;

/**
 * The wall reloads itself at the first interstitial after running this long, to shed
 * whatever a browser accumulates over an event day. Everything that matters (films held,
 * what has played, the feed cursor) survives the reload.
 */
export const RELOAD_AFTER_MS = 6 * 60 * 60_000;

function positiveNumber(value: string | undefined, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}
