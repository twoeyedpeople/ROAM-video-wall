"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DRY_RUN } from "@/lib/dry-run";
import { fetchFeed, isWallFilm } from "@/lib/feed";
import type { WallFeed, WallFilm } from "@/lib/types";
import { completedMs, recordPlay, type PlayRecord } from "@/machine/playlist";
import { POLL_MS } from "@/machine/timings";

/**
 * What the wall knows: the films, what has been hidden, what has played, and where the feed
 * cursor is. Polled from the booth and kept in `localStorage`, so a reload (including the
 * wall's own scheduled one) resumes the rotation instead of replaying everyone as new.
 *
 * `localStorage` is the right store for this because it is one screen's own memory of what
 * it has shown. Nothing else reads it, and losing it costs a re-download and a rotation that
 * starts over, never a film.
 */

interface WallState {
  cursor: number;
  films: Record<string, WallFilm>;
  hidden: string[];
  plays: Record<string, PlayRecord>;
}

export interface FeedStatus {
  lastPollAt: number | null;
  lastError: string | null;
  polls: number;
}

const EMPTY_STATE: WallState = { cursor: 0, films: {}, hidden: [], plays: {} };

// A dry run keeps its own memory, so reviewing on the event machine cannot leave sample
// guests in the real rotation.
const STORAGE_KEY = DRY_RUN ? "roam-wall:state:v1:dry-run" : "roam-wall:state:v1";

/**
 * The start of what plays: the later of NEXT_PUBLIC_WALL_SINCE and local midnight. The
 * first keeps pre-event test runs off the wall; the second is what "the current event day"
 * means, so each day replays only that day's guests.
 */
export function currentWindowStart(now = Date.now()): number {
  const configured = Date.parse(process.env.NEXT_PUBLIC_WALL_SINCE || "");
  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);
  return Math.max(Number.isFinite(configured) ? configured : 0, midnight.getTime());
}

export function useWallData() {
  const [state, setState] = useState<WallState>(EMPTY_STATE);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<FeedStatus>({ lastPollAt: null, lastError: null, polls: 0 });
  const [windowStart, setWindowStart] = useState(() => currentWindowStart());
  const stateRef = useRef(state);
  stateRef.current = state;

  // Read after mount, never during render: the server has no localStorage, and reading it in
  // render would hand the first paint a different tree from the one the server sent.
  useEffect(() => {
    const stored = loadState();
    stateRef.current = stored;
    setState(stored);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) saveState(state);
  }, [loaded, state]);

  useEffect(() => {
    if (!loaded) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();

    const tick = async () => {
      const start = currentWindowStart();
      setWindowStart(start);
      try {
        const feed = await fetchFeed(Math.max(stateRef.current.cursor, start), controller.signal);
        if (cancelled) return;
        setState((prev) => mergeFeed(prev, feed, start));
        setStatus((prev) => ({ lastPollAt: Date.now(), lastError: null, polls: prev.polls + 1 }));
      } catch (err) {
        if (cancelled) return;
        // Swallowed on purpose. The loop keeps playing what it holds; the next poll retries.
        setStatus((prev) => ({ ...prev, lastError: err instanceof Error ? err.message : "Feed unavailable" }));
      }
      if (!cancelled) timer = setTimeout(tick, POLL_MS);
    };

    void tick();
    return () => {
      cancelled = true;
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [loaded]);

  const markPlayed = useCallback((id: string) => {
    setState((prev) => ({ ...prev, plays: recordPlay(prev.plays, id, Date.now()) }));
  }, []);

  const films = useMemo(() => Object.values(state.films), [state.films]);
  const hidden = useMemo(() => new Set(state.hidden), [state.hidden]);

  return {
    loaded,
    films,
    filmsById: state.films,
    hidden,
    plays: state.plays,
    cursor: state.cursor,
    windowStart,
    status,
    markPlayed,
  };
}

/**
 * Folds one poll into what the wall holds. Unchanged pieces keep their identity, so a poll
 * that brings nothing new re-renders nothing downstream of it.
 */
function mergeFeed(prev: WallState, feed: WallFeed, windowStart: number): WallState {
  const films: Record<string, WallFilm> = { ...prev.films };
  for (const film of feed.films) {
    const held = films[film.id];
    // Same id, new version: a re-render landed. The cache sees a new key and refetches.
    if (
      !held ||
      held.version !== film.version ||
      held.firstName !== film.firstName ||
      held.completedAt !== film.completedAt
    ) {
      films[film.id] = film;
    }
  }
  for (const [id, film] of Object.entries(films)) {
    if (completedMs(film) < windowStart) delete films[id];
  }

  const plays: Record<string, PlayRecord> = {};
  for (const [id, record] of Object.entries(prev.plays)) {
    if (films[id]) plays[id] = record;
  }
  const hidden = feed.hidden.filter((id) => films[id]);

  return {
    cursor: feed.cursor,
    films: sameEntries(prev.films, films) ? prev.films : films,
    hidden: sameList(prev.hidden, hidden) ? prev.hidden : hidden,
    plays: sameEntries(prev.plays, plays) ? prev.plays : plays,
  };
}

function sameEntries<T>(left: Record<string, T>, right: Record<string, T>): boolean {
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length && keys.every((key) => left[key] === right[key]);
}

function sameList(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function loadState(): WallState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STATE;
    const parsed = JSON.parse(raw) as Partial<WallState>;
    const films: Record<string, WallFilm> = {};
    for (const film of Object.values(parsed.films ?? {})) {
      if (isWallFilm(film)) films[film.id] = film;
    }
    const plays: Record<string, PlayRecord> = {};
    for (const [id, record] of Object.entries(parsed.plays ?? {})) {
      if (Number.isFinite(record?.count) && Number.isFinite(record?.lastPlayedAt)) plays[id] = record;
    }
    return {
      cursor: Number.isFinite(parsed.cursor) ? Number(parsed.cursor) : 0,
      films,
      hidden: Array.isArray(parsed.hidden) ? parsed.hidden.filter((id): id is string => typeof id === "string") : [],
      plays,
    };
  } catch {
    return EMPTY_STATE;
  }
}

function saveState(state: WallState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or disabled. The wall runs on; a reload just starts the rotation over.
  }
}
