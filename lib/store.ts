import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  FeedResponse,
  Match,
  Profile,
  SeedProfile,
  SwipeDirection,
  SwipeSuccess,
} from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const PROFILES_PATH = path.join(DATA_DIR, "profiles.json");
const STORE_PATH = path.join(DATA_DIR, "store.json");
const TEMP_STORE_PATH = `${STORE_PATH}.tmp`;

interface SwipeRecord {
  direction: SwipeDirection;
  at: string;
}

interface MatchRecord {
  id: string;
  profileId: string;
  matchedAt: string;
}

interface StoreState {
  version: number;
  swipes: Record<string, SwipeRecord>;
  matches: MatchRecord[];
}

function emptyState(): StoreState {
  return { version: 1, swipes: {}, matches: [] };
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

async function readStore(): Promise<StoreState> {
  let raw: string;
  try {
    raw = await readFile(STORE_PATH, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      // First run: nothing has been swiped yet.
      return emptyState();
    }
    throw error;
  }

  let parsed: Partial<StoreState>;
  try {
    parsed = JSON.parse(raw) as Partial<StoreState>;
  } catch {
    throw new Error(
      "data/store.json is not valid JSON. Delete it to reset the demo state.",
    );
  }

  return {
    version: 1,
    swipes:
      parsed.swipes && typeof parsed.swipes === "object" ? parsed.swipes : {},
    matches: Array.isArray(parsed.matches) ? parsed.matches : [],
  };
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

async function writeStore(state: StoreState): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  // Write to a temp file first, then atomically swap it in so a crash or a
  // concurrent reader never observes a half-written store.
  await writeFile(TEMP_STORE_PATH, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  await rename(TEMP_STORE_PATH, STORE_PATH);
}

let writeQueue: Promise<void> = Promise.resolve();

/**
 * Serialised read-modify-write. Every mutation waits for the previous one, so
 * concurrent requests cannot clobber each other's swipes.
 */
function mutate<T>(updater: (state: StoreState) => T): Promise<T> {
  const run = writeQueue.then(async () => {
    const state = await readStore();
    const result = updater(state);
    await writeStore(state);
    return result;
  });

  // Keep the chain alive even if this run rejects.
  writeQueue = run.then(
    () => undefined,
    () => undefined,
  );

  return run;
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

function toMatch(record: MatchRecord, profile: SeedProfile): Match {
  return {
    id: record.id,
    profile: toPublicProfile(profile),
    matchedAt: record.matchedAt,
  };
}

// ---------------------------------------------------------------------------
// Public API (called by route handlers)
// ---------------------------------------------------------------------------

export async function getFeed(): Promise<FeedResponse> {
  const [profiles, state] = await Promise.all([loadProfiles(), readStore()]);
  const remaining = profiles.filter((profile) => !state.swipes[profile.id]);

  return {
    profiles: remaining.map(toPublicProfile),
    remaining: remaining.length,
    total: profiles.length,
  };
}

export async function recordSwipe(
  profileId: string,
  direction: SwipeDirection,
): Promise<SwipeSuccess> {
  const profiles = await loadProfiles();
  const profile = profiles.find((candidate) => candidate.id === profileId);
  if (!profile) {
    throw new HttpError(404, "Profile not found");
  }

  return mutate((state) => {
    const existing = state.swipes[profileId];
    if (existing) {
      const matchRecord = state.matches.find(
        (record) => record.profileId === profileId,
      );
      const match = matchRecord ? toMatch(matchRecord, profile) : undefined;
      return {
        ok: true as const,
        direction: existing.direction,
        matched: Boolean(match),
        ...(match ? { match } : {}),
        alreadySwiped: true,
      };
    }

    const now = new Date().toISOString();
    state.swipes[profileId] = { direction, at: now };

    if (direction === "like" && profile.likedYou) {
      const matchRecord: MatchRecord = {
        id: `match_${profileId}_${Date.now().toString(36)}`,
        profileId,
        matchedAt: now,
      };
      state.matches.push(matchRecord);
      return {
        ok: true as const,
        direction,
        matched: true,
        match: toMatch(matchRecord, profile),
      };
    }

    return { ok: true as const, direction, matched: false };
  });
}

export async function getMatches(): Promise<Match[]> {
  const [profiles, state] = await Promise.all([loadProfiles(), readStore()]);
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));

  return state.matches
    .flatMap((record) => {
      const profile = profilesById.get(record.profileId);
      return profile ? [toMatch(record, profile)] : [];
    })
    .sort((a, b) => b.matchedAt.localeCompare(a.matchedAt));
}