import { readFile } from "node:fs/promises";
import path from "node:path";

import type {
  FeedResponse,
  Match,
  Profile,
  SeedProfile,
  SwipeDirection,
  SwipeSuccess,
} from "@/lib/types";

const PROFILES_PATH = path.join(process.cwd(), "data", "profiles.json");

/**
 * Runtime state lives in an HTTP-only cookie instead of a file. Serverless
 * hosts such as Vercel expose a read-only filesystem, so a file write would
 * fail on every swipe. A cookie keeps the demo working there without adding a
 * database, while still persisting across reloads and server instances.
 */
export const STATE_COOKIE = "coy_state";
const STATE_VERSION = 1;
const STATE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

interface SwipeRecord {
  direction: SwipeDirection;
  at: string;
}

export interface StoreState {
  swipes: Record<string, SwipeRecord>;
}

interface SerializedState {
  v: typeof STATE_VERSION;
  swipes: Record<string, [SwipeDirection, string]>;
}

function emptyState(): StoreState {
  return { swipes: Object.create(null) as Record<string, SwipeRecord> };
}

/** Error carrying an HTTP status, translated by the route handlers. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

// ---------------------------------------------------------------------------
// Cookie state
// ---------------------------------------------------------------------------

function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;

  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() === name) {
      return part.slice(separator + 1).trim();
    }
  }

  return null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isProfileId(value: string): boolean {
  return /^[A-Za-z0-9_-]{1,64}$/.test(value);
}

function isTimestamp(value: string): boolean {
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString() === value;
}

/**
 * Reads the swipes encoded in the request cookie. A missing, malformed, or
 * tampered cookie simply starts from an empty state; it can never make an API
 * request fail.
 */
export function readState(request: Request): StoreState {
  const value = readCookie(request.headers.get("cookie"), STATE_COOKIE);
  if (!value) return emptyState();

  try {
    const decoded = Buffer.from(value, "base64url").toString("utf8");
    const parsed: unknown = JSON.parse(decoded);

    if (
      !isObject(parsed) ||
      parsed.v !== STATE_VERSION ||
      !isObject(parsed.swipes)
    ) {
      return emptyState();
    }

    const swipes = Object.create(null) as Record<string, SwipeRecord>;
    for (const [profileId, entry] of Object.entries(parsed.swipes)) {
      if (!isProfileId(profileId) || !Array.isArray(entry) || entry.length !== 2) {
        continue;
      }

      const [direction, at] = entry;
      if (direction !== "like" && direction !== "pass") continue;
      if (typeof at !== "string" || !isTimestamp(at)) continue;

      swipes[profileId] = { direction, at };
    }

    return { swipes };
  } catch {
    return emptyState();
  }
}

function encodeState(state: StoreState): string {
  const swipes: SerializedState["swipes"] = Object.create(null) as Record<
    string,
    [SwipeDirection, string]
  >;

  for (const [profileId, record] of Object.entries(state.swipes)) {
    swipes[profileId] = [record.direction, record.at];
  }

  const serialized: SerializedState = { v: STATE_VERSION, swipes };
  return Buffer.from(JSON.stringify(serialized), "utf8").toString("base64url");
}

/**
 * Adds the updated swipe state to an outgoing response. `Secure` is only set
 * over HTTPS so the cookie also works on http://localhost during development.
 */
export function withStateCookie(
  response: Response,
  state: StoreState,
  request: Request,
): Response {
  const forwardedProto = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  const secure =
    forwardedProto === "https" || request.url.startsWith("https://");

  response.headers.append(
    "Set-Cookie",
    `${STATE_COOKIE}=${encodeState(state)}; Path=/; Max-Age=${STATE_COOKIE_MAX_AGE}; HttpOnly; SameSite=Lax${
      secure ? "; Secure" : ""
    }`,
  );

  return response;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

async function loadProfiles(): Promise<SeedProfile[]> {
  const raw = await readFile(PROFILES_PATH, "utf8");
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("data/profiles.json must contain an array of profiles");
  }
  return parsed as SeedProfile[];
}

// ---------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------

/** Explicitly rebuild the public profile so `likedYou` can never leak. */
function toPublicProfile(profile: SeedProfile): Profile {
  return {
    id: profile.id,
    name: profile.name,
    age: profile.age,
    photo: profile.photo,
    bio: profile.bio,
    city: profile.city,
    college: profile.college,
    interests: profile.interests,
  };
}

function isMutual(profile: SeedProfile, swipe: SwipeRecord): boolean {
  return swipe.direction === "like" && profile.likedYou;
}

function toMatch(profile: SeedProfile, swipe: SwipeRecord): Match {
  return {
    id: `match_${profile.id}_${new Date(swipe.at).getTime().toString(36)}`,
    profile: toPublicProfile(profile),
    matchedAt: swipe.at,
  };
}

// ---------------------------------------------------------------------------
// Public API (called by route handlers)
// ---------------------------------------------------------------------------

export async function getFeed(state: StoreState): Promise<FeedResponse> {
  const profiles = await loadProfiles();
  const remaining = profiles.filter((profile) => !state.swipes[profile.id]);

  return {
    profiles: remaining.map(toPublicProfile),
    remaining: remaining.length,
    total: profiles.length,
  };
}

export async function recordSwipe(
  state: StoreState,
  profileId: string,
  direction: SwipeDirection,
): Promise<{ state: StoreState; result: SwipeSuccess }> {
  const profiles = await loadProfiles();
  const profile = profiles.find((candidate) => candidate.id === profileId);
  if (!profile) {
    throw new HttpError(404, "Profile not found");
  }

  const existing = state.swipes[profileId];
  if (existing) {
    const matched = isMutual(profile, existing);
    return {
      state,
      result: {
        ok: true,
        direction: existing.direction,
        matched,
        ...(matched ? { match: toMatch(profile, existing) } : {}),
        alreadySwiped: true,
      },
    };
  }

  const swipe: SwipeRecord = { direction, at: new Date().toISOString() };
  const nextState: StoreState = {
    swipes: { ...state.swipes, [profileId]: swipe },
  };
  const matched = isMutual(profile, swipe);

  return {
    state: nextState,
    result: {
      ok: true,
      direction,
      matched,
      ...(matched ? { match: toMatch(profile, swipe) } : {}),
    },
  };
}

export async function getMatches(state: StoreState): Promise<Match[]> {
  const profiles = await loadProfiles();

  return profiles
    .flatMap((profile) => {
      const swipe = state.swipes[profile.id];
      return swipe && isMutual(profile, swipe)
        ? [toMatch(profile, swipe)]
        : [];
    })
    .sort((a, b) => b.matchedAt.localeCompare(a.matchedAt));
}
