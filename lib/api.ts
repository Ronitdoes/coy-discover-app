import { getFeed, getMatches, HttpError, recordSwipe } from "@/lib/store";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Shared Route Handler logic. Mounted at both the canonical paths from the
 * brief (`/feed`, `/swipe`, `/matches`) and the idiomatic `/api/*` aliases.
 */

export async function handleFeed(): Promise<Response> {
  try {
    return Response.json(await getFeed(), { headers: NO_STORE });
  } catch (error) {
    console.error("GET /feed failed", error);
    return Response.json(
      { error: "Failed to load profiles" },
      { status: 500, headers: NO_STORE },
    );
  }
}

export async function handleMatches(): Promise<Response> {
  try {
    return Response.json(
      { matches: await getMatches() },
      { headers: NO_STORE },
    );
  } catch (error) {
    console.error("GET /matches failed", error);
    return Response.json(
      { error: "Failed to load matches" },
      { status: 500, headers: NO_STORE },
    );
  }
}

export async function handleSwipe(request: Request): Promise<Response> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json(
      { error: "Request body must be valid JSON" },
      { status: 400, headers: NO_STORE },
    );
  }

  if (typeof payload !== "object" || payload === null) {
    return Response.json(
      { error: "Request body must be a JSON object" },
      { status: 400, headers: NO_STORE },
    );
  }

  const { profileId, direction } = payload as {
    profileId?: unknown;
    direction?: unknown;
  };

  if (typeof profileId !== "string" || profileId.trim() === "") {
    return Response.json(
      { error: "`profileId` is required" },
      { status: 400, headers: NO_STORE },
    );
  }

  if (direction !== "like" && direction !== "pass") {
    return Response.json(
      { error: '`direction` must be "like" or "pass"' },
      { status: 400, headers: NO_STORE },
    );
  }

  try {
    const result = await recordSwipe(profileId, direction);
    return Response.json(result, { headers: NO_STORE });
  } catch (error) {
    if (error instanceof HttpError) {
      return Response.json(
        { error: error.message },
        { status: error.status, headers: NO_STORE },
      );
    }
    console.error("POST /swipe failed", error);
    return Response.json(
      { error: "Failed to record swipe" },
      { status: 500, headers: NO_STORE },
    );
  }
}