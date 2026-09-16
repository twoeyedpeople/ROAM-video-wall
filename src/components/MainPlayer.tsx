"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CountdownCard } from "./CountdownCard";
import { InterstitialCard } from "./screen/InterstitialCard";
import { InterstitialFilm } from "./screen/InterstitialFilm";
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
 * The main region: the guest's film, the countdown over it, and the campaign spot between
 * guests. All three are comped on a 1920x1080 frame, which `ScreenFrame` scales into the
 * region, so everything inside is placed in the comps' own pixels.
 *
 * Both video elements stay mounted whatever the step is, and are toggled with `visibility`,
 * never unmounted or set to `display: none`: a hidden element is not guaranteed to keep its
 * decoded frames, and remounting would throw away the film loaded during the countdown. The
 * tablet learned the same lesson with its camera.
 *
 * Nothing is drawn over the guest's film. The render bakes the mach-e lockups, the ROAM logo
 * and the guest's name into the output itself, so a mark here would land twice; the wall's
 * own `FilmChrome` was deleted for that reason. Check the render before adding one back.
 *
 * The countdown is drawn. The campaign spot is the delivered film, and `InterstitialCard`,
 * which is drawn from the same comps, is what takes the step back if that file ever fails:
 * it needs nothing off disk, so it cannot fail the same way. Whichever plays reports its own
 * end, and the loop's `INTERSTITIAL_MAX_MS` still covers one that somehow never does.
 *
 * The fall back to the card is permanent for the life of the page. A missing or broken local
 * file is missing or broken on its next turn too, and a card every time beats a frozen frame
 * every time.
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
  const [spotFailed, setSpotFailed] = useState(false);
  const spotFailedRef = useRef(false);

  const failSpot = useCallback((reason: string) => {
    if (spotFailedRef.current) return;
    spotFailedRef.current = true;
    console.warn("[ROAM][wall] interstitial-film-failed", { reason });
    setSpotFailed(true);
  }, []);

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

        <InterstitialFilm
          active={step.kind === "interstitial" && !spotFailed}
          token={step.token}
          onEnded={onInterstitialEnded}
          onFailed={failSpot}
        />

        {step.kind === "countdown" && film && <CountdownCard key={step.token} film={film} />}
        {step.kind === "interstitial" && spotFailed && (
          <InterstitialCard key={step.token} onEnded={onInterstitialEnded} />
        )}
      </ScreenFrame>
    </div>
  );
}
