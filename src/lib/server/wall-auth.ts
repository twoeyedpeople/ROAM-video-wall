/**
 * The two tokens on the wall's side of the wire. Server-only: nothing under `lib/server/`
 * may be imported by a client component, because these are the values the screen never
 * holds.
 *
 * They chain rather than being shared, as the tablet's do. The display browser presents
 * `WALL_DISPLAY_TOKEN` (as `x-display-token`); the proxy checks it and sends the booth
 * `WALL_ACCESS_TOKEN` (as `x-wall-token`). A leaked display token opens this proxy's two
 * read-only routes and nothing on the booth directly.
 */

import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

/** The booth's `WALL_ACCESS_TOKEN`. The booth fails closed without it. */
export function boothWallToken(): string {
  return (process.env.WALL_ACCESS_TOKEN || "").trim();
}

export type DisplayAccess = "ok" | "unauthorised" | "unconfigured";

/**
 * Unset is open on a laptop and refused on Vercel. The tablet's proxy is open whenever its
 * token is unset; the wall's is stricter because what it relays is every guest's film and
 * first name, from a public URL.
 */
export function checkDisplayToken(req: NextRequest): DisplayAccess {
  const expected = (process.env.WALL_DISPLAY_TOKEN || "").trim();
  if (!expected) return process.env.VERCEL ? "unconfigured" : "ok";

  const supplied = Buffer.from((req.headers.get("x-display-token") || "").trim());
  const wanted = Buffer.from(expected);
  return supplied.length === wanted.length && timingSafeEqual(supplied, wanted) ? "ok" : "unauthorised";
}
