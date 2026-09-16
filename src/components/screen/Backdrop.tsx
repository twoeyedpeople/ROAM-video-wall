import type { CSSProperties } from "react";
import { BRAND_ART } from "@/theme/brand";
import { SCREEN } from "@/theme/regions";

/**
 * The blue field every card in the main region is built over.
 *
 * Four layers, in the comps' own order: black, a Skyview glow, the backdrop still, and a
 * soft black weight in the bottom-left corner that keeps the campaign line off the
 * brightest part of the frame.
 *
 * The still is held at a few per cent and blended hard-light, which against black keeps
 * only what is brighter than mid-grey. That is why it reads as texture rather than as a
 * photograph, and why raising `still` past the comps' 0.2 turns it into someone's film.
 *
 * Figma draws the glows as blurred circles and gradient-stroked lines; they are gradients
 * here rather than exported SVG, because that is what they are, and a gradient stays sharp
 * at whatever the venue's output turns out to be.
 */

/** Figma's ring glow: transparent Skyview out to 58.6% of the radius, then deep blue. */
function ringGlow(size: number, opacity: number): CSSProperties {
  return {
    position: "absolute",
    left: (SCREEN.w - size) / 2,
    top: (SCREEN.h - size) / 2,
    width: size,
    height: size,
    opacity,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(6, 111, 239, 0) 58.6457%, #034089 100%)",
  };
}

/** The same fall-off along a line: clear in the middle, deep blue at both ends. */
const LINE_GRADIENT_STOPS = "#034089 0%, rgba(6, 111, 239, 0) 20.677%, rgba(6, 111, 239, 0) 79.323%, #034089 100%";
const LINE_LENGTH = 1916;
const LINE_WEIGHT = 8;

export interface BackdropProps {
  /**
   * `wide` is the resting field: one glow bigger than the frame, so only its clear middle
   * shows. `dial` is the leader's two rings and cross hairs, which the title card and the
   * countdown share.
   */
  glow: "wide" | "dial";
  /**
   * The still's opacity, when this card carries the still itself. The comps rest at 0.05
   * and lift to 0.2 once type is on screen. Leave it off and place `BackdropStill` by hand
   * where the still has to come and go on its own, as it does across the countdown.
   */
  still?: number;
}

export function Backdrop({ glow, still }: BackdropProps) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden bg-ink">
      {glow === "wide" ? (
        <div style={ringGlow(2307, 0.3)} />
      ) : (
        <>
          <div style={ringGlow(1523, 0.3)} />
          <div style={ringGlow(753, 0.2)} />
          <div
            style={{
              position: "absolute",
              left: (SCREEN.w - LINE_LENGTH) / 2,
              top: (SCREEN.h - LINE_WEIGHT) / 2,
              width: LINE_LENGTH,
              height: LINE_WEIGHT,
              opacity: 0.2,
              background: `linear-gradient(to right, ${LINE_GRADIENT_STOPS})`,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: (SCREEN.w - LINE_WEIGHT) / 2,
              top: (SCREEN.h - LINE_LENGTH) / 2,
              width: LINE_WEIGHT,
              height: LINE_LENGTH,
              opacity: 0.2,
              background: `linear-gradient(to bottom, ${LINE_GRADIENT_STOPS})`,
            }}
          />
        </>
      )}

      {still !== undefined && <BackdropStill opacity={still} />}

      {/* Figma's blurred black circle, as the gradient it is: the blur's two-sigma edge is
          the stop at 51%. */}
      <div
        className="absolute rounded-full"
        style={{
          left: -631,
          top: 533,
          width: 1669,
          height: 1669,
          background:
            "radial-gradient(circle, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0.5) 51%, rgba(0, 0, 0, 0) 100%)",
        }}
      />
    </div>
  );
}

/**
 * The backdrop still on its own.
 *
 * Separate from the field because the countdown needs it on its title card and gone by the
 * time the leader's sweep arrives, which is how the two comps have it: they never carry the
 * still and the sweep at once, and hard-light over the sweep's bright wedge lifts the
 * photograph into the frame instead of leaving it as grain.
 *
 * The wrapper's own opacity is what contains the colour blend inside it, so the tint lands
 * on the still and nothing else, while the wrapper itself blends with the field below.
 */
export function BackdropStill({ opacity }: { opacity: number }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute mix-blend-hard-light transition-opacity duration-700 ease-roam"
      style={{ left: -119, top: -100, width: 2183, height: 1200, opacity }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={BRAND_ART.backdrop} alt="" className="absolute h-full w-full object-cover object-bottom" />
      <div className="absolute inset-0 bg-ford-skyview mix-blend-color" />
    </div>
  );
}
