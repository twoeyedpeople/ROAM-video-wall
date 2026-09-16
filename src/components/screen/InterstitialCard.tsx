"use client";

import { useEffect, useState } from "react";
import { COPY } from "@/content/copy";
import { cn } from "@/lib/utils";
import { INTERSTITIAL_BEATS } from "@/machine/timings";
import { capSize } from "@/theme/type";
import { Backdrop } from "./Backdrop";
import { FordScript, MacheWordmark, RegistrationMarks } from "./Marks";

/**
 * The campaign card, between guests and whenever there is nothing to play (Figma
 * `Screen-Video_02` to `_05`).
 *
 * It builds: the field alone, then STAR IN / YOUR, then OWN FILM under them, then the Ford
 * script lands between the first two, then it all clears. `INTERSTITIAL_BEATS` holds the
 * timing and this card holds the drawing.
 *
 * It replaces the placeholder `interstitial.mp4`. A produced film can take the region back
 * by giving the loop a `<video>` again in `MainPlayer`; nothing else assumes either.
 *
 * The bottom-right crosshair is missing on purpose: the mach-e lockup has that corner, and
 * the comp drops the mark rather than stack them.
 */
const LEAD = { top: 303.0, cap: 112.8, left: 157.7, right: 162.9 };
/**
 * The comp's headline is 324.5 tall. The licensed face sets a few per cent wider than the
 * outlines it was drawn with, and OWN and FILM are pinned to opposite edges of the frame's
 * margins, so at 324.5 the two words meet in the middle. Fitted to the comp's box instead,
 * which keeps its gap; the cap is the only thing that gives, by 4%.
 */
const HEADLINE = { top: 450.8, cap: 310, left: 157.7, right: 162.9 };
const FORD = { left: 822.4, top: 299.1, width: 302.28 };
const LOCKUP = { right: 38.5, bottom: 33.35, length: 349.4 };

/** The card's stages, in the order they arrive. Each is a beat in `INTERSTITIAL_BEATS`. */
type Stage = "field" | "lead" | "headline" | "ford" | "clear";

const SEQUENCE: readonly { at: number; stage: Stage }[] = [
  { at: INTERSTITIAL_BEATS.lead, stage: "lead" },
  { at: INTERSTITIAL_BEATS.headline, stage: "headline" },
  { at: INTERSTITIAL_BEATS.ford, stage: "ford" },
  { at: INTERSTITIAL_BEATS.clear, stage: "clear" },
];

const ORDER: readonly Stage[] = ["field", "lead", "headline", "ford", "clear"];

function shown(stage: Stage, from: Stage): boolean {
  if (stage === "clear") return false;
  return ORDER.indexOf(stage) >= ORDER.indexOf(from);
}

export function InterstitialCard({ onEnded }: { onEnded: () => void }) {
  const [stage, setStage] = useState<Stage>("field");

  useEffect(() => {
    const timers = SEQUENCE.map((beat) => window.setTimeout(() => setStage(beat.stage), beat.at));
    timers.push(window.setTimeout(onEnded, INTERSTITIAL_BEATS.end));
    return () => timers.forEach(window.clearTimeout);
  }, [onEnded]);

  const lead = shown(stage, "lead");
  const headline = shown(stage, "headline");
  const ford = shown(stage, "ford");

  return (
    <div className="absolute inset-0 overflow-hidden bg-ink">
      {/* The still lifts under the type and settles back once the card clears. */}
      <Backdrop glow="wide" still={lead ? 0.2 : 0.05} />

      <RegistrationMarks corners={["topLeft", "topRight", "bottomLeft"]} />

      <Reveal on={lead}>
        <div
          className="absolute flex items-start justify-between"
          style={{ left: LEAD.left, right: LEAD.right, top: LEAD.top }}
        >
          <CampaignWord cap={LEAD.cap}>{COPY.campaignLead}</CampaignWord>
          <CampaignWord cap={LEAD.cap}>{COPY.campaignLeadEnd}</CampaignWord>
        </div>
      </Reveal>

      <Reveal on={headline}>
        <div
          className="absolute flex items-start justify-between"
          style={{ left: HEADLINE.left, right: HEADLINE.right, top: HEADLINE.top }}
        >
          <CampaignWord cap={HEADLINE.cap}>{COPY.campaignOwn}</CampaignWord>
          <CampaignWord cap={HEADLINE.cap}>{COPY.campaignFilm}</CampaignWord>
        </div>
      </Reveal>

      <Reveal on={ford}>
        <FordScript width={FORD.width} className="absolute" style={{ left: FORD.left, top: FORD.top }} />
      </Reveal>

      <Reveal on={lead}>
        <MacheWordmark
          length={LOCKUP.length}
          className="absolute"
          style={{ right: LOCKUP.right, bottom: LOCKUP.bottom }}
        />
      </Reveal>
    </div>
  );
}

/** One word of the campaign line, placed by its capitals like everything else on the frame. */
function CampaignWord({ cap, children }: { cap: number; children: string }) {
  return (
    <span
      className="cap-trim block whitespace-nowrap font-headline uppercase tracking-display text-ford-skyview"
      style={{ fontSize: capSize(cap, "headline") }}
    >
      {children}
    </span>
  );
}

/** Each piece arrives on its beat and leaves with the rest of the card. */
function Reveal({ on, children }: { on: boolean; children: React.ReactNode }) {
  return (
    <div className={cn("absolute inset-0 transition-opacity duration-500 ease-roam", on ? "opacity-100" : "opacity-0")}>
      {children}
    </div>
  );
}
