# API reference — Coy Discover

All endpoints are Next.js Route Handlers. Each one is mounted at the canonical path from the
brief **and** at an `/api/*` alias — both are identical:

| Canonical | Alias |
| --------- | ----- |
| `/feed` | `/api/feed` |
| `/swipe` | `/api/swipe` |
| `/matches` | `/api/matches` |

Responses are JSON and sent with `Cache-Control: no-store` so a feed is never served from a stale
cache. The service worker also excludes `/api/*`, `/feed`, `/swipe`, and `/matches` from every
cache, so these responses always come from the network.

Swipe state is scoped to the caller's browser through an HTTP-only `coy_state` cookie. A successful
`POST /swipe` returns the updated state in `Set-Cookie`; `GET /feed` and `GET /matches` read it.
Without a cookie (for example a fresh curl session) the user starts with the full deck.

Base URL (development): `http://localhost:3000`

Error shape:

```json
{ "error": "Human readable message" }
```

---

## `GET /feed` (alias `GET /api/feed`)

Returns every profile the logged-in user has **not** swiped on, in seed order. The `likedYou`
flag is never included.

**Response `200`**

```json
{
  "profiles": [
    {
      "id": "p01",
      "name": "Maya",
      "age": 26,
      "photo": "/photos/p01.jpg",
      "bio": "Product designer who will absolutely beat you at Scrabble…",
      "city": "San Francisco",
      "college": "California College of the Arts",
      "interests": ["Pottery", "Hiking", "Matcha", "Design"]
    }
  ],
  "remaining": 36,
  "total": 36
}
```

| Field       | Type       | Notes                                            |
| ----------- | ---------- | ------------------------------------------------ |
| `profiles`  | `Profile[]`| Unswiped profiles, seed order.                   |
| `remaining` | `number`   | `profiles.length`.                               |
| `total`     | `number`   | Total seeded profiles (36).                      |

**Errors**

| Status | When                                                          |
| ------ | ------------------------------------------------------------- |
| `500`  | `data/profiles.json` is unreadable or invalid.                |

---

## `POST /swipe` (alias `POST /api/swipe`)

Records a like or pass. Idempotent: repeating the same swipe returns the stored outcome and sets
`alreadySwiped: true` instead of creating a duplicate match. The response includes a `Set-Cookie`
header with the updated `coy_state` value; later requests must send that cookie back.

**Request body**

```json
{ "profileId": "p01", "direction": "like" }
```

| Field       | Type                  | Required | Notes                       |
| ----------- | --------------------- | -------- | --------------------------- |
| `profileId` | `string`              | yes      | Must match a seeded profile. |
| `direction` | `"like"` \| `"pass"`  | yes      |                             |

**Response `200` — no match**

```json
{ "ok": true, "direction": "like", "matched": false }
```

**Response `200` — match created**

```json
{
  "ok": true,
  "direction": "like",
  "matched": true,
  "match": {
    "id": "match_p01_mf3kz1a",
    "profile": {
      "id": "p01",
      "name": "Maya",
      "age": 26,
      "photo": "/photos/p01.jpg",
      "bio": "Product designer who will absolutely beat you at Scrabble…",
      "city": "San Francisco",
      "college": "California College of the Arts",
      "interests": ["Pottery", "Hiking", "Matcha", "Design"]
    },
    "matchedAt": "2026-11-18T09:41:02.115Z"
  }
}
```

**Response `200` — repeated swipe**

```json
{ "ok": true, "direction": "like", "matched": true, "match": { "…": "…" }, "alreadySwiped": true }
```

`alreadySwiped` is only present when the profile had already been swiped.

**Errors**

| Status | Body                                             | When                                      |
| ------ | ------------------------------------------------ | ----------------------------------------- |
| `400`  | `{ "error": "Request body must be valid JSON" }` | Body is not parseable JSON.               |
| `400`  | `{ "error": "Request body must be a JSON object" }` | JSON body is not an object.            |
| `400`  | `{ "error": "`profileId` is required" }`         | Missing/empty/non-string `profileId`.     |
| `400`  | `{ "error": "`direction` must be \"like\" or \"pass\"" }` | Invalid direction.                |
| `404`  | `{ "error": "Profile not found" }`               | Unknown `profileId`.                      |
| `500`  | `{ "error": "Failed to record swipe" }`          | Unexpected server failure.                |

---

## `GET /matches` (alias `GET /api/matches`)

Returns the user's **mutual** matches, newest first. Only profiles the user liked *and* that had
already liked the user appear here.

**Response `200`**

```json
{
  "matches": [
    {
      "id": "match_p01_mf3kz1a",
      "profile": {
        "id": "p01",
        "name": "Maya",
        "age": 26,
        "photo": "/photos/p01.jpg",
        "bio": "Product designer who will absolutely beat you at Scrabble…",
        "city": "San Francisco",
        "college": "California College of the Arts",
        "interests": ["Pottery", "Hiking", "Matcha", "Design"]
      },
      "matchedAt": "2026-11-18T09:41:02.115Z"
    }
  ]
}
```

`matches` is `[]` when there are none.

**Errors**

| Status | When                                             |
| ------ | ------------------------------------------------ |
| `500`  | `data/profiles.json` is unreadable or invalid.   |

---

## Status codes at a glance

| Code  | Meaning                                                        |
| ----- | -------------------------------------------------------------- |
| `200` | Success (including idempotent re-swipe).                       |
| `400` | Malformed request body / invalid fields.                       |
| `404` | Unknown profile id.                                            |
| `405` | Wrong HTTP method (handled by Next.js).                        |
| `500` | Seed data missing/unreadable or an unexpected server failure.  |

## Manual smoke test

```bash
# Feed before swiping (no cookie → full deck)
curl -s localhost:3000/feed | head -c 300

# Like Maya and keep the returned coy_state cookie
curl -s -c cookies.txt -b cookies.txt -X POST localhost:3000/swipe \
  -H 'content-type: application/json' \
  -d '{"profileId":"p01","direction":"like"}'

# The same browser now sees 35 profiles and one match
curl -s -b cookies.txt localhost:3000/feed
curl -s -b cookies.txt localhost:3000/matches
```