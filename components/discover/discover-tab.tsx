"use client";

import { useCallback, useEffect, useState } from "react";

import { MatchOverlay } from "@/components/discover/match-overlay";
import { MatchesView } from "@/components/discover/matches-view";
import { SwipeDeck } from "@/components/discover/swipe-deck";
import { CheckIcon, HeartFilledIcon } from "@/components/icons";
import type {
  FeedResponse,
  Match,
  MatchesResponse,
  Profile,
  SwipeDirection,
  SwipeSuccess,
} from "@/lib/types";

type LoadStatus = "loading" | "ready" | "error";

export function DiscoverTab() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [swipeError, setSwipeError] = useState<string | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [view, setView] = useState<"deck" | "matches">("deck");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchDiscover() {
      const [feedResponse, matchesResponse] = await Promise.all([
        fetch("/api/feed", { cache: "no-store", signal: controller.signal }),
        fetch("/api/matches", { cache: "no-store", signal: controller.signal }),
      ]);

      if (!feedResponse.ok || !matchesResponse.ok) {
        throw new Error("Could not load your discovery feed");
      }

      return Promise.all([
        feedResponse.json() as Promise<FeedResponse>,
        matchesResponse.json() as Promise<MatchesResponse>,
      ]);
    }

    void fetchDiscover()
      .then(([feed, matchesData]) => {
        if (controller.signal.aborted) return;
        setProfiles(feed.profiles);
        setMatches(matchesData.matches);
        setStatus("ready");
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setStatus("error");
        setError(
          cause instanceof Error ? cause.message : "Something went wrong",
        );
      });

    return () => controller.abort();
  }, [reloadKey]);

  const retry = useCallback(() => {
    setStatus("loading");
    setError(null);
    setReloadKey((key) => key + 1);
  }, []);

  const handleSwipe = useCallback(
    (profile: Profile, direction: SwipeDirection) => {
      // Optimistic: the card is already flying out, so drop it immediately.
      setProfiles((current) =>
        current.filter((candidate) => candidate.id !== profile.id),
      );
      setSwipeError(null);

      void (async () => {
        try {
          const response = await fetch("/api/swipe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ profileId: profile.id, direction }),
          });
          const data = (await response.json().catch(() => null)) as
            | (SwipeSuccess & { error?: string })
            | null;

          if (!response.ok || !data?.ok) {
            throw new Error(data?.error ?? "Swipe failed");
          }

          const newMatch = data.match;
          if (data.matched && newMatch) {
            setMatch(newMatch);
            setMatches((current) =>
              current.some((item) => item.id === newMatch.id)
                ? current
                : [newMatch, ...current],
            );
          }
        } catch {
          // Roll the card back to the front of the deck and surface the error.
          setProfiles((current) =>
            current.some((candidate) => candidate.id === profile.id)
              ? current
              : [profile, ...current],
          );
          setSwipeError("Couldn't save that swipe. Please try again.");
        }
      })();
    },
    [],
  );

  const closeMatch = useCallback(() => setMatch(null), []);
  const viewMatches = useCallback(() => {
    setMatch(null);
    setView("matches");
  }, []);

  return (
    <section className="flex h-full flex-col bg-white" aria-label="Discover">
      {view === "matches" ? (
        <MatchesView
          matches={matches}
          loading={status === "loading"}
          onBack={() => setView("deck")}
        />
      ) : (
        <>
          <header className="flex items-center justify-between gap-3 px-4 pb-1 pt-4">
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-stone-900">
                Discover
              </h1>
              <p className="mt-0.5 truncate text-xs text-stone-400">
                Swipe right to like · left to pass
              </p>
            </div>
            <button
              type="button"
              onClick={() => setView("matches")}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-100"
            >
              <HeartFilledIcon className="h-4 w-4" />
              Matches
              {matches.length > 0 ? (
                <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white">
                  {matches.length}
                </span>
              ) : null}
            </button>
          </header>

          <div className="flex min-h-0 flex-1 flex-col px-4 pb-3">
            {swipeError ? (
              <div
                role="alert"
                className="mb-2 flex items-center justify-between gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700"
              >
                <span>{swipeError}</span>
                <button
                  type="button"
                  onClick={() => setSwipeError(null)}
                  className="shrink-0 font-semibold underline underline-offset-2"
                >
                  Dismiss
                </button>
              </div>
            ) : null}

            <div className="relative min-h-0 flex-1">
              {status === "loading" ? <DeckSkeleton /> : null}
              {status === "error" ? (
                <ErrorState message={error} onRetry={retry} />
              ) : null}
              {status === "ready" && profiles.length === 0 ? (
                <EmptyState onViewMatches={() => setView("matches")} />
              ) : null}
              {status === "ready" && profiles.length > 0 ? (
                <SwipeDeck
                  profiles={profiles}
                  onSwipe={handleSwipe}
                  disabled={match !== null}
                />
              ) : null}
            </div>
          </div>
        </>
      )}

      {match ? (
        <MatchOverlay
          match={match}
          onKeepSwiping={closeMatch}
          onViewMatches={viewMatches}
        />
      ) : null}
    </section>
  );
}

function DeckSkeleton() {
  return (
    <div className="flex h-full flex-col" aria-hidden>
      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0 animate-pulse rounded-[2rem] bg-stone-100" />
        <div className="absolute inset-x-0 bottom-0 space-y-3 p-5">
          <div className="h-6 w-32 animate-pulse rounded-full bg-stone-200" />
          <div className="h-3 w-44 animate-pulse rounded-full bg-stone-200" />
          <div className="h-3 w-full animate-pulse rounded-full bg-stone-200" />
          <div className="h-3 w-4/5 animate-pulse rounded-full bg-stone-200" />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-center gap-7">
        <div className="h-16 w-16 animate-pulse rounded-full bg-stone-100" />
        <div className="h-16 w-16 animate-pulse rounded-full bg-stone-100" />
      </div>
      <div className="mt-2.5 h-3 w-24 animate-pulse rounded-full bg-stone-100 mx-auto" />
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string | null;
  onRetry: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-50">
        <HeartFilledIcon className="h-7 w-7 text-rose-400" />
      </span>
      <h2 className="mt-5 text-base font-semibold text-stone-900">
        Couldn&rsquo;t load Discover
      </h2>
      <p className="mt-1.5 max-w-[17rem] text-sm leading-relaxed text-stone-500">
        {message ?? "Check your connection and try again."}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-6 rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 active:scale-[0.98]"
      >
        Try again
      </button>
    </div>
  );
}

function EmptyState({ onViewMatches }: { onViewMatches: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <span className="flex h-20 w-20 items-center justify-center rounded-full bg-rose-50">
        <CheckIcon className="h-9 w-9 text-rose-500" strokeWidth={2.5} />
      </span>
      <h2 className="mt-6 text-xl font-bold tracking-tight text-stone-900">
        You&rsquo;re all caught up
      </h2>
      <p className="mt-2 max-w-[17rem] text-sm leading-relaxed text-stone-500">
        You&rsquo;ve seen everyone nearby. Check back later for new people.
      </p>
      <button
        type="button"
        onClick={onViewMatches}
        className="mt-7 rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 active:scale-[0.98]"
      >
        View matches
      </button>
    </div>
  );
}