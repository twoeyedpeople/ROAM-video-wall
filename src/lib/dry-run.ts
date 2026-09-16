import type { WallFeed } from "./types";

/**
 * Dry run: the whole loop, none of the wire.
 *
 * A review build. The feed answers with sample guests and the films come from
 * `public/assets/wall/dry-run/`, so the sequence, the countdown and Up Next can be watched
 * end to end with no booth deployment and no guest data.
 *
 * An environment variable rather than a URL flag, for the tablet's reason: a build either is
 * a review build or it is not, and a stray link must not be able to put the event's wall on
 * sample films. It branches in `lib/feed.ts` and `lib/film-cache.ts` and nowhere else, so
 * what is reviewed is the loop that ships.
 */
export const DRY_RUN =
  process.env.NEXT_PUBLIC_DRY_RUN === "1" || process.env.NEXT_PUBLIC_DRY_RUN === "true";

const BOOT_AT = Date.now();

/**
 * Three guests waiting at boot and a fourth who finishes 45 seconds in, which is enough to
 * watch a new film overtake the replays. The fourth reuses a sample clip on purpose: the
 * cache keys on id and version, and two guests sharing a file must still be two guests.
 */
const SAMPLES = [
  { id: "d00001", firstName: "Joshua", version: "sample-a.mp4", arrivesAfterMs: 0 },
  { id: "d00002", firstName: "Priya", version: "sample-b.mp4", arrivesAfterMs: 0 },
  { id: "d00003", firstName: "Sam", version: "sample-c.mp4", arrivesAfterMs: 0 },
  { id: "d00004", firstName: "Alexandra", version: "sample-a.mp4", arrivesAfterMs: 45_000 },
];

export function dryRunFeed(): WallFeed {
  const now = Date.now();
  const films = SAMPLES.filter((sample) => now - BOOT_AT >= sample.arrivesAfterMs).map((sample, index) => ({
    id: sample.id,
    firstName: sample.firstName,
    version: sample.version,
    completedAt: new Date(BOOT_AT + sample.arrivesAfterMs + index).toISOString(),
  }));
  return { films, hidden: [], cursor: now, serverTime: now };
}

export function dryRunFilmUrl(version: string): string {
  return `/assets/wall/dry-run/${encodeURIComponent(version)}`;
}
