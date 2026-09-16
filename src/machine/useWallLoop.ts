"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { readFilm } from "@/lib/film-cache";
import type { WallFilm } from "@/lib/types";
import { upNextEtaMs } from "./eta";
import { playOrder, upNextAfter, type PlayOrderOptions } from "./playlist";
import {
  ASSUMED_FILM_MS,
  COUNTDOWN_TOTAL_MS,
  FILM_STALL_MS,
  INTERSTITIAL_FILM_MS,
  INTERSTITIAL_MAX_MS,
  PLAYS_PER_GUEST,
  RELOAD_AFTER_MS,
} from "./timings";

/**
 * The sequence in the main region, from the brief:
 *
 *   countdown (pass 1) -> film -> countdown (pass 2) -> film -> interstitial -> next guest
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
  | { kind: "countdown"; token: number; filmId: string; pass: number }
  | { kind: "film"; token: number; filmId: string; pass: number };

type NextStep =
  | { kind: "interstitial" }
  | { kind: "countdown"; filmId: string; pass: number }
  | { kind: "film"; filmId: string; pass: number };

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
      return { kind: "countdown", token, filmId: next.filmId, pass: next.pass };
    case "film":
      return { kind: "film", token, filmId: next.filmId, pass: next.pass };
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
    go(next ? { kind: "countdown", filmId: next.id, pass: 1 } : { kind: "interstitial" });
  }, [go]);

  /**
   * A film that will not play is skipped rather than retried in place. Marking it played
   * sends it to the back of the rotation, and discarding the local copy means its next turn
   * plays a fresh download rather than the same broken bytes.
   */
  const failFilm = useCallback(
    (reason: string) => {
      const current = stepRef.current;
      if (current.kind === "interstitial") return;
      const film = inputRef.current.filmsById[current.filmId];
      console.warn("[ROAM][wall] film-skipped", { id: current.filmId, reason });
      inputRef.current.markPlayed(current.filmId);
      if (film) void inputRef.current.discard(film);
      restingRef.current = false;
      go({ kind: "interstitial" });
    },
    [go]
  );

  // Pass 1's countdown is the film's load window: read it out of the cache while the title
  // and the digits run, so it is decoded and waiting when the countdown ends.
  useEffect(() => {
    if (step.kind !== "countdown" || step.pass !== 1) return;
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
    const timer = setTimeout(() => go({ kind: "film", filmId: step.filmId, pass: step.pass }), COUNTDOWN_TOTAL_MS);
    return () => clearTimeout(timer);
  }, [step, go]);

  useEffect(() => {
    if (step.kind !== "film") return;
    progressRef.current = Date.now();
    filmClockRef.current = { playedMs: 0, filmMs: ASSUMED_FILM_MS };
    const interval = setInterval(() => {
      if (Date.now() - progressRef.current > FILM_STALL_MS) failFilm("stalled");
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
    if (current.pass < PLAYS_PER_GUEST) {
      go({ kind: "countdown", filmId: current.filmId, pass: current.pass + 1 });
      return;
    }
    inputRef.current.markPlayed(current.filmId);
    restingRef.current = false;
    go({ kind: "interstitial" });
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
   * Re-read on a slow tick and only stored when it moves by more than half a minute, so a
   * figure the panel rounds to whole minutes cannot re-render the wall every second.
   */
  const [upNextEta, setUpNextEta] = useState(0);
  useEffect(() => {
    const startedAt = Date.now();
    const read = () => {
      const clock = filmClockRef.current;
      const next = upNextEtaMs({
        step: step.kind,
        pass: step.kind === "interstitial" ? 0 : step.pass,
        elapsedMs: Date.now() - startedAt,
        filmMs: clock.filmMs,
        playedMs: clock.playedMs,
        playsPerGuest: PLAYS_PER_GUEST,
        countdownMs: COUNTDOWN_TOTAL_MS,
        interstitialMs: INTERSTITIAL_FILM_MS,
      });
      setUpNextEta((prev) => (Math.abs(prev - next) < ETA_STEP_MS ? prev : next));
    };
    read();
    const interval = setInterval(read, 5_000);
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

/** How far the estimate has to move before the panel is worth re-rendering. */
const ETA_STEP_MS = 30_000;
