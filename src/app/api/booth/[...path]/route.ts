/**
 * The booth API proxy, cut down to the wall's two routes.
 *
 * The booth (`twoeyedpeople/ROAM`) sets no CORS headers anywhere, deliberately, so the
 * screen never calls it from the browser: it calls `/api/booth/<name>` here, same-origin,
 * and this route forwards it. The shape is `roam-tablet`'s proxy, and so is the reasoning:
 *
 *   - The booth's `WALL_ACCESS_TOKEN` stays on this server. The screen holds only
 *     `WALL_DISPLAY_TOKEN`, swapped here (see `lib/server/wall-auth.ts`).
 *   - The allowlist below is the whole surface the wall can reach. Without it this route
 *     would relay any booth endpoint to anyone who found the wall's URL.
 *
 * Both routes are reads. The wall never writes to the booth: hiding a film is done from
 * `/operations`, on the operator's token.
 */

import { NextResponse, type NextRequest } from "next/server";
import { boothWallToken, checkDisplayToken } from "@/lib/server/wall-auth";

/** Endpoint -> the methods it may be called with. A Map, so `constructor` is not a route. */
const ENDPOINTS = new Map<string, readonly string[]>([
  ["wall-feed", ["GET"]],
  ["wall-film", ["GET", "HEAD"]],
]);

/** Response headers worth carrying back. The range headers are what the film cache reads. */
const PASS_THROUGH_HEADERS = ["content-type", "content-length", "content-range", "accept-ranges"];

function boothOrigin(): string {
  const value = (process.env.BOOTH_API_URL || "").trim().replace(/\/+$/, "");
  if (!value) return "";
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function deny(status: number, error: string) {
  return NextResponse.json({ error }, { status, headers: { "cache-control": "no-store" } });
}

async function forward(req: NextRequest, segments: string[]) {
  const endpoint = segments.join("/");
  const methods = ENDPOINTS.get(endpoint);
  if (!methods) return deny(404, "Unknown booth endpoint.");
  if (!methods.includes(req.method)) return deny(405, "Method not allowed.");

  const origin = boothOrigin();
  if (!origin) return deny(500, "BOOTH_API_URL is not set on this deployment.");

  const access = checkDisplayToken(req);
  if (access === "unconfigured") return deny(503, "WALL_DISPLAY_TOKEN is not set on this deployment.");
  if (access === "unauthorised") return deny(401, "This display is not authenticated.");

  const headers = new Headers();
  const token = boothWallToken();
  if (token) headers.set("x-wall-token", token);
  const range = req.headers.get("range");
  if (range) headers.set("range", range);

  let upstream: Response;
  try {
    upstream = await fetch(`${origin}/api/${endpoint}${req.nextUrl.search}`, {
      method: req.method,
      headers,
      cache: "no-store",
      redirect: "manual",
    });
  } catch (err) {
    console.error("[ROAM][wall-proxy] booth-unreachable", { endpoint, message: (err as Error)?.message });
    return deny(502, "Could not reach the booth service.");
  }

  const responseHeaders = new Headers();
  for (const name of PASS_THROUGH_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  // The feed changes under the poll and the films are private. Neither may be cached by the
  // CDN this runs behind; the wall keeps its own copy of each film.
  responseHeaders.set("cache-control", "no-store");

  return new NextResponse(req.method === "HEAD" ? null : upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, { params }: RouteContext) {
  return forward(req, (await params).path);
}

export async function HEAD(req: NextRequest, { params }: RouteContext) {
  return forward(req, (await params).path);
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
