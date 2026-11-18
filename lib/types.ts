export type SwipeDirection = "like" | "pass";

/** A profile exactly as stored in the seed file. `likedYou` is server-only. */
export interface SeedProfile {
  id: string;
  name: string;
  age: number;
  photo: string;
  bio: string;
  city: string;
  college?: string;
  interests: string[];
  /** Seed-only: this profile already liked the logged-in user. Never sent to the client. */
  likedYou: boolean;
}

/** The public shape of a profile. No `likedYou` field, ever. */
export interface Profile {
  id: string;
  name: string;
  age: number;
  photo: string;
  bio: string;
  city: string;
  college?: string;
  interests: string[];
}

export interface Match {
  id: string;
  profile: Profile;
  /** ISO timestamp of when the like became mutual. */
  matchedAt: string;
}

export interface FeedResponse {
  profiles: Profile[];
  remaining: number;
  total: number;
}

export interface SwipeSuccess {
  ok: true;
  direction: SwipeDirection;
  matched: boolean;
  match?: Match;
  /** Present when the profile had already been swiped (idempotent repeat). */
  alreadySwiped?: boolean;
}

export interface MatchesResponse {
  matches: Match[];
}