"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { readFilm } from "@/lib/film-cache";
import type { WallFilm } from "@/lib/types";
import { etaMinutes, upNextEtaMs } from "./eta";
import { playOrder, upNextAfter, type PlayOrderOptions } from "./playlist";
import {
  ASSUMED_FILM_MS,
  COUNTDOWN_TOTAL_MS,
  FILM_STALL_MS,
  INTERSTITIAL_FILM_MS,
  FILMS_PER_BREAK,
  INTERSTITIAL_MAX_MS,
  RELOAD_AFTER_MS,
} from "./timings";

/**
 * The sequence in the main region, from the brief:
 *
 *   countdown -> guest A's film (slot 1) -> countdown -> guest B's film (slot 2) -> interstitial
 *
 * Each film plays once per turn. The second slot is whoever the rotation names after the
 * first, which is the same answer the Up Next panel gives during it. With only one film on
 * the wall there is no second guest, and the run goes straight to the interstitial.
 *
 * The interstitial is also the resting state: with nothing to play it loops, and every time
 * it ends the next guest is picked afresh, so a film that lands mid-interstitial starts as
 * soon as that interstitial finishes.
 *
 * `token` increases on every step, including interstitial to interstitial, and is what the
 * player keys a restart on.
 *
 * Nothing here may leave the screen black. Each way a step can fail to finish has its own
 * exit: a film that stalls or will not decode is skipped (and sent to the back of the
 * rotation so it cannot hold the wall), and an interstitial that never ends is timed out.
 */
export type Step =
  | { kind: "interstitial"; token: number }
  | { kind: "countdown"; token: number; filmId: string; slot: number }
  | { kind: "film"; token: number; filmId: string; slot: number };

type NextStep =
  | { kind: "interstitial" }
  | { kind: "countdown"; filmId: string; slot: number }
  | { kind: "film"; filmId: string; slot: number };

export interface WallLoopInput {
  films: readonly WallFilm[];
  filmsById: Readonly<Record<string, WallFilm>>;
  order: PlayOrderOptions;
  markPlayed: (id: string) => void;
  discard: (film: WallFilm) => Promise<void>;
}

function makeStep(next: NextStep, token: number): Step {
  switch (next.kind) {
    case "interstitial":
      return { kind: "interstitial", token };
    case "countdown":
      return { kind: "countdown", token, filmId: next.filmId, slot: next.slot };
    case "film":
      return { kind: "film", token, filmId: next.filmId, slot: next.slot };
  }
}

