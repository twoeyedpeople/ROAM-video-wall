import { displayName } from "@/content/copy";
import type { FeedStatus } from "@/hooks/useWallData";
import type { WallFilm } from "@/lib/types";
import type { Step } from "@/machine/useWallLoop";
import { REGIONS, rectStyle, type Rect } from "@/theme/regions";

interface DebugOverlayProps {
  step: Step;
  current: WallFilm | null;
  upNext: WallFilm | null;
  queue: readonly WallFilm[];
  films: readonly WallFilm[];
  readyIds: ReadonlySet<string>;
  hidden: ReadonlySet<string>;
  downloading: string | null;
  failed: ReadonlyMap<string, string>;
  status: FeedStatus;
  cursor: number;
  windowStart: number;
}

/** Drawn in the black space, clear of all three regions. */
const PANEL: Rect = { x: 1080, y: 290, w: 800, h: 520 };

/**
 * `?debug=1`. Outlines the three regions and reports what the loop is doing, what it holds
 * and how the feed is. For setting up the screen and for review; never for guests, and
 * documented in CLAUDE.md rather than hinted at on screen.
 */
export function DebugOverlay(props: DebugOverlayProps) {
  const { step, current, upNext, queue, films, readyIds, hidden, downloading, failed, status, cursor, windowStart } = props;
  const name = (film: WallFilm | null) => (film ? `${displayName(film.firstName) || "(no name)"} ${film.id}` : "none");
  const stepLabel = step.kind === "interstitial" ? "interstitial" : `${step.kind} slot ${step.slot}`;

  return (
    <>
      {(Object.entries(REGIONS) as [string, Rect][]).map(([label, rect]) => (
        <div
          key={label}
          className="pointer-events-none border-2 border-dashed border-[#ff3df2]"
          style={rectStyle(rect)}
        >
          <span className="absolute left-1 top-1 bg-[#ff3df2] px-1 font-ui text-[14px] text-ink">
            {label} {rect.w}x{rect.h} @ {rect.x},{rect.y}
          </span>
        </div>
      ))}
      <div
        className="overflow-hidden rounded border border-line bg-[#0b0b0b]/90 p-5 font-ui text-[17px] leading-[1.45] text-white"
        style={rectStyle(PANEL)}
      >
        <p className="mb-2 text-[13px] uppercase tracking-caps text-muted">Video wall debug</p>
        <p>step: {stepLabel} (#{step.token})</p>
        <p>now: {name(current)}</p>
        <p>up next: {name(upNext)}</p>
        <p>
          films: {films.length} in window, {readyIds.size} held, {hidden.size} hidden
          {downloading ? `, fetching ${downloading}` : ""}
          {failed.size ? `, ${failed.size} failed` : ""}
        </p>
        <p>
          feed: {status.polls} polls, last {status.lastPollAt ? new Date(status.lastPollAt).toLocaleTimeString() : "never"}
          {status.lastError ? `, error: ${status.lastError}` : ""}
        </p>
        <p>cursor: {cursor ? new Date(cursor).toLocaleString() : "unset"}</p>
        <p>window from: {new Date(windowStart).toLocaleString()}</p>
        <p className="mt-2 text-muted">queue ({queue.length}):</p>
        <p className="line-clamp-4 text-muted">
          {queue.slice(0, 12).map((film) => displayName(film.firstName) || film.id).join(", ") || "empty"}
        </p>
      </div>
    </>
  );
}
