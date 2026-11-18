# Architecture — Coy Discover

A swipe-based discovery feature (Tinder/Bumble-style) built as a standalone app alongside a
placeholder **Home** tab. This document records the architecture decisions, the data model, the
matching rules, and the reasoning behind them.

---

## 1. Overview

**Coy Discover** is a mobile-first Next.js application with a two-tab shell:

| Tab        | Purpose                                                        |
| ---------- | -------------------------------------------------------------- |
| **Home**   | Intentionally blank placeholder for Coy's existing experience.  |
| **Discover** | The swipe deck, match celebration, and mutual-matches list.    |

All functionality lives in the Discover tab. The app assumes a single logged-in user
(`lib/current-user.ts`); there is no auth, no chat, and no multi-user support.

---

## 2. Goals and non-goals

**Goals**

- One profile card at a time, with swipe gestures on touch and buttons/keyboard on desktop.
- Smooth, interruptible card animations with unmistakable feedback (LIKE / NOPE stamps, fly-out).
- A profile that has been swiped on **never** appears again (persisted server-side).
- A match is created **only** when both sides have liked each other, announced immediately with
  an "It's a match!" screen and collected in a Matches view.
- The app never reveals who has already liked the user unless the like is mutual.
- Swipes and matches survive page reloads and server restarts.

**Non-goals**

- Authentication, messaging, push notifications, real photo uploads.
- Multi-user / real-time behaviour.
- Production data stores or horizontal scaling (see *Limitations*).

---

## 3. Requirements traceability

| Requirement                                  | Where it is implemented |
| -------------------------------------------- | ----------------------- |
| ≥30 seeded profiles (name, age, photo, bio, city/college, interests) | `data/profiles.json` — 36 profiles |
| Some profiles already liked the user         | `likedYou` flag in `data/profiles.json` (10 of 36) |
| One card at a time, drag + buttons           | `components/discover/swipe-deck.tsx`, `swipe-card.tsx` |
| Smooth animations and clear feedback         | Pointer-event drag, spring-back, fly-out ghosts, LIKE/NOPE stamps (`app/globals.css`) |
| Swiped profiles never reappear               | `state.swipes` in `data/store.json`; `/feed` filters them out |
| Empty state when no profiles remain          | `EmptyState` in `discover-tab.tsx` |
| Match only when both liked each other        | `recordSwipe()` in `lib/store.ts` |
| "It's a match!" screen at that moment        | `match-overlay.tsx`, driven by the `POST /swipe` response |
| Matches view listing all mutual matches      | `matches-view.tsx`, `GET /matches` |
| Never reveal one-sided likes                 | `likedYou` is stripped by `toPublicProfile()` before any response |
| `GET /feed`                                  | `app/feed/route.ts` |
| `POST /swipe`                                | `app/swipe/route.ts` |
| `GET /matches`                               | `app/matches/route.ts` |
| Persistence across reloads                   | JSON file store with atomic writes (`lib/store.ts`) |

---

## 4. Tech stack

| Layer      | Choice | Why |
| ---------- | ------ | --- |
| Framework  | **Next.js 16 (App Router) + React 19 + TypeScript** | One repo for UI and API (Route Handlers), no separate Express server to run or deploy. |
| Styling    | **Tailwind CSS v4** | Mobile-first utilities, no runtime CSS-in-JS cost. |
| Server     | **Next.js Route Handlers** (`app/api/**/route.ts`) | Request/response API with zero extra infrastructure; supports streaming, `Request`/`Response`. |
| Data       | **JSON files** (`data/profiles.json`, `data/store.json`) | Explicitly allowed by the brief; zero setup, inspectable, and easy to reset for demos. |
| Gestures   | **Pointer Events + CSS transforms** (no library) | One code path for touch, pen, and mouse; avoids a ~50 kB animation dependency. |
| Icons      | Inline SVG components | No icon package needed. |

No runtime dependencies were added — the app builds on `next`/`react` only.

---

## 5. System architecture

