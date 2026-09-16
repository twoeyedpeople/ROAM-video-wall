/**
 * One finished film as the booth's `/api/wall-feed` describes it (`ROAM/lib/wall.js`).
 * The booth sends nothing else about a guest: no surname, no secret, no blob path.
 */
export interface WallFilm {
  id: string;
  firstName: string;
  completedAt: string | null;
  /** The output's file name on the booth. A re-render lands a new one. */
  version: string;
}

export interface WallFeed {
  films: WallFilm[];
  /** Every film an operator has pulled off the wall, whole on every poll. */
  hidden: string[];
  /** Opaque: sent straight back as `since` on the next poll. */
  cursor: number;
  serverTime: number;
}
