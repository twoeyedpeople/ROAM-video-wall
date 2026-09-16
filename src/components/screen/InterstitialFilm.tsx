"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { FILM_STALL_MS } from "@/machine/timings";

/** The produced campaign spot. Swap the file, keep the path, and see `INTERSTITIAL_FILM_MS`. */
export const INTERSTITIAL_SRC = "/assets/wall/interstitial.mp4";

interface InterstitialFilmProps {
  /** The interstitial step is on screen and this film, rather than the card, is playing it. */
  active: boolean;
  /** The loop's step token. A new one is a new turn, and restarts the film from its first frame. */
  token: number;
  onEnded: () => void;
  onFailed: (reason: string) => void;
}

/**
 * The campaign spot between guests: the delivered film, played full-frame on the 1920x1080
 * comp frame it was cut for.
 *
 * It stays mounted whatever the step is and is toggled with `visibility`, for the same reason
 * the guest's film is: a remount throws away what the browser has loaded and decoded, and this
 * one plays again every couple of minutes all day.
 *
 * It is silent by design. The master's audio track is digital silence, so it is not carried in
 * the encode, and the wall is muted anyway.
 *
 * Every way it can fail to reach its end is reported, because the drawn card behind it is what
 * keeps the screen from going black: a file that will not play, one that will not decode, and
 * one that plays and then stops making progress.
 */
export function InterstitialFilm({ active, token, onEnded, onFailed }: InterstitialFilmProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const progressRef = useRef(0);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (!active) {
      video.pause();
      return;
    }
    progressRef.current = Date.now();
    video.muted = true;
    video.currentTime = 0;
    video.play().catch((err: unknown) => {
      // `pause()` in this effect's own cleanup rejects the pending promise with an abort. A
      // resting interstitial gives way to the first film that is ready, so that happens on an
      // ordinary day and is the loop moving on, not a file that will not play.
      const name = (err as DOMException)?.name;
      if (name !== "AbortError") onFailed(`would not play (${name ?? "unknown"})`);
    });
    const interval = setInterval(() => {
      if (Date.now() - progressRef.current > FILM_STALL_MS) onFailed("stalled");
    }, 1000);
    return () => clearInterval(interval);
  }, [active, token, onFailed]);

  return (
    <video
      ref={ref}
      src={INTERSTITIAL_SRC}
      muted
      playsInline
      preload="auto"
      className={cn("absolute inset-0 h-full w-full object-contain", active ? "visible" : "invisible")}
      onEnded={onEnded}
      onTimeUpdate={() => {
        progressRef.current = Date.now();
      }}
      onError={() => onFailed("decode error")}
    />
  );
}
