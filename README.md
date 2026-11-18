# Coy — Discover

A mobile-first, swipe-based discovery feature (Tinder/Bumble-style) built as a standalone app
alongside a placeholder **Home** tab. Built with **Next.js 16 (App Router), React 19, TypeScript,
and Tailwind CSS v4** — frontend and backend in one repo, with a JSON file store.

- **Home** — intentionally blank placeholder for Coy's existing experience.
- **Discover** — the full swipe experience: draggable card stack, LIKE/NOPE feedback, an
  “It’s a match!” moment, a mutual-matches view, and a clear empty state.
- **Brand** — the light `coy.` identity: white paper, black outlines, hard offset shadows,
  lavender/mint/blush fills, hot-pink accents, and a pink app icon.

> **Coy's core promise:** the app never reveals who has already liked you. A match is only
> announced at the exact moment the like becomes mutual.

## Quick start

```bash
bun install
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

Requires Node.js 20+ (developed on Node 24) and Bun. `npm install && npm run dev` works too.

## Demo script

1. You land on **Discover** — the Home tab is there too, and intentionally blank.
2. Drag the first card to the right (or press `→`, or tap the heart).
   The first profile has already liked you, so you get an immediate **“It’s a match!”**.
3. Tap **View your matches** (or the heart button in the header) to see the mutual match.
4. Reload the page — the match and all swipes are still there.
5. Swipe left on a few profiles; they never come back.
6. Swipe through all 36 profiles to reach the empty state.

**Reset the demo:** stop the server and delete `data/store.json` (it is gitignored and recreated
on the next swipe).

## Features

| Area | Details |
| ---- | ------- |
| Profiles | 36 seeded profiles with name, age, photo, bio, city/college, and interests (`data/profiles.json`). 10 of them have already liked the user. |
| Swipe | Pointer-event drag on touch/mouse, spring-back below the threshold, fly-out animation, LIKE/NOPE stamps, and desktop buttons + `←`/`→` keys. |
| Never repeats | Every swipe is persisted; `GET /api/feed` filters out anyone already swiped. |
| Matching | A match requires a mutual like. Announced instantly with an “It’s a match!” overlay. |
| Matches | Mutual matches listed newest-first, with relative “matched today/yesterday” labels. |
| Privacy | `likedYou` never leaves the server until it is mutual. |
| Persistence | Swipes and matches are stored in `data/store.json` with atomic writes; they survive reloads and server restarts. |
| Empty / error states | Clear “That’s everyone for now” screen, retryable error state, and loading skeletons. |
| Accessibility | Labelled buttons, keyboard support, focus-managed dialog, `prefers-reduced-motion` support. |

## API

| Method | Route | Description |
| ------ | ----- | ----------- |
| `GET` | `/feed` (alias `/api/feed`) | Profiles not yet swiped on (`{ profiles, remaining, total }`). |
| `POST` | `/swipe` (alias `/api/swipe`) | `{ profileId, direction: "like" \| "pass" }` → `{ ok, direction, matched, match? }`. Idempotent. |
| `GET` | `/matches` (alias `/api/matches`) | Mutual matches, newest first (`{ matches }`). |

Full request/response reference: [`docs/API.md`](docs/API.md).

## Design

The interface follows Coy's light brand references: a white page, near-black `#141114` ink
outlines, hard offset shadows, pastel lavender/mint/blush card fills, and hot-pink `#f20a7a`
accents. Typography is **Figtree**; the `coy.` wordmark and pink rounded-square app icon are
custom SVG/CSS. The App Router shell is full-width on phones and a centered 620px column on
desktop, with a floating outlined tab bar.

Design tokens and reusable primitives live in `app/globals.css`: `coy-card`, `coy-card-sm`, and
`coy-btn`. Full rationale is in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md#9-brand-and-visual-system).

## Architecture

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full design: system diagram, data
model, matching rules, gesture handling, brand system, persistence strategy, trade-offs, and
limitations.

```
app/
  api/{feed,swipe,matches}/route.ts   # Route Handlers
  icon.svg                            # pink rounded-square app icon
components/
  app-shell.tsx · tab-bar.tsx · home-tab.tsx · wordmark.tsx
  discover/                           # deck, card, match overlay, matches view
lib/
  store.ts                            # JSON store + match engine
  types.ts · current-user.ts
data/
  profiles.json                       # seed data (36 profiles)
  store.json                          # runtime swipes/matches (gitignored)
public/photos/                        # portraits, current user avatar + credits
docs/
  ARCHITECTURE.md · API.md
```

## Notes

- **No auth.** `lib/current-user.ts` hard-codes the single logged-in user.
- **Photos are local.** All 36 seed portraits plus the current user's avatar are bundled in
  `public/photos/` (demo content from Unsplash, 900×1200); the app makes no third-party image
  requests at runtime. Credits are in
  [`public/photos/SOURCES.md`](public/photos/SOURCES.md). A pastel gradient + initials avatar
  renders if an image fails to load.
- **Storage is a local JSON file.** This is a single-process demo; see the *Limitations* section
  of the architecture doc before adapting it for a multi-instance deployment.
- **No chat, undo, or unmatch** — deliberately out of scope.
- To reset state during development, delete `data/store.json`.

## Scripts

```bash
bun dev           # start the dev server
bun run build     # production build
bun run start     # serve the production build
bun run lint      # eslint
```