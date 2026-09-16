# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

The ROAM video wall: a Next.js 15 + React 19 + Tailwind 3 + TypeScript app that loops guests' finished films on a 1920x1080 screen at the booth, with an Up Next panel and a B-roll panel. The brief is `reference.png`. Read `README.md` first for commands, env and the venue setup; this file covers what is not obvious from the code.

It is the third app for the activation. The booth API (`../ROAM`, `twoeyedpeople/ROAM`) owns the films; the tablet (`../roam-tablet`) makes them. This app writes nothing anywhere. **Read `../ROAM/CLAUDE.md` ("The video wall") before changing anything on the wire.**

## The wire

- **The screen never calls the booth.** It calls `/api/booth/<name>` here, and `src/app/api/booth/[...path]/route.ts` forwards it. The booth sets no CORS headers, deliberately.
- **The allowlist is exactly `wall-feed` (GET) and `wall-film` (GET, HEAD).** Adding a booth endpoint the wall needs is a two-repo change: the booth handler, and this allowlist, or it 404s here first.
- **Tokens chain.** The browser sends `WALL_DISPLAY_TOKEN` as `x-display-token`, and the proxy swaps in the booth's `WALL_ACCESS_TOKEN` as `x-wall-token` (`src/lib/server/wall-auth.ts`). The booth token never reaches the screen.
- An unset display token is open locally and **refused on Vercel**. That is stricter than the tablet's proxy on purpose: this one relays every guest's film and first name from a public URL. Nothing under `src/lib/server/` may be imported by client code.
- **The booth sends id, first name, completion time and `version` (the output's file name).** Nothing else about a guest ever arrives here, and nothing here should ask for more.

## How it fits together

`src/components/VideoWall.tsx` wires four pieces, and data flows one way:

1. **`hooks/useWallData.ts`** polls the feed, keeps the cursor, and remembers films, hidden ids and play counts in `localStorage`. That store is this one screen's memory of what it has shown, so a reload resumes the rotation.
2. **`machine/playlist.ts`** is the rotation rule. It is pure, with no imports, which is what lets `npm test` run it on Node's type stripping. Its `candidates` order is also the download order.
3. **`hooks/useFilmCache.ts` + `lib/film-cache.ts`** hold each wanted film locally (Cache API), fetched once in ranges of at most 4 MB.
4. **`machine/useWallLoop.ts`** plays what is held, in `playOrder`, and drives `MainPlayer`.

Up Next and the loop read the same function (`playOrder` / `upNextAfter`), so the panel can never promise a guest the loop will not play.

## Things that bite

- **Films are fetched by script and played from object URLs, never from a `src` pointing at the proxy.** The booth's blobs are private and a `<video>` cannot send a token. The chunking keeps every response through both serverless hops (here, then the booth) well inside Vercel's function response limit. Do not "simplify" this into `<video src="/api/booth/wall-film?...">`: it loses the token, loses the offline copy, and pays for the film again on every one of hundreds of replays.
- **The cache keys on id AND version.** A re-render lands under the same id with a new output file, and must replace the old copy rather than be mistaken for it.
- **The cache worker is one long-lived loop, not an effect per change.** It reads the wanted list from a ref and is woken early when that list changes. Restarting it on each change would abort a half-downloaded film every time a poll brought news.
- **Nothing evicts until the feed has answered once** (`canEvict`). Before that, the wanted list is only what `localStorage` remembered, and evicting against it could delete films the first poll is about to ask for.
- **The screen must never go black, and every step has an exit.** A film that stalls for `FILM_STALL_MS`, fails to decode, or is missing from the cache is skipped. It is marked played (sent to the back, so it cannot hold the wall) and its copy discarded (so its next turn is a fresh download). An interstitial that errors holds briefly then moves on, and one that never ends is timed out.
- **Hiding cuts mid-film.** When the hidden list names the film on screen, the loop goes straight to the interstitial without marking it played. Taking it off the screen is the point.
- **Both main-region videos stay mounted and are toggled with `visibility`**, as on the tablet. Remounting would throw away the film decoded during the countdown, which is the film's load window.
- **The countdown's digits are pure CSS** (`count-in` with staggered `animationDelay`). The loop owns the one timer that matters, the move to the film at `COUNTDOWN_TOTAL_MS`. `COUNTDOWN_STEP_MS` and the keyframe's duration in `tailwind.config.ts` must agree.
- **The window is the later of `NEXT_PUBLIC_WALL_SINCE` and local midnight.** Films before it are pruned from state, the cache and the rotation. The display PC's clock and time zone therefore matter; set them.
- **`localStorage` is keyed separately in a dry run**, so reviewing on the event machine cannot leave sample guests in the real rotation.
- **Muted, always.** Autoplay without a gesture is only guaranteed muted. Sound is a kiosk flag plus a code change; see the README.
- **`?debug=1` is documented here, not on screen.** It outlines the regions and shows the loop's state, the queue, the cache and the feed.
- **Ticketing is not shipped.** Its commercial licence is unconfirmed (see `roam-tablet/src/theme/fonts.ts`) and nothing here uses it.

## Dry run

`NEXT_PUBLIC_DRY_RUN=1` answers the feed with sample guests (a fourth arrives 45 s in, to watch a new film overtake the replays) and fetches films from `public/assets/wall/dry-run/`. It branches in `lib/feed.ts` and `lib/film-cache.ts` only. It is an env var rather than a URL flag, and it is marked DRY RUN on screen, both for the tablet's reasons.

## Not built yet

The booth's `/download` page has a designed "PLAYING SOON ON THE BIG SCREEN, N PEOPLE IN QUEUE" tray with nothing feeding it. The intended source is this app: post `playOrder`'s output to a booth endpoint, and give the phone a secret-authenticated read of its position. That is a change across all three repos, deliberately left for a later phase. Keep `playlist.ts` pure so it stays postable.

## Conventions

- Strict TypeScript. `npm run typecheck`, `npm run build` and `npm test` before calling anything done.
- Tailwind for styling. Colours are literal values, not `var()`, for the tablet's reason.
- Components name a type role (`font-headline`, `font-ui`, `font-body`), never a typeface.
- All copy is in `src/content/copy.ts`, and all layout geometry in `src/theme/regions.ts`.
- Log lines are `[ROAM][wall]`- or `[ROAM][wall-proxy]`-prefixed.
