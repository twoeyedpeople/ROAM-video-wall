"use client";

import { useEffect, useRef } from "react";
import { CountdownCard } from "./CountdownCard";
import type { WallFilm } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { Step } from "@/machine/useWallLoop";
import { REGIONS, rectStyle } from "@/theme/regions";

/** Placeholder until the real interstitial is supplied. Swap the file, keep the path. */
export const INTERSTITIAL_SRC = "/assets/wall/interstitial.mp4";

interface MainPlayerProps {
  step: Step;
  film: WallFilm | null;
  filmUrl: string | null;
  onFilmEnded: () => void;
  onFilmFailed: (reason: string) => void;
  onFilmProgress: () => void;
  onInterstitialEnded: () => void;
  onInterstitialFailed: () => void;
}

/**
 * The main region: the interstitial, the guest's film and the countdown card over them.
 *
 * Both videos stay mounted and are toggled with `visibility`, never unmounted or set to
 * `display: none`: a hidden element is not guaranteed to keep its decoded frames, and
 * remounting would throw away the film loaded during the countdown. The tablet learned the
 * same lesson with its camera.
 *
 * Muted, always. Autoplay without a user gesture is only guaranteed muted, and the wall has
 * no one to tap it. See the README for running with sound.
 */
export function MainPlayer({
  step,
  film,
  filmUrl,
  onFilmEnded,
  onFilmFailed,
  onFilmProgress,
  onInterstitialEnded,
  onInterstitialFailed,
}: MainPlayerProps) {
  const interstitialRef = useRef<HTMLVideoElement>(null);
  const filmRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = interstitialRef.current;
    if (!video) return;
    if (step.kind !== "interstitial") {
      video.pause();
      return;
    }
    video.muted = true;
    video.currentTime = 0;
    video.play().catch(() => onInterstitialFailed());
  }, [step, onInterstitialFailed]);

  useEffect(() => {
    const video = filmRef.current;
    if (!video) return;
    if (step.kind !== "film") {
      video.pause();
      return;
    }
    // Still being read out of the cache. The loop's stall watchdog decides if it never comes.
    if (!filmUrl) return;
    video.muted = true;
    video.currentTime = 0;
    video.play().catch((err: unknown) => {
      if ((err as DOMException)?.name === "NotSupportedError") onFilmFailed("unplayable");
    });
  }, [step, filmUrl, onFilmFailed]);

  return (
    <div className="overflow-hidden bg-ink" style={rectStyle(REGIONS.main)}>
      <video
        ref={interstitialRef}
        src={INTERSTITIAL_SRC}
        muted
        playsInline
        preload="auto"
        className={cn(
          "absolute inset-0 h-full w-full object-contain",
          step.kind === "interstitial" ? "visible" : "invisible"
        )}
        onEnded={onInterstitialEnded}
        onError={onInterstitialFailed}
      />
      <video
        ref={filmRef}
        src={filmUrl ?? undefined}
        muted
        playsInline
        preload="auto"
        className={cn("absolute inset-0 h-full w-full object-contain", step.kind === "film" ? "visible" : "invisible")}
        onEnded={onFilmEnded}
        onTimeUpdate={onFilmProgress}
        onError={() => {
          if (filmUrl) onFilmFailed("decode error");
        }}
      />
      {step.kind === "countdown" && film && <CountdownCard key={step.token} film={film} />}
    </div>
  );
}
