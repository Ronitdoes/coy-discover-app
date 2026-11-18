"use client";

import { useCallback, useEffect, useState } from "react";

import { MatchOverlay } from "@/components/discover/match-overlay";
import { MatchesView } from "@/components/discover/matches-view";
import { SwipeDeck } from "@/components/discover/swipe-deck";
import { HeartFilledIcon } from "@/components/icons";
import { Wordmark } from "@/components/wordmark";
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
    <section className="flex h-full min-h-0 flex-col bg-white" aria-label="Discover">
      {view === "matches" ? (
        <MatchesView
          matches={matches}
          loading={status === "loading"}
          onBack={() => setView("deck")}
        />
      ) : (
        <>
          <header className="flex shrink-0 items-center justify-between gap-3 px-5 pb-3 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-8">
            <Wordmark className="text-[31px]" />
            <button
              type="button"
              onClick={() => setView("matches")}
              aria-label={
                matches.length > 0
                  ? `View your ${matches.length} ${
                      matches.length === 1 ? "match" : "matches"
                    }`
                  : "View your matches"
              }
              className="coy-btn relative h-11 w-11 shrink-0 bg-lavender p-0 text-coy-pink hover:bg-white"
            >
              <HeartFilledIcon className="h-5 w-5" />
              {matches.length > 0 ? (
                <span
                  aria-hidden
                  className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-ink bg-coy-pink px-1 text-[10px] font-extrabold leading-none text-white"
                >
                  {matches.length}
                </span>
              ) : null}
            </button>
          </header>

          <div className="flex min-h-0 flex-1 flex-col px-5 pb-2 sm:px-8">
            {swipeError ? (
              <div
                role="alert"
                className="mb-2.5 flex items-center justify-between gap-2 rounded-2xl border-2 border-ink bg-blush px-3 py-2 text-[12px] font-bold text-ink shadow-[2px_2px_0_0_var(--color-ink)]"
              >
                <span>{swipeError}</span>
                <button
                  type="button"
                  onClick={() => setSwipeError(null)}
                  className="shrink-0 text-coy-pink underline underline-offset-2"
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
      <div className="min-h-0 flex-1">
        <div className="coy-card flex h-full w-full flex-col bg-lavender p-3">
          <div className="min-h-0 flex-1 animate-pulse rounded-[20px] border-2 border-ink/15 bg-white/70" />
          <div className="shrink-0 space-y-2.5 px-2 pb-2 pt-4">
            <div className="h-6 w-36 animate-pulse rounded-full bg-ink/10" />
            <div className="h-3 w-44 animate-pulse rounded-full bg-ink/10" />
            <div className="h-3 w-full animate-pulse rounded-full bg-ink/10" />
            <div className="flex gap-1.5 pt-1">
              <div className="h-5 w-16 animate-pulse rounded-full bg-white/70" />
              <div className="h-5 w-14 animate-pulse rounded-full bg-white/70" />
              <div className="h-5 w-12 animate-pulse rounded-full bg-white/70" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-5">
        <div className="h-16 w-16 animate-pulse rounded-full border-2 border-ink/15 bg-lavender-soft" />
        <div className="h-16 w-16 animate-pulse rounded-full border-2 border-ink/15 bg-blush" />
      </div>
      <div className="mx-auto mt-3 h-3 w-28 animate-pulse rounded-full bg-ink/10" />
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
    <div className="no-scrollbar h-full overflow-y-auto">
      <div className="flex min-h-full items-center justify-center py-2">
        <div className="coy-card w-full max-w-[440px] bg-blush px-6 py-8 text-center sm:px-8">
          <span aria-hidden className="text-4xl">
            🙈
          </span>
          <h2 className="mt-3 text-[25px] font-black leading-tight tracking-[-0.04em] text-ink">
            Couldn&rsquo;t load Discover
          </h2>
          <p className="mx-auto mt-2 max-w-[19rem] text-[13px] font-medium leading-relaxed text-ink/60">
            {message ?? "Check your connection and try again."}
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="coy-btn mt-6 bg-coy-pink px-6 py-3 text-[14px] text-white hover:bg-coy-pink-dark"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onViewMatches }: { onViewMatches: () => void }) {
  return (
    <div className="no-scrollbar h-full overflow-y-auto">
      <div className="flex min-h-full items-center justify-center py-2">
        <div className="coy-card w-full max-w-[440px] bg-lavender px-6 py-8 text-center sm:px-8">
          <span aria-hidden className="text-4xl">
            👀
          </span>
          <h2 className="mt-3 text-[26px] font-black leading-tight tracking-[-0.04em] text-ink">
            That&rsquo;s everyone for now
          </h2>
          <p className="mx-auto mt-2 max-w-[19rem] text-[13px] font-medium leading-relaxed text-ink/60">
            You&rsquo;ve seen every profile nearby. New crushes will show up
            here — and your likes stay private until they&rsquo;re mutual.
          </p>
          <button
            type="button"
            onClick={onViewMatches}
            className="coy-btn mt-6 bg-coy-pink px-6 py-3 text-[14px] text-white hover:bg-coy-pink-dark"
          >
            See your matches
          </button>
        </div>
      </div>
    </div>
  );
}
