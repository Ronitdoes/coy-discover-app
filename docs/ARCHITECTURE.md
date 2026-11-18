# Architecture — Coy Discover

A swipe-based discovery feature (Tinder/Bumble-style) built as a standalone app alongside a
placeholder **Home** tab. This document records the architecture decisions, the data model, the
matching rules, and the reasoning behind them.

---

## 1. Overview

**Coy Discover** is a mobile-first, installable Next.js application. On a first visit it opens
with a one-screen onboarding intro; afterwards it has a two-tab shell:

| State / tab | Purpose                                                        |
| ----------- | -------------------------------------------------------------- |
| **Onboarding** | First-visit intro: the match constellation, the privacy promise, and a Get Started control that can be tapped or swiped. |
| **Home**    | Intentionally blank placeholder for Coy's existing experience.  |
| **Discover** | The swipe deck, match celebration, and mutual-matches list.    |

All product functionality lives in Discover. The app assumes a single logged-in user
(`lib/current-user.ts`); there is no auth, no chat, and no multi-user support. A hand-written
service worker makes the installed app open offline and keeps the shell available when the network
drops; the API itself always requires a connection.

---

## 2. Goals and non-goals

**Goals**

- A first-visit onboarding screen that explains the product and can be completed by tap, keyboard,
  or a right-swipe, remembered across visits.
- One profile card at a time, with swipe gestures on touch and buttons/keyboard on desktop.
- Smooth, interruptible card animations with unmistakable feedback (LIKE / NOPE stamps, fly-out).
- A profile that has been swiped on **never** appears again (persisted server-side).
- A match is created **only** when both sides have liked each other, announced immediately with
  an "It's a match!" screen and collected in a Matches view.
- The app never reveals who has already liked the user unless the like is mutual.
- Swipes and matches survive page reloads and server restarts.
- Installable as a standalone PWA on iOS, Android, and desktop, with platform-appropriate guidance.
- A cached app shell and offline fallback so a dropped connection does not show a browser error.

**Non-goals**

- Authentication, messaging, push notifications, real photo uploads.
- Multi-user / real-time behaviour.
- Offline mutations or background sync.
- Production data stores or horizontal scaling (see *Limitations*).

---

## 3. Requirements traceability

| Requirement                                  | Where it is implemented |
| -------------------------------------------- | ----------------------- |
| ≥30 seeded profiles (name, age, photo, bio, city/college, interests) | `data/profiles.json` — 36 profiles |
| Some profiles already liked the user         | `likedYou` flag in `data/profiles.json` (10 of 36) |
| One card at a time, drag + buttons           | `components/discover/swipe-deck.tsx`, `swipe-card.tsx` |
| Smooth animations and clear feedback         | Pointer-event drag, spring-back, fly-out ghosts, LIKE/NOPE stamps (`app/globals.css`) |
| Swiped profiles never reappear               | `state.swipes` in the `coy_state` cookie; `/feed` filters them out |
| Empty state when no profiles remain          | `EmptyState` in `discover-tab.tsx` |
| Match only when both liked each other        | `recordSwipe()` in `lib/store.ts` |
| "It's a match!" screen at that moment        | `match-overlay.tsx`, driven by the `POST /swipe` response |
| Matches view listing all mutual matches      | `matches-view.tsx`, `GET /matches` |
| Never reveal one-sided likes                 | `likedYou` is stripped by `toPublicProfile()` before any response |
| `GET /feed`                                  | `app/feed/route.ts` |
| `POST /swipe`                                | `app/swipe/route.ts` |
| `GET /matches`                               | `app/matches/route.ts` |
| Persistence across reloads                   | HTTP-only cookie state with a `Set-Cookie` update per swipe (`lib/store.ts`) |
| First-visit onboarding, remembered            | `components/onboarding/*`, `coy:onboarding-complete` in `localStorage` (`app-shell.tsx`) |
| Installable PWA                              | `app/manifest.ts`, `public/icons/*`, `components/install/*`, `components/pwa-register.tsx` |
| Offline shell + fallback                     | `public/sw.js`, `app/offline/page.tsx`, `components/offline-retry-button.tsx` |

---

## 4. Tech stack

