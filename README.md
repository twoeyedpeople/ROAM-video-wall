# ROAM Video Wall

The big screen at the ROAM / Ford Mach-E booth. It loops the films guests make at the tablet, one guest at a time, with an **UP NEXT: {NAME}'S JOURNEY** panel and a B-roll panel beside the loop.

It is the third app for the activation, next to the booth API (`twoeyedpeople/ROAM`, in `../ROAM`) and the tablet (`twoeyedpeople/ROAM-tablet`, in `../roam-tablet`). It holds no state of its own and adds no database: the films are the ones already in the booth's Vercel Blob store, reached through two read-only booth endpoints.

The brief is `reference.png` in this folder.

## What it plays

For each guest, in the main region:

**countdown → film → countdown → film → interstitial → next guest**

- The countdown is a title card, **"{NAME}'S ROAM"**, then 3, 2, 1. A guest who left the name blank gets "FREEDOM TO ROAM".
- The film plays twice (the brief's "x2"), then the interstitial plays once.
- Up Next names the guest who follows. With nothing queued it reads "YOUR JOURNEY".
- The B-roll panel loops on its own.

**Rotation:**
1. Films that have not played go first, oldest completion first.
2. When nothing is unplayed, the current event day's films replay, least recently played first.
3. A film an operator has hidden never plays, and is cut the moment the wall hears about it, even mid-film.

The rule is in `src/machine/playlist.ts`.

## Commands

```sh
npm install
npm run dev         # Next dev on :3200 (the booth and the tablet both default to :3000)
npm run build
npm start           # production server on :3200
npm run typecheck   # tsc --noEmit
npm test            # the rotation rule's tests, on Node's own TypeScript support (Node 22.6+)
```

There is no linter or formatter. `tsc`, the build and `npm test` are the checks.

## Environment

Copy `.env.example` to `.env.local`.

| Variable | Notes |
| --- | --- |
| `BOOTH_API_URL` | The booth deployment, `https://ford-roam.vercel.app` in production. |
| `WALL_ACCESS_TOKEN` | The booth's `WALL_ACCESS_TOKEN`, the same value on both projects. Server-side only. |
| `WALL_DISPLAY_TOKEN` | What the display presents, as `?token=` on the wall URL once. Unset is open locally and refused on Vercel. |
| `NEXT_PUBLIC_WALL_SINCE` | ISO date-time. Films completed before it never play (pre-event test runs). The window also restarts at local midnight. |
| `NEXT_PUBLIC_WALL_POLL_MS` | Feed poll interval. Default `15000`. |
| `NEXT_PUBLIC_DRY_RUN` | `1` runs on sample guests and films with no booth. Marked DRY RUN on screen. Never on the event deployment. |

The booth needs `WALL_ACCESS_TOKEN` set too. It fails closed with a 503 until it is.

## Running it at the venue

The display PC runs Chrome in kiosk mode at 1920x1080, pointed at the production URL with the display token once:

```
chrome.exe --kiosk --noerrdialogs --disable-session-crashed-bubble ^
  "https://<wall-deployment>/?token=<WALL_DISPLAY_TOKEN>"
```

- The token is kept in that browser and stripped from the address bar, so later reloads need no token.
- The page scales the 1920x1080 layout to the actual output and letterboxes on black, so a 4K output is fine.
- Films are muted. Autoplay without a tap is only guaranteed muted, and nobody taps the wall. For sound, add `--autoplay-policy=no-user-gesture-required` and remove `muted` from `MainPlayer`.
- The page hides the cursor, holds a screen wake lock, and reloads itself at the first interstitial after six hours. What it holds survives the reload.
- It must be served over HTTPS (or localhost). On plain http the Cache API is unavailable and films are held in memory only, so they are re-downloaded after every reload.

`?debug=1` outlines the three regions and shows the loop's state, the queue, what is held locally and how the feed is doing. It is for setup and review.

## Taking a film off the wall

On the booth's `/operations`, each result card has a **Hide from video wall** link (and **show it** to undo). The wall drops the film on its next poll, cutting to the interstitial if that film is on screen, and deletes its local copy. The booth refuses the film's bytes from then on.

## Placeholders

These are generated stand-ins in `public/assets/wall/`. Replace the files and keep the paths:

- `interstitial.mp4`: plays between guests, and on its own when nothing is queued.
- `b-roll.mp4`: the B-roll panel's loop.
- `dry-run/sample-*.mp4`: dry-run films only.

The black space outside the three regions is design space, and is empty because the brief leaves it empty. Region positions live in `src/theme/regions.ts`.

## Deploying

This app is its own Vercel project. Set the environment above, then deploy `main`. Do not set `NEXT_PUBLIC_DRY_RUN`.
