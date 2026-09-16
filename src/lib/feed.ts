import { boothJson } from "./booth";
import { DRY_RUN, dryRunFeed } from "./dry-run";
import type { WallFeed, WallFilm } from "./types";

/**
 * One poll of the booth's `/api/wall-feed`. `since` is the cursor the previous poll returned,
 * or the start of the window on the first one.
 */
export async function fetchFeed(since: number, signal?: AbortSignal): Promise<WallFeed> {
  if (DRY_RUN) return dryRunFeed();
  const feed = await boothJson<Partial<WallFeed>>("wall-feed", {
    query: { since: String(Math.max(0, Math.floor(since))) },
    signal,
  });
  return normaliseFeed(feed, since);
}

/** A malformed entry is dropped rather than allowed to wedge the loop. */
function normaliseFeed(feed: Partial<WallFeed>, since: number): WallFeed {
  const films = Array.isArray(feed.films) ? feed.films.filter(isWallFilm) : [];
  const hidden = Array.isArray(feed.hidden) ? feed.hidden.filter((id): id is string => typeof id === "string") : [];
  const cursor = Number.isFinite(feed.cursor) ? Number(feed.cursor) : since;
  const serverTime = Number.isFinite(feed.serverTime) ? Number(feed.serverTime) : Date.now();
  return { films, hidden, cursor, serverTime };
}

export function isWallFilm(value: unknown): value is WallFilm {
  const film = value as WallFilm;
  return (
    Boolean(film) &&
    typeof film.id === "string" &&
    film.id.length > 0 &&
    typeof film.version === "string" &&
    film.version.length > 0 &&
    typeof film.firstName === "string"
  );
}
