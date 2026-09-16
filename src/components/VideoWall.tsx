"use client";

import { useEffect, useMemo } from "react";
import { BRollPanel } from "./BRollPanel";
import { DebugOverlay } from "./DebugOverlay";
import { MainPlayer } from "./MainPlayer";
import { UpNextPanel } from "./UpNextPanel";
import { WallStage } from "./WallStage";
import { useFilmCache } from "@/hooks/useFilmCache";
import { useDebugFlag, useWakeLock } from "@/hooks/useKiosk";
import { useWallData } from "@/hooks/useWallData";
import { readDisplayToken } from "@/lib/booth";
import { DRY_RUN } from "@/lib/dry-run";
import { candidates, type PlayOrderOptions, type PlaylistOptions } from "@/machine/playlist";
import { REPLAY_LIMIT } from "@/machine/timings";
import { useWallLoop } from "@/machine/useWallLoop";

/**
 * The whole wall. Data flows one way:
 *
 *   useWallData   the booth's feed + this screen's memory of what has played
 *   candidates    which films the rotation wants, in play order
 *   useFilmCache  holds those locally, first in line first
 *   useWallLoop   plays the ones it holds, in the same order
 *
 * The rotation rule lives in `machine/playlist.ts` alone, and both the cache and the loop
 * read it, so what is downloaded first is what plays first.
 */
export function VideoWall() {
  const debug = useDebugFlag();
  useWakeLock();

  // Captures `?token=` and strips it from the address bar before anything else runs.
  useEffect(() => {
    readDisplayToken();
  }, []);

  const data = useWallData();

  const rotation = useMemo<PlaylistOptions>(
    () => ({ hidden: data.hidden, plays: data.plays, windowStartMs: data.windowStart, replayLimit: REPLAY_LIMIT }),
    [data.hidden, data.plays, data.windowStart]
  );
  const wanted = useMemo(() => candidates(data.films, rotation), [data.films, rotation]);
  const cache = useFilmCache(wanted, data.status.lastPollAt !== null);
  const order = useMemo<PlayOrderOptions>(() => ({ ...rotation, ready: cache.readyIds }), [rotation, cache.readyIds]);

  const loop = useWallLoop({
    films: data.films,
    filmsById: data.filmsById,
    order,
    markPlayed: data.markPlayed,
    discard: cache.discard,
  });

  return (
    <WallStage>
      <MainPlayer
        step={loop.step}
        film={loop.currentFilm}
        filmUrl={loop.filmUrl}
        onFilmEnded={loop.onFilmEnded}
        onFilmFailed={loop.onFilmFailed}
        onFilmProgress={loop.onFilmProgress}
        onInterstitialEnded={loop.onInterstitialEnded}
        onInterstitialFailed={loop.onInterstitialFailed}
      />
      <UpNextPanel film={loop.upNext} />
      <BRollPanel />
      {DRY_RUN && (
        // Deliberately off-brand, as on the tablet: a wall left in a dry run looks like a
        // working wall showing strangers, and someone has to be able to tell.
        <div className="absolute bottom-6 right-6 rounded bg-[#ffb000] px-4 py-2 font-ui text-[22px] font-medium uppercase tracking-caps text-ink">
          Dry run
        </div>
      )}
      {debug && (
        <DebugOverlay
          step={loop.step}
          current={loop.currentFilm}
          upNext={loop.upNext}
          queue={loop.queue}
          films={wanted}
          readyIds={cache.readyIds}
          hidden={data.hidden}
          downloading={cache.downloading}
          failed={cache.failed}
          status={data.status}
          cursor={data.cursor}
          windowStart={data.windowStart}
        />
      )}
    </WallStage>
  );
}