| Layer      | Choice | Why |
| ---------- | ------ | --- |
| Framework  | **Next.js 16 (App Router) + React 19 + TypeScript** | One repo for UI and API (Route Handlers), no separate Express server to run or deploy. |
| Styling    | **Tailwind CSS v4** | Mobile-first utilities, no runtime CSS-in-JS cost. |
| Server     | **Next.js Route Handlers** (`app/api/**/route.ts`) | Request/response API with zero extra infrastructure; supports streaming, `Request`/`Response`. |
| Data       | **JSON seed + HTTP-only cookie** (`data/profiles.json`, `coy_state`) | Zero setup, works on read-only serverless filesystems, and the seed stays inspectable. |
| Gestures   | **Pointer Events + CSS transforms** (no library) | One code path for touch, pen, and mouse; avoids a ~50 kB animation dependency. |
| PWA        | **Web App Manifest + hand-written Service Worker** | Installability and an offline shell with no Workbox/next-pwa dependency; the cache policy is small enough to own explicitly. |
| Icons      | Inline SVG components | No icon package needed. |

No runtime dependencies were added — the app builds on `next`/`react` only.

---

## 5. System architecture

```
┌──────────────────────────── Browser (Client Components) ────────────────────────────┐
│                                                                                     │
│  AppShell  (onboarding gate + tab state: "home" | "discover")                       │
│   ├── OnboardingScreen       → first visit only; Get Started tap/swipe              │
│   │     └── GetStartedButton → completes onboarding, writes localStorage flag       │
│   ├── HomeTab                → blank placeholder                                    │
│   ├── TabBar                → Home / Discover                                        │
│   └── DiscoverTab  (+ install controller)                                           │
│        ├── header + Install entry + Matches(n) button                               │
│        ├── InstallBanner      → native prompt or platform-specific help            │
│        ├── SwipeDeck                                                                │
│        │     ├── SwipeCard ×3 (stacked, top card is draggable)                      │
│        │     ├── fly-out ghosts (CSS keyframes)                                     │
│        │     └── Pass / Like buttons + keyboard (←/→)                               │
│        ├── MatchOverlay        → "It's a match!"                                    │
│        ├── MatchesView         → grid of mutual matches                             │
│        └── EmptyState / ErrorState / Skeleton / offline retry                       │
│                                                                                     │
│  PwaRegister → navigator.serviceWorker.register("/sw.js")                           │
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
                │ HTTP-only cookie: read on every request, `Set-Cookie` after a swipe
┌───────────────┴─────────────────────────────────────────────────────────────────────┐
│ Data                                                                                │
│  data/profiles.json  → 36 seed profiles (incl. likedYou, never sent until mutual)   │
│  coy_state cookie    → swipes only; matches are derived from likes + likedYou       │
└─────────────────────────────────────────────────────────────────────────────────────┘

Service worker (public/sw.js)
  navigations        → network-first, cached "/" then "/offline" fallback
  /_next/static/*    → network-first, cache fallback
  /photos, /icons    → cache-first
  /api/*, /feed, /swipe, /matches → never intercepted or cached
```

The handlers are mounted at the canonical paths from the brief (`/feed`, `/swipe`, `/matches`) and
mirrored under `/api/*` (`/api/feed`, `/api/swipe`, `/api/matches`) for convenience.

### Request flows

**Feed**

```
DiscoverTab mounts → GET /feed → cookie decoded → profiles without a recorded swipe, likedYou stripped
```

**Swipe**

```
Drag release / button / arrow key
  → SwipeDeck animates a ghost card out (300 ms)
  → POST /swipe { profileId, direction }
  → store.recordSwipe(): update the swipe map; if direction === "like" && profile.likedYou → match
  → response { matched, match? } + Set-Cookie with the updated state
  → DiscoverTab removes the card optimistically; if matched → MatchOverlay
  → if the request fails → card is put back and an error is shown
```

**Matches**

```
DiscoverTab loads GET /matches on mount; matches are derived from likes in the cookie
```

**Onboarding**

```
First visit (no coy:onboarding-complete flag)
  → AppShell renders OnboardingScreen (server snapshot = not complete to avoid a flash)
  → Get Started: tap/keyboard, or drag the control past 55% of its travel
  → completeOnboarding(): localStorage.setItem("coy:onboarding-complete", "true")
  → AppShell renders Discover; later visits read the flag through useSyncExternalStore
```

**Install**