export function useWallLoop(input: WallLoopInput) {
  const [step, setStep] = useState<Step>({ kind: "interstitial", token: 0 });
  const [filmUrl, setFilmUrl] = useState<string | null>(null);

  const stepRef = useRef(step);
  const inputRef = useRef(input);
  inputRef.current = input;
  const tokenRef = useRef(0);
  const urlRef = useRef<string | null>(null);
  const progressRef = useRef(0);
  /**
   * Whether the card on screen is up because there was nothing to play, rather than because
   * a guest's run just ended. A resting card is filler and gives way to the first film that
   * is ready; a card between two guests always plays in full. The wall starts resting, which
   * is what stops a cold start sitting through a whole card before its first film.
   */
  const restingRef = useRef(true);
  /** What the film on screen has reported about itself, for the Up Next panel's estimate. */
  const filmClockRef = useRef({ playedMs: 0, filmMs: ASSUMED_FILM_MS });

  const go = useCallback((next: NextStep) => {
    tokenRef.current += 1;
    const value = makeStep(next, tokenRef.current);
    // Written ahead of the render so a second media event in the same tick sees the new step.
    stepRef.current = value;
    setStep(value);
  }, []);

  const releaseFilm = useCallback(() => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setFilmUrl(null);
  }, []);

  const startNext = useCallback(() => {
    const { films, order } = inputRef.current;
    const next = playOrder(films, order)[0];
    restingRef.current = !next;
    go(next ? { kind: "countdown", filmId: next.id, slot: 1 } : { kind: "interstitial" });
  }, [go]);

  /**
   * A film that will not play is skipped rather than retried in place. Marking it played
   * sends it to the back of the rotation.
   *
   * Only a failure that points at the bytes (a decode error, a copy missing from the cache)
   * discards the local copy so its next turn plays a fresh download. A stall does not: it is
   * almost always the browser (a hidden or locked screen, a busy decoder), not the file, and
   * discarding on it re-downloaded a whole film every ~30 s for as long as the stall lasted,
   * which was 40+ GB overnight on 2026-09-16.
   */
  const failFilm = useCallback(
    (reason: string, discardCopy = true) => {
      const current = stepRef.current;
      if (current.kind === "interstitial") return;
      const film = inputRef.current.filmsById[current.filmId];
      console.warn("[ROAM][wall] film-skipped", { id: current.filmId, reason });
      inputRef.current.markPlayed(current.filmId);
      if (film && discardCopy) void inputRef.current.discard(film);
      restingRef.current = false;
      go({ kind: "interstitial" });
    },
    [go]
  );

  // Every countdown is its film's load window: read it out of the cache while the title and
  // the digits run, so it is decoded and waiting when the countdown ends.
  useEffect(() => {
    if (step.kind !== "countdown") return;
    const film = inputRef.current.filmsById[step.filmId];
    const token = step.token;
    let cancelled = false;
    releaseFilm();
    void (async () => {
      const blob = film ? await readFilm(film).catch(() => null) : null;
      if (cancelled || stepRef.current.token !== token) return;
      if (!blob) {
        failFilm("not in the cache");
        return;
      }
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      setFilmUrl(url);
    })();
    return () => {
      cancelled = true;
    };
  }, [step, releaseFilm, failFilm]);

  useEffect(() => {
    if (step.kind !== "countdown") return;
    const timer = setTimeout(() => go({ kind: "film", filmId: step.filmId, slot: step.slot }), COUNTDOWN_TOTAL_MS);
    return () => clearTimeout(timer);
  }, [step, go]);

  useEffect(() => {
    if (step.kind !== "film") return;
    progressRef.current = Date.now();
    filmClockRef.current = { playedMs: 0, filmMs: ASSUMED_FILM_MS };
    const interval = setInterval(() => {
      // A hidden page's video is paused by the browser, not stalled. Count from when it is
      // visible again.
      if (document.hidden) {
        progressRef.current = Date.now();
        return;
      }
      if (Date.now() - progressRef.current > FILM_STALL_MS) failFilm("stalled", false);
    }, 1000);
    return () => clearInterval(interval);
  }, [step, failFilm]);

  const onInterstitialEnded = useCallback(() => {
    if (stepRef.current.kind !== "interstitial") return;
    // Reload at a seam, never mid-film. Everything worth keeping is in localStorage and the
    // film cache, so the wall picks up at the next guest.
    if (performance.now() > RELOAD_AFTER_MS) {
      window.location.reload();
      return;
    }
    startNext();
  }, [startNext]);

  useEffect(() => {
    if (step.kind !== "interstitial") return;
    releaseFilm();
    const timer = setTimeout(onInterstitialEnded, INTERSTITIAL_MAX_MS);
    return () => clearTimeout(timer);
  }, [step, releaseFilm, onInterstitialEnded]);

  const onFilmEnded = useCallback(() => {
    const current = stepRef.current;
    if (current.kind !== "film") return;
    const { films, order, markPlayed } = inputRef.current;
    markPlayed(current.filmId);
    restingRef.current = false;
    // Asked as if this film had already been recorded, because `markPlayed` lands on the next
    // render. When this is the only film, the answer is itself, and it waits for its next turn.
    const next =
      current.slot < FILMS_PER_BREAK ? upNextAfter(films, order, current.filmId, Date.now()) : null;
    go(
      next && next.id !== current.filmId
        ? { kind: "countdown", filmId: next.id, slot: current.slot + 1 }
        : { kind: "interstitial" }
    );
  }, [go]);

  const onFilmProgress = useCallback((currentTime: number, duration: number) => {
    progressRef.current = Date.now();
    filmClockRef.current = {
      playedMs: currentTime * 1000,
      filmMs: Number.isFinite(duration) && duration > 0 ? duration * 1000 : ASSUMED_FILM_MS,
    };
  }, []);

  // An operator hid the film on screen (or it aged out of the window). Cut to the
  // interstitial now rather than finishing it: taking it off the screen is the point.
  const currentId = step.kind === "interstitial" ? null : step.filmId;
  const currentGone =
    currentId !== null && (input.order.hidden.has(currentId) || !input.filmsById[currentId]);
  useEffect(() => {
    if (!currentGone) return;
    restingRef.current = false;
    go({ kind: "interstitial" });
  }, [currentGone, go]);

  const queue = useMemo(() => playOrder(input.films, input.order), [input.films, input.order]);

  /**
   * A resting card gives way as soon as the wall holds a film, rather than running to its
   * end first. It is what the wall shows when it has nothing, so the moment it has something
   * there is nothing to wait for: a cold start plays its first guest as the download lands.
   */
  const restingHead = step.kind === "interstitial" ? queue[0]?.id ?? null : null;
  useEffect(() => {
    if (!restingHead || !restingRef.current) return;
    startNext();
  }, [restingHead, startNext]);

  /**
   * During a guest's run, what follows it; during an interstitial, what is about to start.
   * Both come from the same rule the loop itself uses, so the panel cannot promise a guest
   * the loop will not play.
   */
  const upNext = useMemo(() => {
    if (currentId === null) return queue[0] ?? null;
    return upNextAfter(input.films, input.order, currentId, Date.now());
  }, [currentId, queue, input.films, input.order]);

  /**
   * How long until the guest the panel names is on screen, for the panel's "MINS AWAY".
   *
   * Re-read every second and stored only when the whole minute the panel shows changes, so
   * the figure steps down on the minute it crosses without re-rendering the wall every
   * second. It used to be stored only when it moved by half a minute against the last value
   * stored, read every 5 s, which could hold a figure up to 35 s past the minute and read as
   * stuck.
   */
  const [upNextEta, setUpNextEta] = useState(0);
  // Read through a ref so a poll that changes who is up next does not restart the step's clock.
  const cardBetweenRef = useRef(false);
  cardBetweenRef.current =
    step.kind !== "interstitial" && (step.slot >= FILMS_PER_BREAK || !upNext || upNext.id === step.filmId);
  useEffect(() => {
    const startedAt = Date.now();
    const read = () => {
      const clock = filmClockRef.current;
      const next = upNextEtaMs({
        step: step.kind,
        cardBetween: cardBetweenRef.current,
        elapsedMs: Date.now() - startedAt,
        filmMs: clock.filmMs,
        playedMs: clock.playedMs,
        countdownMs: COUNTDOWN_TOTAL_MS,
        interstitialMs: INTERSTITIAL_FILM_MS,
      });
      setUpNextEta((prev) => (etaMinutes(prev) === etaMinutes(next) ? prev : next));
    };
    read();
    const interval = setInterval(read, 1_000);
    return () => clearInterval(interval);
  }, [step]);

  return {
    step,
    filmUrl,
    currentFilm: currentId ? input.filmsById[currentId] ?? null : null,
    upNext,
    upNextEta,
    queue,
    onFilmEnded,
    onFilmFailed: failFilm,
    onFilmProgress,
    onInterstitialEnded,
  };
}
