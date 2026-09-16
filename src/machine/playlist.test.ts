// The rotation rule. Run with `npm test` (Node's own type stripping; no build step).
//
// A wrong order here is invisible from the floor until a guest waits twenty minutes for a
// film that keeps being overtaken, so the cases are the ways that could happen.

import assert from "node:assert/strict";
import test from "node:test";
import { candidates, playOrder, recordPlay, upNextAfter, type PlaylistOptions } from "./playlist.ts";

const DAY = Date.parse("2026-09-16T00:00:00.000Z");

const film = (id: string, minutes: number) => ({
  id,
  completedAt: new Date(DAY + minutes * 60_000).toISOString(),
});

function options(overrides: Partial<PlaylistOptions> = {}): PlaylistOptions {
  return { hidden: new Set(), plays: {}, windowStartMs: DAY, replayLimit: 150, ...overrides };
}

const ids = (list: readonly { id: string }[]) => list.map((item) => item.id);
const allReady = (list: readonly { id: string }[]) => new Set(ids(list));

test("unplayed films go first, oldest completion first, ahead of every replay", () => {
  const films = [film("late", 30), film("early", 10), film("replayed", 5)];
  const plays = recordPlay({}, "replayed", DAY + 60 * 60_000);
  assert.deepEqual(ids(candidates(films, options({ plays }))), ["early", "late", "replayed"]);
});

test("replays cycle least recently played first", () => {
  const films = [film("a", 1), film("b", 2), film("c", 3)];
  let plays = recordPlay({}, "a", DAY + 100);
  plays = recordPlay(plays, "c", DAY + 200);
  plays = recordPlay(plays, "b", DAY + 300);
  assert.deepEqual(ids(candidates(films, options({ plays }))), ["a", "c", "b"]);
});

test("a guest who has just finished overtakes the replays, not the guests before them", () => {
  const films = [film("waiting", 10), film("replay", 1), film("just-finished", 20)];
  const plays = recordPlay({}, "replay", DAY + 1_000);
  assert.deepEqual(ids(candidates(films, options({ plays }))), ["waiting", "just-finished", "replay"]);
});

test("hidden films and films from before the window never play", () => {
  const films = [film("hidden", 10), film("yesterday", -30), film("today", 20)];
  const result = candidates(films, options({ hidden: new Set(["hidden"]) }));
  assert.deepEqual(ids(result), ["today"]);
});

test("a film not held yet is still wanted, but is never next", () => {
  // The cache downloads from `candidates`; Up Next reads `playOrder`. A film Up Next names
  // must be able to start when its turn comes.
  const films = [film("downloading", 10), film("held", 20)];
  assert.deepEqual(ids(candidates(films, options())), ["downloading", "held"]);
  assert.deepEqual(ids(playOrder(films, { ...options(), ready: new Set(["held"]) })), ["held"]);
});

test("the replay rotation keeps the newest films when it is capped", () => {
  const films = [film("oldest", 1), film("middle", 2), film("newest", 3)];
  let plays = recordPlay({}, "oldest", DAY + 1);
  plays = recordPlay(plays, "middle", DAY + 2);
  plays = recordPlay(plays, "newest", DAY + 3);
  assert.deepEqual(ids(candidates(films, options({ plays, replayLimit: 2 }))), ["middle", "newest"]);
});

test("Up Next names the film that follows, or the same film when it is the only one", () => {
  const one = [film("solo", 1)];
  assert.equal(upNextAfter(one, { ...options(), ready: allReady(one) }, "solo", DAY + 5)?.id, "solo");

  const two = [film("first", 1), film("second", 2)];
  const opts = { ...options(), ready: allReady(two) };
  assert.equal(upNextAfter(two, opts, "first", DAY + 5)?.id, "second");
  assert.equal(upNextAfter([], { ...options(), ready: new Set<string>() }, "gone", DAY), null);
});
