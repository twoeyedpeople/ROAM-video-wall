"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { discardFilm, downloadFilm, evictFilmsExcept, filmKey, hasFilm } from "@/lib/film-cache";
import type { WallFilm } from "@/lib/types";
import { CACHE_IDLE_MS, DOWNLOAD_RETRY_MS } from "@/machine/timings";

/**
 * Keeps the local film cache in step with what the rotation wants.
 *
 * One long-lived worker, not an effect per change: it reads the latest wanted list from a
 * ref, downloads the first film it does not hold (the list is in play order, so unplayed
 * films come first), and only when it holds everything does it evict the rest and rest. A
 * new film arriving wakes it early. Restarting it on every change instead would abort a
 * half-downloaded film each time a poll brought news, which at a busy booth is constantly.
 *
 * `canEvict` stays false until the feed has answered once. Before that the wanted list is
 * only what localStorage remembered, and evicting against it could throw away films the
 * first poll is about to ask for.
 */
export function useFilmCache(wanted: readonly WallFilm[], canEvict: boolean) {
  const wantedRef = useRef(wanted);
  wantedRef.current = wanted;
  const canEvictRef = useRef(canEvict);
  canEvictRef.current = canEvict;
  const heldRef = useRef(new Set<string>());
  const wakeRef = useRef<(() => void) | null>(null);

  const [heldKeys, setHeldKeys] = useState<ReadonlySet<string>>(() => new Set());
  const [downloading, setDownloading] = useState<string | null>(null);
  const [failed, setFailed] = useState<ReadonlyMap<string, string>>(() => new Map());

  const publish = useCallback(() => setHeldKeys(new Set(heldRef.current)), []);

  useEffect(() => {
    let stopped = false;
    const controller = new AbortController();
    const failedAt = new Map<string, number>();
    const looked = new Set<string>();

    const rest = (ms: number) =>
      new Promise<void>((resolve) => {
        const timer = setTimeout(wake, ms);
        function wake() {
          clearTimeout(timer);
          wakeRef.current = null;
          resolve();
        }
        wakeRef.current = wake;
      });

    const nextToFetch = async (): Promise<WallFilm | null> => {
      for (const film of wantedRef.current) {
        const key = filmKey(film);
        if (heldRef.current.has(key)) continue;
        if (!looked.has(key)) {
          // Held from before a reload: nothing to fetch.
          looked.add(key);
          if (await hasFilm(film)) {
            heldRef.current.add(key);
            publish();
            continue;
          }
        }
        const lastFailure = failedAt.get(key);
        if (lastFailure && Date.now() - lastFailure < DOWNLOAD_RETRY_MS) continue;
        return film;
      }
      return null;
    };

    const run = async () => {
      while (!stopped) {
        const film = await nextToFetch();
        if (stopped) return;

        if (film) {
          const key = filmKey(film);
          setDownloading(film.id);
          try {
            await downloadFilm(film, controller.signal);
            heldRef.current.add(key);
            failedAt.delete(key);
            setFailed((prev) => withoutKey(prev, key));
            publish();
          } catch (err) {
            if (stopped) return;
            const message = err instanceof Error ? err.message : "Download failed";
            failedAt.set(key, Date.now());
            setFailed((prev) => new Map(prev).set(key, message));
            console.warn("[ROAM][wall] film-download-failed", { id: film.id, version: film.version, message });
          } finally {
            if (!stopped) setDownloading(null);
          }
          continue;
        }

        if (canEvictRef.current) {
          const keep = new Set(wantedRef.current.map(filmKey));
          await evictFilmsExcept(keep).catch(() => {});
          let dropped = false;
          for (const key of heldRef.current) {
            if (!keep.has(key)) {
              heldRef.current.delete(key);
              dropped = true;
            }
          }
          if (dropped) publish();
        }
        await rest(CACHE_IDLE_MS);
      }
    };

    void run();
    return () => {
      stopped = true;
      controller.abort();
      wakeRef.current?.();
    };
  }, [publish]);

  const signature = wanted.map(filmKey).join("|");
  useEffect(() => {
    wakeRef.current?.();
  }, [signature]);

  /** Forgets a film that would not play, so the next rotation fetches a fresh copy. */
  const discard = useCallback(
    async (film: WallFilm) => {
      heldRef.current.delete(filmKey(film));
      publish();
      await discardFilm(film).catch(() => {});
      wakeRef.current?.();
    },
    [publish]
  );

  const readyIds = useMemo(
    () => new Set(wanted.filter((film) => heldKeys.has(filmKey(film))).map((film) => film.id)),
    [wanted, heldKeys]
  );

  return { readyIds, downloading, failed, discard };
}

function withoutKey<T>(map: ReadonlyMap<string, T>, key: string): ReadonlyMap<string, T> {
  if (!map.has(key)) return map;
  const next = new Map(map);
  next.delete(key);
  return next;
}
