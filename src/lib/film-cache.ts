import { BoothError, boothFetch } from "./booth";
import { DRY_RUN, dryRunFilmUrl } from "./dry-run";
import type { WallFilm } from "./types";
import { CHUNK_BYTES } from "@/machine/timings";

/**
 * The wall's local copy of every film it plays.
 *
 * Each film is downloaded once, in ranges of at most `CHUNK_BYTES`, into the Cache API, and
 * played from an object URL. Three reasons, all of which are about the wall never going
 * black:
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
  const chunks: Blob[] = [];
  let contentType = "video/mp4";
  let start = 0;
  let total = Number.POSITIVE_INFINITY;

  while (start < total) {
    const response = await fetchRange(film, start, start + CHUNK_BYTES - 1, signal);
    contentType = response.headers.get("content-type") || contentType;

    if (response.status === 200) {
      // A source that ignores Range (the dry run's static files may) sends the whole thing.
      const whole = await response.blob();
      chunks.length = 0;
      chunks.push(whole);
      total = whole.size;
      break;
    }
    if (response.status !== 206) {
      throw new BoothError(`Film download failed: ${response.status}`, response.status);
    }

    const range = parseContentRange(response.headers.get("content-range"));
    if (!range || range.start !== start) {
      throw new BoothError("Film download returned the wrong range", 502);
    }
    chunks.push(await response.blob());
    total = range.total;
    start = range.end + 1;
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
