"use client";

import { Avatar } from "@/components/avatar";
import {
  ArrowLeftIcon,
  HeartFilledIcon,
} from "@/components/icons";
import { Wordmark } from "@/components/wordmark";
import type { Match } from "@/lib/types";

interface MatchesViewProps {
  matches: Match[];
  loading?: boolean;
  onBack: () => void;
}

const MATCH_TONES = ["bg-lavender", "bg-mint", "bg-blush"] as const;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function formatMatchedAt(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Matched recently";

  const days = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86_400_000);
  if (days <= 0) return "Matched today";
  if (days === 1) return "Matched yesterday";
  if (days < 7) return `Matched ${days} days ago`;
  return `Matched ${date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })}`;
}

export function MatchesView({ matches, loading = false, onBack }: MatchesViewProps) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <header className="shrink-0 px-5 pb-4 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-8">
        <div className="flex items-center justify-between gap-3">
          <Wordmark className="text-[31px]" />
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to Discover"
            className="coy-btn h-10 w-10 bg-white p-0 text-ink hover:bg-lavender-soft"
          >
            <ArrowLeftIcon className="h-5 w-5" strokeWidth={2.4} />
          </button>
        </div>

        <div className="mt-5">
          <div className="flex items-center gap-2.5">
            <h1 className="text-[30px] font-black leading-none tracking-[-0.05em] text-ink sm:text-[34px]">
              Your matches
            </h1>
            <span className="shrink-0 rounded-full border-2 border-ink bg-mint px-2.5 py-1 text-[13px] font-extrabold leading-none text-ink">
              {matches.length}
            </span>
          </div>
          <p className="mt-2 text-[12px] font-semibold text-smoke">
            Mutual likes only. That&rsquo;s the coy promise.
          </p>
        </div>
      </header>

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-1 sm:px-8">
        {loading ? (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3" aria-hidden>
            {[0, 1, 2, 3].map((item) => (
              <li key={item}>
                <div className="coy-card-sm animate-pulse bg-lavender-soft p-2">
                  <div className="aspect-[4/5] rounded-[14px] border-2 border-ink/10 bg-white/70" />
                  <div className="space-y-1.5 px-1 pb-1 pt-2.5">
                    <div className="h-3.5 w-4/5 rounded-full bg-ink/10" />
                    <div className="h-2.5 w-1/2 rounded-full bg-ink/10" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : matches.length === 0 ? (
          <div className="flex min-h-full flex-col justify-center py-6">
            <div className="coy-card mx-auto w-full max-w-[440px] bg-lavender px-6 py-9 text-center">
              <span aria-hidden className="text-4xl">
                👻
              </span>
              <h2 className="mt-3 text-[25px] font-black leading-tight tracking-[-0.04em] text-ink">
                No matches yet
              </h2>
              <p className="mx-auto mt-2 max-w-[19rem] text-[13px] font-medium leading-relaxed text-ink/60">
                No one has to know. Keep swiping — when a like is mutual,
                they&rsquo;ll show up right here.
              </p>
              <button
                type="button"
                onClick={onBack}
                className="coy-btn mt-6 bg-coy-pink px-6 py-3 text-[14px] text-white hover:bg-coy-pink-dark"
              >
                Start swiping
              </button>
            </div>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-4 pb-2 sm:grid-cols-3">
            {matches.map((match, index) => (
              <li key={match.id}>
                <article
                  className={`coy-card-sm overflow-hidden p-2 transition-transform duration-150 hover:-translate-y-0.5 ${MATCH_TONES[index % MATCH_TONES.length]}`}
                >
                  <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[14px] border-2 border-ink bg-gradient-to-br from-lavender via-blush to-mint">
                    <Avatar
                      src={match.profile.photo}
                      name={match.profile.name}
                      className="h-full w-full object-cover"
                      fallbackTextClassName="text-2xl"
                    />
                    <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-ink bg-white text-coy-pink shadow-[2px_2px_0_0_var(--color-ink)]">
                      <HeartFilledIcon className="h-3.5 w-3.5" />
                    </span>
                  </div>

                  <div className="px-1 pb-1 pt-2.5">
                    <p className="truncate text-[14px] font-extrabold leading-tight text-ink">
                      {match.profile.name}
                      <span className="font-bold text-ink/40">
                        , {match.profile.age}
                      </span>
                    </p>
                    <p className="mt-0.5 truncate text-[11px] font-semibold text-ink/55">
                      {match.profile.city}
                    </p>
                    <p className="mt-1.5 inline-flex max-w-full items-center gap-1 truncate rounded-full border border-ink/20 bg-white/70 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.06em] text-ink/55">
                      <span className="h-1 w-1 shrink-0 rounded-full bg-coy-pink" />
                      {formatMatchedAt(match.matchedAt)}
                    </p>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
