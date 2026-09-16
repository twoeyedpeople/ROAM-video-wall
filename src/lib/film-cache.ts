import { BoothError, boothFetch } from "./booth";
import { DRY_RUN, dryRunFilmUrl } from "./dry-run";
import type { WallFilm } from "./types";
import { CHUNK_BYTES, CHUNK_CONCURRENCY } from "@/machine/timings";

/**
 * The wall's local copy of every film it plays.
 *
 * Each film is downloaded once, in `CHUNK_CONCURRENCY` ranges of at most `CHUNK_BYTES` at a
 * time, into the Cache API, and played from an object URL. Three reasons, all of which are
 * about the wall never going black:
 *
 *   - The booth's blobs are private and a `<video>` cannot send a token, so the film has to
 *     be fetched by script anyway.
 *   - A film replays all day. Held locally, the hundredth play costs the booth nothing and
 *     survives the venue wifi dropping.
 *   - Small ranges keep every response through both serverless hops well inside Vercel's
 *     function response limit, whatever the film's size.
 *
 * A film is keyed on its id AND its version, so a re-render replaces the old copy instead of
 * being mistaken for it. When the Cache API is missing (an insecure origin: plain http on a
 * LAN address) the films are held in memory instead, which works until the next reload.
 */

const CACHE_NAME = "roam-wall-films-v1";
const memory = new Map<string, Blob>();

export function filmKey(film: Pick<WallFilm, "id" | "version">): string {
  return `/__wall-film/${encodeURIComponent(film.id)}/${encodeURIComponent(film.version)}`;
}

function cacheUrl(key: string): string {
  return new URL(key, window.location.origin).toString();
}

async function openCache(): Promise<Cache | null> {
  if (typeof caches === "undefined") return null;
  try {
    return await caches.open(CACHE_NAME);
  } catch {
    return null;
  }
}

export async function hasFilm(film: WallFilm): Promise<boolean> {
  const key = filmKey(film);
  if (memory.has(key)) return true;
  const cache = await openCache();
  return cache ? Boolean(await cache.match(cacheUrl(key))) : false;
}

export async function readFilm(film: WallFilm): Promise<Blob | null> {
  const key = filmKey(film);
  const held = memory.get(key);
  if (held) return held;
  const cache = await openCache();
  const response = cache ? await cache.match(cacheUrl(key)) : undefined;
  return response ? response.blob() : null;
}

export async function downloadFilm(film: WallFilm, signal?: AbortSignal): Promise<void> {
  // The first range doubles as the question "how big is this film", which is the only part
  // that has to happen before the rest can be asked for.
  const first = await fetchRange(film, 0, CHUNK_BYTES - 1, signal);
  const contentType = first.headers.get("content-type") || "video/mp4";

  if (first.status === 200) {
    // A source that ignores Range (the dry run's static files may) sends the whole thing.
    const whole = await first.blob();
    if (!whole.size) throw new BoothError("Film download was empty", 502);
    await storeFilm(film, new Blob([whole], { type: contentType }));
    return;
  }
  if (first.status !== 206) {
    throw new BoothError(`Film download failed: ${first.status}`, first.status);
  }
  const head = parseContentRange(first.headers.get("content-range"));
  if (!head || head.start !== 0) {
    throw new BoothError("Film download returned the wrong range", 502);
  }

  const total = head.total;
  const starts: number[] = [];
  for (let start = head.end + 1; start < total; start += CHUNK_BYTES) starts.push(start);

  // Index 0 is the range already in hand; the rest land in place, so the order the answers
  // come back in does not matter.
  const chunks: Blob[] = new Array(starts.length + 1);
  chunks[0] = await first.blob();

  let next = 0;
  let stopped = false;
  const worker = async () => {
    while (!stopped) {
      const index = next++;
      if (index >= starts.length) return;
      const start = starts[index];
      const response = await fetchRange(film, start, Math.min(start + CHUNK_BYTES, total) - 1, signal);
      if (response.status !== 206) {
        throw new BoothError(`Film download failed: ${response.status}`, response.status);
      }
      const range = parseContentRange(response.headers.get("content-range"));
      if (!range || range.start !== start || range.total !== total) {
        throw new BoothError("Film download returned the wrong range", 502);
      }
      chunks[index + 1] = await response.blob();
    }
  };

  try {
    await Promise.all(Array.from({ length: Math.min(CHUNK_CONCURRENCY, starts.length) }, worker));
  } finally {
    // One bad range fails the film. Whatever is already in flight finishes and is dropped;
    // no further range is asked for.
    stopped = true;
  }

  const blob = new Blob(chunks, { type: contentType });
  if (!blob.size || blob.size !== total) {
    throw new BoothError(`Film download was incomplete (${blob.size} of ${total} bytes)`, 502);
  }
  await storeFilm(film, blob);
}

export async function discardFilm(film: WallFilm): Promise<void> {
  const key = filmKey(film);
  memory.delete(key);
  const cache = await openCache();
  await cache?.delete(cacheUrl(key));
}

/** Drops every held film that is not in `keep`: hidden ones, yesterday's, superseded versions. */
export async function evictFilmsExcept(keep: ReadonlySet<string>): Promise<void> {
  for (const key of [...memory.keys()]) {
    if (!keep.has(key)) memory.delete(key);
  }
  const cache = await openCache();
  if (!cache) return;
  for (const request of await cache.keys()) {
    const key = new URL(request.url).pathname;
    if (!keep.has(key)) await cache.delete(request);
  }
}

async function storeFilm(film: WallFilm, blob: Blob): Promise<void> {
  const key = filmKey(film);
  const cache = await openCache();
  if (!cache) {
    memory.set(key, blob);
    return;
  }
  await cache.put(
    cacheUrl(key),
    new Response(blob, { headers: { "content-type": blob.type, "content-length": String(blob.size) } })
  );
}

function fetchRange(film: WallFilm, start: number, end: number, signal?: AbortSignal): Promise<Response> {
  const range = `bytes=${start}-${end}`;
  if (DRY_RUN) {
    return fetch(dryRunFilmUrl(film.version), { headers: { range }, cache: "no-store", signal });
  }
  return boothFetch("wall-film", { query: { id: film.id }, headers: { range }, signal });
}

function parseContentRange(value: string | null): { start: number; end: number; total: number } | null {
  const match = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(String(value || "").trim());
  if (!match) return null;
  const [start, end, total] = [Number(match[1]), Number(match[2]), Number(match[3])];
  return end >= start && total > end ? { start, end, total } : null;
}
