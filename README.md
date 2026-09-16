# ROAM Video Wall

The big screen at the ROAM / Ford Mach-E booth. It loops the films guests make at the tablet, one guest at a time, with an **UP NEXT: {NAME}'S JOURNEY** panel and a B-roll panel beside the loop.

It is the third app for the activation, next to the booth API (`twoeyedpeople/ROAM`, in `../ROAM`) and the tablet (`twoeyedpeople/ROAM-tablet`, in `../roam-tablet`). It holds no state of its own and adds no database: the films are the ones already in the booth's Vercel Blob store, reached through two read-only booth endpoints.

`reference.png` in this folder is the original brief, and still describes the three regions. What each region **looks like** comes from the client's Figma, `Ford - Mach-E Activation Tour (INT)`, file `GJizdiZe2kPeh7BDsMX51u`:

| Node | Comp | Where it is built |
| --- | --- | --- |
| `33361:26291` | Screen layout: the 1920x1080 raster and its three regions | `src/theme/regions.ts` |
| `33361:21245`, `33361:21217`, `33361:21189`, `33361:21161`, `33361:21132` | The campaign card building STAR IN YOUR OWN FILM | `src/components/screen/InterstitialCard.tsx` |
| `33361:21100` | The title card, UP NEXT / {NAME}'S / ROAM | `src/components/screen/TitleCard.tsx` |
| `33361:21066` | The leader counting down | `src/components/screen/CountdownDial.tsx` |
| `33361:21050` | The guest's film, framed | `src/components/screen/FilmChrome.tsx` |
| `33375:26579` | The Up Next panel | `src/components/UpNextPanel.tsx` |
| `33375:30280` | The B-roll panel: the clip, no overlay | `src/components/BRollPanel.tsx` |

Everything in the main region is comped on a 1920x1080 frame. The region itself is 1024x640, so the frame is a 16:9 box centred in it and scaled once (`ScreenFrame`); measurements off the comps are typed in as they are written.

## What it plays

For each guest, in the main region:

**countdown → film → countdown → film → campaign spot → next guest**

- The countdown is a title card, **"UP NEXT / {NAME}'S"** over the ROAM logo, then the leader counts 3, 2, 1 with the sweep going round. A guest who left the name blank gets "FREEDOM TO" over the same logo.
- The film plays twice (the brief's "x2"), framed with the mach-e lockup, the ROAM logo and the guest's name down its edges.
- The delivered campaign spot then plays, which takes 15 s. It is also the resting state when there is nothing to play. If that file ever fails, the drawn card that preceded it builds **STAR IN YOUR OWN FILM** and clears in 7.4 s instead.
- Up Next names the guest who follows and says roughly how long they have. With nothing queued it reads "YOURS".
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
- Films are muted. Autoplay without a tap is only guaranteed muted, and nobody taps the wall. For sound, add `--autoplay-policy=no-user-gesture-required` and remove `muted` from `MainPlayer`. The campaign spot carries no audio track at all, so it stays silent either way.
- The page hides the cursor, holds a screen wake lock, and reloads itself at the first campaign spot after six hours. What it holds survives the reload.
- The type is placed by its capitals, using CSS `text-box` trimming (Chrome 133+). An older browser sets every line a few pixels low; it does not affect the venue's machine.
- It must be served over HTTPS (or localhost). On plain http the Cache API is unavailable and films are held in memory only, so they are re-downloaded after every reload.

`?debug=1` outlines the three regions and shows the loop's state, the queue, what is held locally and how the feed is doing. It is for setup and review.

## Taking a film off the wall

On the booth's `/operations`, each result card has a **Hide from video wall** link (and **show it** to undo). The wall drops the film on its next poll, cutting to the campaign spot if that film is on screen, and deletes its local copy. The booth refuses the film's bytes from then on.

## Art

In `public/assets/wall/brand/`, exported from the Figma above:

- `mache-wordmark.png`, `roam-logo.svg`, `ford-script.svg`: the marks. Their proportions are in `src/theme/brand.ts`, beside each path.
- `backdrop.png`: the film still every card is built over, tinted Skyview and held at a few per cent. It is texture, not a picture; the comps use one frame throughout.

Also in `public/assets/wall/`. Replace the file and keep the path. Both delivered films are kept out of git as they arrived, in `assets-master/`, and what ships is the web-optimised copy re-encoded from them:

- `interstitial.mp4`: the delivered campaign spot, played between guests. 1920x1080, 23.976 fps, 15.015 s, H.264 High, 6.1 MB, faststart, **no audio track** (the master's was digital silence and the wall is muted anyway). Re-encoded from the master with:

  ```sh
  ffmpeg -i master.mp4 -c:v libx264 -profile:v high -level 4.0 -preset slow -crf 21 \
    -pix_fmt yuv420p -g 48 -keyint_min 24 \
    -color_primaries bt709 -color_trc bt709 -colorspace bt709 \
    -an -movflags +faststart public/assets/wall/interstitial.mp4
  ```

  If the length changes, update `INTERSTITIAL_FILM_MS` in `src/machine/timings.ts`, which is what the Up Next panel's estimate counts the step as.
- `b-roll.mp4`: the delivered user-shots reel, looping in the bottom-left panel. 512x512, 24 fps, 3 m 35 s, 9.9 MB, faststart, no audio track (silent master again). The panel is a 256x256 square and `object-cover` would centre-crop a 16:9 file to exactly this, so the crop is baked in and the file is a quarter of the pixels; 512 rather than 256 is for a 4K output:

  ```sh
  ffmpeg -i master.mp4 -vf "crop=ih:ih,scale=512:512:flags=lanczos" \
    -c:v libx264 -profile:v high -level 4.0 -preset slow -crf 25 \
    -pix_fmt yuv420p -g 48 -keyint_min 24 \
    -color_primaries bt709 -color_trc bt709 -colorspace bt709 \
    -an -movflags +faststart public/assets/wall/b-roll.mp4
  ```

- `dry-run/sample-*.mp4`: dry-run films only.

`src/components/screen/InterstitialCard.tsx`, the same card drawn from the comps, is the fall back if that spot will not play, and is all the interstitial step was before the spot was delivered.

The black space outside the three regions, and the bands above and below the 16:9 screen inside the main region, are design space, and are empty because the brief leaves them empty. Region positions live in `src/theme/regions.ts`.

## Deploying

This app is its own Vercel project. Set the environment above, then deploy `main`. Do not set `NEXT_PUBLIC_DRY_RUN`.
