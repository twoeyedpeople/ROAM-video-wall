/**
 * The wall's rotation rule, and nothing else.
 *
 * Pure: no imports, no DOM, no clock of its own. That is what lets
 * `node --test src/machine/playlist.test.ts` run it directly on Node's type stripping, and
 * it is what a later phase posts to the booth to give `/download`'s "PLAYING SOON ON THE BIG
 * SCREEN" tray a real queue position.
 *
 * The rule, agreed 2026-09-16:
 *   1. Films that have not played go first, oldest completion first. A guest who has just
 *      finished is behind everyone who finished before them, and ahead of every replay.
 *   2. With nothing unplayed, replay the current event day's films, least recently played
 *      first, so the loop cycles through everyone rather than favouring anyone.
 *   3. Hidden films and films outside the window never play. `playOrder` also skips films
 *      the wall does not hold yet, so Up Next never names a film that cannot start.
 */

export interface PlaylistFilm {
  id: string;
  completedAt: string | null;
}

export interface PlayRecord {
  count: number;
  lastPlayedAt: number;
}

export interface PlaylistOptions {
  hidden: ReadonlySet<string>;
  plays: Readonly<Record<string, PlayRecord>>;
  /** Films completed before this never play: yesterday's, and pre-event test runs. */
  windowStartMs: number;
  /** How many already-played films stay in the replay rotation, newest kept. */
  replayLimit: number;
}

export interface PlayOrderOptions extends PlaylistOptions {
  /** Ids of the films held locally and able to start now. */
  ready: ReadonlySet<string>;
}

export function completedMs(film: PlaylistFilm): number {
  const value = Date.parse(film.completedAt ?? "");
  return Number.isFinite(value) ? value : 0;
}

/**
 * Every film the wall should hold, in the order it would play them. The film cache
 * downloads in this order, so an unplayed film is fetched before a replay.
 */
export function candidates<T extends PlaylistFilm>(films: readonly T[], options: PlaylistOptions): T[] {
  const playCount = (film: T) => options.plays[film.id]?.count ?? 0;
  const lastPlayed = (film: T) => options.plays[film.id]?.lastPlayedAt ?? 0;

  const inPlay = films.filter(
    (film) => !options.hidden.has(film.id) && completedMs(film) >= options.windowStartMs
  );

  const unplayed = inPlay
    .filter((film) => playCount(film) === 0)
    .sort((a, b) => completedMs(a) - completedMs(b) || a.id.localeCompare(b.id));

  const replays = inPlay
    .filter((film) => playCount(film) > 0)
    // Keep the newest `replayLimit`, then order those by how long since each last played.
    .sort((a, b) => completedMs(b) - completedMs(a))
    .slice(0, Math.max(0, options.replayLimit))
    .sort((a, b) => lastPlayed(a) - lastPlayed(b) || completedMs(b) - completedMs(a) || a.id.localeCompare(b.id));

  return [...unplayed, ...replays];
}

/** What plays next, in order, among the films able to start now. */
export function playOrder<T extends PlaylistFilm>(films: readonly T[], options: PlayOrderOptions): T[] {
  return candidates(films, options).filter((film) => options.ready.has(film.id));
}

export function recordPlay(
  plays: Readonly<Record<string, PlayRecord>>,
  id: string,
  now: number
): Record<string, PlayRecord> {
  return { ...plays, [id]: { count: (plays[id]?.count ?? 0) + 1, lastPlayedAt: now } };
}

/**
 * What follows the film on screen, answered as if it had already finished. When the film on
 * screen is the only one, that is the film itself, which is the truth: it plays again.
 */
export function upNextAfter<T extends PlaylistFilm>(
  films: readonly T[],
  options: PlayOrderOptions,
  currentId: string,
  now: number
): T | null {
  return playOrder(films, { ...options, plays: recordPlay(options.plays, currentId, now) })[0] ?? null;
}
