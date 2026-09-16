"use client";

import { useEffect, useRef } from "react";
import { CountdownCard } from "./CountdownCard";
import { FilmChrome } from "./screen/FilmChrome";
import { InterstitialCard } from "./screen/InterstitialCard";
import { ScreenFrame } from "./screen/ScreenFrame";
import type { WallFilm } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { Step } from "@/machine/useWallLoop";
import { REGIONS, rectStyle } from "@/theme/regions";

interface MainPlayerProps {
  step: Step;
  film: WallFilm | null;
  filmUrl: string | null;
  onFilmEnded: () => void;
  onFilmFailed: (reason: string) => void;
  onFilmProgress: (currentTime: number, duration: number) => void;
  onInterstitialEnded: () => void;
}

/**
 * The main region: the guest's film, the countdown over it, and the campaign card between
 * guests. All three are comped on a 1920x1080 frame, which `ScreenFrame` scales into the
 * region, so everything inside is placed in the comps' own pixels.
 *
 * The film element stays mounted whatever the step is, and is toggled with `visibility`,
 * never unmounted or set to `display: none`: a hidden element is not guaranteed to keep its
 * decoded frames, and remounting would throw away the film loaded during the countdown. The
 * tablet learned the same lesson with its camera.
 *
 * The countdown and the campaign card are drawn rather than played, so there is no second
 * video to keep alive and no file to go missing. The campaign card reports its own end; the
 * loop's `INTERSTITIAL_MAX_MS` still covers a card that somehow never does.
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
}: MainPlayerProps) {
  const filmRef = useRef<HTMLVideoElement>(null);

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
      <ScreenFrame>
        <video
          ref={filmRef}
          src={filmUrl ?? undefined}
          muted
          playsInline
          preload="auto"
          className={cn(
            "absolute inset-0 h-full w-full object-contain",
            step.kind === "film" ? "visible" : "invisible"
          )}
          onEnded={onFilmEnded}
          onTimeUpdate={(event) => onFilmProgress(event.currentTarget.currentTime, event.currentTarget.duration)}
          onError={() => {
            if (filmUrl) onFilmFailed("decode error");
          }}
        />

        {step.kind === "film" && film && <FilmChrome firstName={film.firstName} />}
        {step.kind === "countdown" && film && <CountdownCard key={step.token} film={film} />}
        {step.kind === "interstitial" && <InterstitialCard key={step.token} onEnded={onInterstitialEnded} />}
      </ScreenFrame>
    </div>
  );
}