```
AppShell mounts useInstallPrompt() for the whole visit
  → Chromium fires beforeinstallprompt → event.preventDefault(), keep the event
  → header download button opens InstallBanner
  → Add → promptInstall() → native prompt → accepted / dismissed / unavailable
  → iOS/Safari/Firefox (or no prompt): expand platform-specific Add to Home Screen steps
  → display-mode: standalone (CSS + hook) hides the entry point entirely
```

**Offline**

```
PwaRegister → /sw.js install → fetch and cache "/", "/offline", manifest, icons
Navigation while offline → SW network-first → cached "/" shell, or "/offline" if absent
Discover API failure + navigator.onLine === false → offline error copy
window "online" event → retry() → fresh GET /api/feed, no reload required
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

### Runtime state — `coy_state` cookie

The swipes are serialized as compact JSON, base64url-encoded, and stored in an HTTP-only cookie.
Matches are **derived** from the swipes, so they never need to be stored separately.

```ts
interface StoreState {
  swipes: Record<string, { direction: "like" | "pass"; at: string }>;
}
```

The cookie is written with `Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax` (plus `Secure` over
HTTPS). A malformed or tampered cookie falls back to an empty state. With all 36 profiles swiped,
the encoded value is roughly 2 KB, comfortably below the 4 KB browser cookie limit.

Clear site data (or the cookie) to reset the demo (see README).

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
  centers a **390 px** column on white.
- The onboarding screen uses a light paper grid, a portrait constellation of real seed profiles
  around pastel mystery bubbles, hand-drawn arrow, and a black swipe/tap Get Started control.
- The tab bar floats as an outlined pill at the bottom, with the active tab filled hot pink.
- Figtree (via `next/font`) supplies the rounded geometric type; headings use heavy weights and
  tight tracking.
- All decorative motion (card fly-out, match pop, floating hearts, onboarding bubbles/arrow) is CSS
  keyframes and respects `prefers-reduced-motion`.

**Photos**

The 36 seed portraits are local files in `public/photos/p01.jpg` … `p36.jpg` (900×1200,
face-cropped); the current user's avatar is `public/photos/alex.jpg`. They are demo content from
Unsplash; see `public/photos/SOURCES.md`. Keeping the assets local removes third-party runtime
requests and makes the deck deterministic offline.

---

## 10. Onboarding, installation, and offline

### 10.1 First-visit onboarding

`AppShell` decides whether to render `OnboardingScreen` or the tabbed app. Completion is stored
under `coy:onboarding-complete` in `localStorage` and read through `useSyncExternalStore`, so the
shell re-renders when another tab clears the flag. A per-visit state flag covers browsers where
storage is blocked.

- The server snapshot is "not complete" so the first paint can hydrate either state; a returning
  visitor's client snapshot then wins.
- `GetStartedButton` is a real `<button>`: Enter/Space/tap work, and the same control can be
  dragged right. A completed drag suppresses the synthetic click that follows it.
- The screen is intentionally one viewport tall at 390 × 844; the match constellation scales from
  percentage coordinates so it never needs a scroll on small phones.

### 10.2 Installable app

`app/manifest.ts` declares the standalone app: name/short name, `start_url` and scope `/`,
white background and theme, portrait orientation, and 192/512 "any" + maskable icons. `app/icon.svg`
and `app/apple-icon.png` cover the browser tab and iOS home screen.

`components/install/use-install-prompt.ts` lives at the shell level, not inside Discover, so the
one-shot Chromium `beforeinstallprompt` event is retained even while the user is on Home.

| Platform | Behavior |
| -------- | -------- |
| Chromium (Chrome, Edge, Samsung) | Deferred prompt captured; **Add** calls `event.prompt()` and reports accepted/dismissed. |
| iOS Safari | No native prompt; the banner expands Share → **Add to Home Screen** instructions. |
| Safari (desktop) | Share menu → **Add to Dock / Add to Home Screen**. |
| Firefox | Explains that install is unavailable and points to a supporting browser. |
| Other | Generic browser-menu guidance. |

The header entry point is hidden when the app is already running standalone (both a CSS
`display-mode` rule to avoid a flash and a `useSyncExternalStore` display-mode check).

### 10.3 Service worker and offline behavior

`components/pwa-register.tsx` registers `public/sw.js` after load (progressive enhancement: if
registration fails, the online app is unaffected). The worker is versioned with `VERSION` and uses
three caches: shell, static assets, and images.

| Request | Strategy | Why |
| ------- | -------- | --- |
| Navigations | Network-first → cached `/` → cached `/offline` | Fresh app when online, usable shell when not. |
| `/_next/static/*` | Network-first with cache fallback | Hashed build assets can be cached safely. |
| `/photos/*`, `/icons/*`, `/icon.svg` | Cache-first | Local demo images never change at runtime. |
| `/api/*`, `/feed`, `/swipe`, `/matches` | Not intercepted | Swipes and matches must never be stale or replayed from a cache. |

On install, the worker precaches the shell, offline page, manifest, and icons individually so one
failed request cannot abort the whole install. On activate, it deletes caches from older versions
and claims open clients. The `/offline` page offers a full-document **Try again** navigation so the
worker can serve the cached shell when the network returns.

Separately, Discover treats an offline feed failure as a first-class state: it shows
"You're offline…" copy and listens for `window.online` to retry automatically. There is no
background sync and no offline swipe queue — mutations are deliberately not cached.

> The service worker is only fully meaningful over HTTPS (or `localhost`) and should be tested
> against a production build. Bump `VERSION` in `public/sw.js` whenever the caching rules change.

## 11. Persistence and concurrency

- Swipe state is held in an HTTP-only cookie scoped to the browser. Each request decodes it to a
  fresh `StoreState`; `POST /swipe` returns the updated state in a `Set-Cookie` header.
- There is no server-side mutable storage, so requests are independent and safe to serve from any
  serverless instance. A browser's cookie is the single source of truth for that demo user.
- Two swipes fired concurrently from the same browser can race at the cookie level: the last
  response to arrive wins. The UI sends one swipe at a time, and repeated swipes are idempotent, so
  this is acceptable for the demo.
- `data/profiles.json` is read per request, so editing seed data takes effect on reload.
- Vercel and similar hosts expose a read-only filesystem outside `/tmp`; the cookie store avoids
  that failure mode without adding a database or environment variables.

---

## 12. Project structure

```
app/
  layout.tsx                 # metadata, viewport, fonts, <PwaRegister/>
  page.tsx                   # renders <AppShell/>
  globals.css                # Tailwind import, tokens, keyframes, reduced-motion
  manifest.ts                # web app manifest (standalone, icons, colors)
  icon.svg                   # pink rounded-square browser icon
  apple-icon.png             # iOS home-screen icon
  feed/route.ts              # GET  /feed
  swipe/route.ts             # POST /swipe
  matches/route.ts           # GET  /matches
  api/
    feed/route.ts            # alias of /feed
    swipe/route.ts           # alias of /swipe
    matches/route.ts         # alias of /matches
  offline/page.tsx           # service-worker offline fallback
components/
  app-shell.tsx              # onboarding gate + tab state + install controller
  tab-bar.tsx                # floating outlined Home / Discover dock
  home-tab.tsx               # blank placeholder
  wordmark.tsx               # "coy." wordmark with pink dot
  avatar.tsx                 # photo with initials/gradient fallback
  icons.tsx                  # inline SVG icons
  pwa-register.tsx           # registers /sw.js after load
  offline-retry-button.tsx   # hard navigation back to /
  onboarding/
    onboarding-screen.tsx    # first-visit intro + constellation
    match-stack.tsx          # orbiting photo / "?" bubbles
    get-started-button.tsx   # tap, keyboard, or swipe-right CTA
  install/
    use-install-prompt.ts    # beforeinstallprompt + display-mode + platform
    install-banner.tsx       # native prompt or platform-specific guidance
  discover/
    discover-tab.tsx         # data loading, swipe handling, views, error/empty states
    swipe-deck.tsx           # gesture logic, stack, buttons, keyboard
    swipe-card.tsx           # card presentation, photo fallback, stamps
    match-overlay.tsx        # "It's a match!" dialog
    matches-view.tsx         # mutual matches grid
lib/
  types.ts                   # shared request/response types
  current-user.ts            # the single logged-in user
  api.ts                     # shared route-handler bodies (canonical + /api aliases)
  store.ts                   # profiles + cookie state, match engine
data/
  profiles.json              # 36 seed profiles
public/
  sw.js                      # versioned service worker
  icons/                     # 192/512 + maskable PWA icons
  photos/                    # seed portraits, alex.jpg + SOURCES.md
docs/
  ARCHITECTURE.md            # this document
  API.md                     # endpoint reference
  screenshots/               # README images (390×844 production captures)
```

---

## 13. Design decisions and trade-offs

| Decision | Alternative considered | Why this one |
| -------- | ---------------------- | ------------ |
| Next.js Route Handlers instead of Express | Separate Express server | One deployable, one language, no CORS/proxy setup; the brief allows either. |
| HTTP-only cookie store instead of JSON files | JSON/SQLite file store, Vercel KV/Blob | Serverless hosts have a read-only filesystem, which caused `POST /swipe` to return 500 on Vercel. A cookie persists per browser with zero setup or extra services. |
| Client-side fetching instead of Server Components | RSC initial data | The deck is highly interactive and mutates constantly; a client-owned cache keeps one source of truth and avoids a server round-trip per swipe. |
| Pointer Events + CSS instead of Framer Motion | `motion` / `react-spring` | Full control over the drag → fly-out handoff, no bundle cost, no extra dependency. |
| Optimistic swipe with rollback | Wait for the server before advancing | Swiping must feel instant; the card is restored and an error shown if the write fails. |
| Feed returns all remaining profiles | Paginated feed | 36 profiles is tiny; the client owns the deck order and can animate the stack without extra requests. |
| `likedYou` stripped by an explicit mapper | `delete profile.likedYou` | A rest-spread would silently start leaking the field if the seed type changes. |
| Reset via clearing the `coy_state` cookie (no reset API) | A `POST /api/reset` button | The brief requires that a swiped profile never reappears; a reset endpoint would undermine that promise in the UI. |
| First-visit onboarding flag in `localStorage` | A server-side flag / database column | There is no auth or user record; the intro is a client concern and a server round-trip would add a loading state for no product value. |
| Hand-written service worker | `next-pwa` / Workbox | The app has one page and a handful of cache rules; owning ~100 lines avoids a build dependency and keeps the API-exclusion rule explicit. |
| Network-first navigations | Cache-first app shell | Prevents a stale deployed shell from sticking around; the cached copy is only a fallback. |
| In-app install banner | Rely on the browser's install UI only | Lets the app meet iOS/Safari/Firefox users where no `beforeinstallprompt` exists, and keeps the entry point on-brand. |

---

## 14. How to run and demo

```bash
bun install
bun dev            # http://localhost:3000
```

1. On a first visit, land on **Onboarding**. Tap **Get Started** (or swipe the control right).
2. **Discover** opens with Maya's card. Drag it right (or press →); Maya has already liked you,
   so this produces an immediate **"It's a match!"**.
3. Open **Matches** to see the mutual match; reload the page and confirm it is still there.
4. Swipe left on a few profiles and confirm they never return.
5. Open the download icon in the header to see the install banner, then swipe through the deck to
   reach the empty state.
6. Run a production build and install the app, or go offline and reload, to exercise the service
   worker and `/offline` fallback.

To reset the demo state, clear the `coy_state` cookie (DevTools → Application → Cookies), or run
`document.cookie = "coy_state=; Max-Age=0; path=/"` in the console. To replay onboarding, run
`localStorage.removeItem("coy:onboarding-complete")` and reload.

---

## 15. Limitations and future work

- **Per-browser state.** Swipes live in an HTTP-only cookie, so they are scoped to one browser and
  cleared with site data. Different browsers or devices start from a fresh deck. A production
  version needs auth plus a database with a uniqueness constraint on `(user_id, profile_id)`.
- **No auth.** `lib/current-user.ts` hard-codes the single user. Treat the cookie as demo state, not
  as a security boundary; a client can edit its own swipe history.
- **No chat / unmatch / undo.** Deliberately out of scope.
- **PWA caveats.** Install prompts need HTTPS (or `localhost`) and a production build. The service
  worker caches the shell/assets only: swipes are not queued offline, there is no background sync
  or push, and cache-version bumps are manual (`VERSION` in `public/sw.js`). iOS installation goes
  through the Share menu because Safari does not expose `beforeinstallprompt`.
- **Onboarding is per browser.** Clearing site data or `localStorage` replays the intro; there is
  no account-level flag.
- **Placeholder photos** are local Unsplash demo portraits in `public/photos/`; a pastel gradient +
  initials avatar renders if an image fails to load.
- **Feed ordering** follows the seed file. A production app would rank by recency/activity.