```
┌──────────────────────────── Browser (Client Components) ────────────────────────────┐
│                                                                                     │
│  AppShell  (tab state: "home" | "discover")                                         │
│   ├── HomeTab                → blank placeholder                                    │
│   └── DiscoverTab                                                                   │
│        ├── header + Matches(n) button                                               │
│        ├── SwipeDeck                                                                │
│        │     ├── SwipeCard ×3 (stacked, top card is draggable)                      │
│        │     ├── fly-out ghosts (CSS keyframes)                                     │
│        │     └── Pass / Like buttons + keyboard (←/→)                               │
│        ├── MatchOverlay        → "It's a match!"                                    │
│        ├── MatchesView         → grid of mutual matches                             │
│        └── EmptyState / ErrorState / Skeleton                                       │
│                                                                                     │
└───────────────▲─────────────────────────────────────────────────────────────────────┘
                │ fetch (JSON, no-store)
┌───────────────┴─────────────────────────────────────────────────────────────────────┐
│ Next.js Route Handlers (server)                                                     │
│                                                                                     │
│  GET  /feed     → store.getFeed()      → { profiles, remaining, total }         │
│  POST /swipe    → store.recordSwipe()  → { ok, direction, matched, match? }     │
│  GET  /matches  → store.getMatches()   → { matches: [...] }                     │
│                                                                                     │
└───────────────▲─────────────────────────────────────────────────────────────────────┘
                │ node:fs/promises (atomic write: tmp + rename, serialized queue)
┌───────────────┴─────────────────────────────────────────────────────────────────────┐
│ Data files                                                                          │
│  data/profiles.json  → 36 seed profiles (incl. likedYou, never sent until mutual)   │
│  data/store.json     → { version, swipes, matches }  (gitignored, created on write) │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

The handlers are mounted at the canonical paths from the brief (`/feed`, `/swipe`, `/matches`) and
mirrored under `/api/*` (`/api/feed`, `/api/swipe`, `/api/matches`) for convenience.

### Request flows

**Feed**

```
DiscoverTab mounts → GET /feed → profiles without a recorded swipe, likedYou stripped
```

**Swipe**

```
Drag release / button / arrow key
  → SwipeDeck animates a ghost card out (300 ms)
  → POST /swipe { profileId, direction }
  → store.recordSwipe(): write swipe; if direction === "like" && profile.likedYou → create match
  → response { matched, match? }
  → DiscoverTab removes the card optimistically; if matched → MatchOverlay
  → if the request fails → card is put back and an error is shown
```

**Matches**

```
DiscoverTab loads GET /matches on mount; the header badge and MatchesView read that state
```

---

## 6. Data model

### Seed profile — `data/profiles.json`

```ts
interface SeedProfile {
  id: string;          // "p01" … "p36"
  name: string;
  age: number;
  photo: string;       // local portrait path, e.g. "/photos/p01.jpg"
  bio: string;
  city: string;
  college?: string;
  interests: string[];
  likedYou: boolean;   // seed-only: this profile already liked the logged-in user
}
```

### Public profile — what the API returns

`likedYou` is **never** included. `toPublicProfile()` explicitly rebuilds the object field by
field, so a new field added to the seed cannot leak accidentally.

```ts
interface Profile {
  id: string;
  name: string;
  age: number;
  photo: string;
  bio: string;
  city: string;
  college?: string;
  interests: string[];
}
```

### Runtime state — `data/store.json`

```ts
interface StoreState {
  version: 1;
  swipes: Record<string, { direction: "like" | "pass"; at: string }>;
  matches: Array<{ id: string; profileId: string; matchedAt: string }>;
}
```

The store file is created lazily on the first write and is gitignored. Delete it to reset the
demo (see README).

---

## 7. Matching rules

A swipe is recorded exactly once per profile:

```
recordSwipe(profileId, direction)
  if a swipe already exists → return stored result (idempotent, alreadySwiped: true)
  else write { direction, at }

  match ⇔ direction === "like" AND profile.likedYou === true
```

- A **pass** never creates a match, even if that profile liked the user.
- A **like** on a profile that has *not* liked the user is stored but stays one-sided forever
  (there is no way for the other side to like back in a single-user app).
- A match is stored once, with `matchedAt`, and returned in the `POST /swipe` response so the
  UI can celebrate immediately.

### Privacy guarantees (Coy's core promise)

1. `GET /feed` and `GET /matches` serialise profiles through `toPublicProfile()`, which
   omits `likedYou`.
2. `GET /matches` returns only rows from `state.matches`, which by construction are mutual.
3. A one-sided like is only revealed in the `POST /swipe` response at the exact moment it
   becomes mutual — never before, never in a list.
4. The client has no code path that can display a "liked you" indicator; the flag never crosses
   the network boundary.

> The seed file itself contains `likedYou` (it has to — it *is* the source of truth). That is
> source data, not an API response; the running app never exposes it.

---

## 8. Swipe interaction

Implemented in `components/discover/swipe-deck.tsx` with Pointer Events.

**Drag**

- `pointerdown` captures the pointer; `pointermove` sets `translate3d(dx, dy * 0.35, 0) rotate(dx / 20deg)`.
- `touch-action: pan-y` keeps vertical page gestures working while horizontal drags are ours.
- LIKE / NOPE stamps fade in proportionally to the drag distance.

**Release**

- Swipe if `|dx| > 96 px` **or** (`|dx| > 48 px` and velocity > `0.5 px/ms`).
- Otherwise the card springs back (CSS transition on `transform`).
- On a swipe, a **ghost** copy of the card is rendered with a CSS keyframe that continues from the
  release offset and flies off-screen (300 ms), while the real list already advanced. Ghosts are
  kept in a small array so rapid consecutive swipes never clip each other.

**Buttons / keyboard**

- Pass / Like buttons trigger the same code path as a drag.
- `←` / `→` arrow keys are wired for desktop accessibility; buttons carry `aria-label`s.
- `prefers-reduced-motion` collapses animation durations via a global media query.

**Card stack**

The next two profiles render behind the top card at `scale(0.95)` / `scale(0.9)`; when the top
card is removed, the survivors transition to their new slot, which makes the deck feel physical
without a layout jump.

---

## 9. Brand and visual system

The visual direction comes from Coy's light brand references: white paper, bold black outlines,
hard offset shadows, pastel fills, hot-pink accents, and the lowercase `coy.` wordmark.

**Tokens** (`app/globals.css`, exposed as Tailwind theme colors)

| Token | Value | Use |
| ----- | ----- | --- |
| `ink` | `#141114` | Text, borders, hard shadows |
| `coy-pink` | `#f20a7a` | Primary actions, active tab, wordmark dot |
| `lavender` | `#e9defb` | Primary card fill / matches |
| `mint` | `#c9f2dc` | Secondary card fill / count pills |
| `blush` | `#ffdcea` | Tertiary card fill / errors |
| `smoke` | `#6f6975` | Secondary text |

**Primitives**

- `.coy-card` — 2px ink border, 28px radius, `5px 5px 0` offset shadow. Used for the swipe card,
  match dialog, and empty/error panels.
- `.coy-card-sm` — compact variant with a `3px 3px 0` shadow for the matches grid.
- `.coy-btn` — outlined pill with a hard shadow that compresses on press; used for icons,
  primary actions, and the floating tab bar.
- Cards rotate through lavender → mint → blush by profile index so the deck reads as a set while
  staying visually distinct.

**Chrome**

- `components/wordmark.tsx` renders `coy` plus a pink CSS dot; the same mark appears as a pink
  rounded-square SVG app icon (`app/icon.svg`) with a black `C`.
- `components/app-shell.tsx` is a full-width phone layout with no faux device frame; on desktop it
  centers a 620px column on white.
- The tab bar floats as an outlined pill at the bottom, with the active tab filled hot pink.
- Figtree (via `next/font`) supplies the rounded geometric type; headings use heavy weights and
  tight tracking.
- All decorative motion (card fly-out, match pop, floating hearts) is CSS keyframes and respects
  `prefers-reduced-motion`.

**Photos**

The 36 seed portraits are local files in `public/photos/p01.jpg` … `p36.jpg` (900×1200,
face-cropped); the current user's avatar is `public/photos/alex.jpg`. They are demo content from
Unsplash; see `public/photos/SOURCES.md`. Keeping the assets local removes third-party runtime
requests and makes the deck deterministic offline.

---

## 10. Persistence and concurrency

- Every request reads `data/store.json` from disk — there is no in-memory cache, so a dev-server
  restart or an external edit is always reflected.
- Writes go through `mutate()`, which serialises read-modify-write cycles on a promise queue and
  then persists atomically: write `store.json.tmp`, then `rename()` over `store.json`. This
  prevents interleaved requests from losing a swipe.
- `data/profiles.json` is read per request as well, so editing seed data takes effect on reload.

---

## 11. Project structure

```
app/
  layout.tsx                 # metadata, viewport, fonts
  page.tsx                   # renders <AppShell/>
  globals.css                # Tailwind import, theme tokens, keyframes, reduced-motion
  feed/route.ts              # GET  /feed
  swipe/route.ts             # POST /swipe
  matches/route.ts           # GET  /matches
  api/
    feed/route.ts            # alias of /feed
    swipe/route.ts           # alias of /swipe
    matches/route.ts         # alias of /matches
components/
  app-shell.tsx              # tab state + full-width shell
  tab-bar.tsx                # floating outlined Home / Discover dock
  home-tab.tsx               # blank placeholder
  wordmark.tsx               # "coy." wordmark with pink dot
  discover/
    discover-tab.tsx         # data loading, swipe handling, views, error/empty states
    swipe-deck.tsx           # gesture logic, stack, buttons, keyboard
    swipe-card.tsx           # card presentation, photo fallback, stamps
    match-overlay.tsx        # "It's a match!" dialog
    matches-view.tsx         # mutual matches grid
  icons.tsx                  # inline SVG icons
lib/
  types.ts                   # shared request/response types
  current-user.ts            # the single logged-in user
  api.ts                     # shared route-handler bodies (canonical + /api aliases)
  store.ts                   # JSON store: feed, swipe, matches, atomic writes
data/
  profiles.json              # 36 seed profiles
  store.json                 # runtime state (gitignored)
public/
  photos/                    # seed portraits, alex.jpg + SOURCES.md
docs/
  ARCHITECTURE.md            # this document
  API.md                     # endpoint reference
```

---

## 12. Design decisions and trade-offs

| Decision | Alternative considered | Why this one |
| -------- | ---------------------- | ------------ |
| Next.js Route Handlers instead of Express | Separate Express server | One deployable, one language, no CORS/proxy setup; the brief allows either. |
| JSON file store instead of SQLite | SQLite / Postgres | Zero native deps, trivially inspectable and resettable; the dataset is tiny and single-process. |
| Client-side fetching instead of Server Components | RSC initial data | The deck is highly interactive and mutates constantly; a client-owned cache keeps one source of truth and avoids a server round-trip per swipe. |
| Pointer Events + CSS instead of Framer Motion | `motion` / `react-spring` | Full control over the drag → fly-out handoff, no bundle cost, no extra dependency. |
| Optimistic swipe with rollback | Wait for the server before advancing | Swiping must feel instant; the card is restored and an error shown if the write fails. |
| Feed returns all remaining profiles | Paginated feed | 36 profiles is tiny; the client owns the deck order and can animate the stack without extra requests. |
| `likedYou` stripped by an explicit mapper | `delete profile.likedYou` | A rest-spread would silently start leaking the field if the seed type changes. |
| Reset via deleting `data/store.json` (no reset API) | A `POST /api/reset` button | The brief requires that a swiped profile never reappears; a reset endpoint would undermine that promise in the UI. |

---

## 13. How to run and demo

```bash
bun install
bun dev            # http://localhost:3000
```

1. Land on **Discover**; the **Home** tab is one tap away and intentionally blank.
2. Drag the first card right (or press →). The first profile has already liked you, so this
   produces an immediate **"It's a match!"**.
3. Open **Matches** to see the mutual match; reload the page and confirm it is still there.
4. Swipe left on a few profiles and confirm they never return.
5. Swipe through the deck to reach the empty state.

To reset the demo state, stop the server and delete `data/store.json`.

---

## 14. Limitations and future work

- **Single process only.** The promise-queue write serialisation is per Node process; a multi-instance
  deployment would need SQLite/Postgres with a uniqueness constraint on `(profile_id)`.
- **File-system storage.** Serverless hosts with read-only file systems need an external database.
- **No auth.** `lib/current-user.ts` hard-codes the single user.
- **No chat / unmatch / undo.** Deliberately out of scope.
- **Placeholder photos** are local Unsplash demo portraits in `public/photos/`; a pastel gradient +
  initials avatar renders if an image fails to load.
- **Feed ordering** follows the seed file. A production app would rank by recency/activity.