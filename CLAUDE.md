# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

The ROAM video wall: a Next.js 15 + React 19 + Tailwind 3 + TypeScript app that loops guests' finished films on a 1920x1080 screen at the booth, with an Up Next panel and a B-roll panel. `reference.png` is the original brief and still describes the three regions; what they look like comes from the client's Figma, which `README.md` maps node by node. Read `README.md` first for commands, env and the venue setup; this file covers what is not obvious from the code.

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

## How the main region is drawn

Everything the main region shows is comped on a **1920x1080 frame**, while `REGIONS.main` is 1024x640. `components/screen/ScreenFrame.tsx` puts a 16:9 box in the middle of the region and scales that frame into it once, so **a number off a comp is typed in as it is written** and nothing inside has to know the region's size. The bands above and below it are black design space.

Four things live in that frame, and `MainPlayer` picks between them by step:

- `screen/InterstitialFilm.tsx` plays the delivered campaign spot (`public/assets/wall/interstitial.mp4`), full-frame and silent, and reports its own end. `screen/InterstitialCard.tsx`, which builds STAR IN YOUR OWN FILM over the resting field out of type and CSS, is what the step falls back to for the life of the page if that file will not play, will not decode or stops making progress.
- `CountdownCard.tsx` draws one dial and cross-fades `screen/TitleCard.tsx` into `screen/CountdownDial.tsx` over it at `COUNTDOWN_TITLE_MS`.
- The guest's film plays bare. The render bakes in the lockups, the ROAM logo and the guest's name, so the wall draws nothing over it; `screen/FilmChrome.tsx` did, doubled every mark, and was deleted.

`screen/Backdrop.tsx` is the field they share: black, a Skyview glow (or the leader's rings and cross hairs), the backdrop still, and a soft black weight bottom-left. Figma's blurred circles and gradient-stroked lines are CSS gradients here rather than exported SVG, because that is what they are.

## Things that bite

- **Films are fetched by script and played from object URLs, never from a `src` pointing at the proxy.** The booth's blobs are private and a `<video>` cannot send a token. The chunking keeps every response through both serverless hops (here, then the booth) well inside Vercel's function response limit. Do not "simplify" this into `<video src="/api/booth/wall-film?...">`: it loses the token, loses the offline copy, and pays for the film again on every one of hundreds of replays.
- **The cache keys on id AND version.** A re-render lands under the same id with a new output file, and must replace the old copy rather than be mistaken for it.
- **The cache worker is one long-lived loop, not an effect per change.** It reads the wanted list from a ref and is woken early when that list changes. Restarting it on each change would abort a half-downloaded film every time a poll brought news.
- **Nothing evicts until the feed has answered once** (`canEvict`). Before that, the wanted list is only what `localStorage` remembered, and evicting against it could delete films the first poll is about to ask for.
- **The screen must never go black, and every step has an exit.** A film that stalls for `FILM_STALL_MS`, fails to decode, or is missing from the cache is skipped. It is marked played (sent to the back, so it cannot hold the wall) and its copy discarded (so its next turn is a fresh download). The campaign spot has the same three exits, and hands the step to the drawn card rather than to the next guest, because a card is the one thing here with no file to lose. `INTERSTITIAL_MAX_MS` still covers an interstitial that somehow never ends either way.
- **Hiding cuts mid-film.** When the hidden list names the film on screen, the loop goes straight to the interstitial without marking it played. Taking it off the screen is the point.
- **Both video elements stay mounted and are toggled with `visibility`**, as on the tablet. Remounting the guest's film would throw away what was decoded during the countdown, which is its load window; remounting the campaign spot would reload a file that plays again every couple of minutes all day. The countdown is drawn.
- **The countdown's digits are pure CSS** (`count-in` with staggered `animationDelay`), and so is the title-to-count cross-fade. The loop owns the one timer that matters, the move to the film at `COUNTDOWN_TOTAL_MS`. `COUNTDOWN_STEP_MS` and both the `count-in` and `sweep` durations in `tailwind.config.ts` must agree: the leader's sweep is one turn per digit.
- **Type is placed by its capitals.** The comps measure every line as a cap height, so `.cap-trim` (`globals.css`, CSS `text-box`) makes the element box the cap box and `capSize()` turns a comp's cap height into a font size. `CAP_RATIO` in `theme/type.ts` is measured from the licensed woff2 as the browser draws it, not from Figma's text nodes, which report a taller cap for Franklin. **A wrong ratio there moves every line on the wall at once**; re-measure by reading a `.cap-trim` element's height back off the page.
- **The face sets a few per cent wider than the comps' outlines.** Where a line is pinned to both margins, as OWN FILM is, fit it to the comp's box and let the cap give, or the two words meet in the middle.
- **A mark component must not put `relative` on the box its caller positions.** Tailwind emits `relative` after `absolute`, so it wins, and the marks stack down the frame in normal flow instead of sitting in their corners. That is why `RegistrationMark`, `MacheWordmark` and `Turned` all keep the positioned box inside.
- **The backdrop still and the leader's sweep never share a frame.** The comps keep them apart, and hard-light over the sweep's bright wedge lifts the still from grain into a photograph. That is why the countdown's still rides the title layer (`BackdropStill`) and leaves with it, rather than sitting in the shared `Backdrop`.
- **The Up Next panel's "MINS AWAY" is arithmetic, not data.** Nothing on the feed carries a length. `machine/eta.ts` builds the figure from the loop's own beats and the film's duration once the file reports it, and `useWallLoop` only stores a new one when it moves by half a minute, so a panel that shows whole minutes cannot re-render the wall every second.
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
- All copy is in `src/content/copy.ts`, all layout geometry in `src/theme/regions.ts`, and every brand asset path and its proportions in `src/theme/brand.ts`. The comps' own numbers live as named constants at the top of the card that uses them.
- Log lines are `[ROAM][wall]`- or `[ROAM][wall-proxy]`-prefixed.
