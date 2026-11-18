"use client";

import { Avatar } from "@/components/avatar";
import { ArrowLeftIcon, HeartFilledIcon } from "@/components/icons";
import type { Match } from "@/lib/types";

interface MatchesViewProps {
  matches: Match[];
  loading?: boolean;
  onBack: () => void;
}

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
    <div className="flex h-full flex-col bg-white">
      <header className="flex items-center gap-1.5 px-3 pb-2 pt-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to Discover"
          className="flex h-9 w-9 items-center justify-center rounded-full text-stone-500 transition hover:bg-stone-100"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-bold tracking-tight text-stone-900">Matches</h2>
        <span className="ml-auto rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600">
          {matches.length}
        </span>
      </header>

      <div className="no-scrollbar flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-1">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((item) => (
              <div
                key={item}
                className="aspect-[3/4] animate-pulse rounded-2xl bg-stone-100"
              />
            ))}
          </div>
        ) : matches.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 pb-16 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-50">
              <HeartFilledIcon className="h-7 w-7 text-rose-400" />
            </span>
            <h3 className="mt-5 text-base font-semibold text-stone-900">
              No matches yet
            </h3>
            <p className="mt-1.5 max-w-[16rem] text-sm leading-relaxed text-stone-500">
              When you and someone like each other, they&rsquo;ll show up here.
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3">
            {matches.map((match) => (
              <li key={match.id}>
                <article className="relative overflow-hidden rounded-2xl bg-stone-100 shadow-sm">
                  <div className="aspect-[3/4] w-full">
                    <Avatar
                      src={match.profile.photo}
                      name={match.profile.name}
                      className="h-full w-full object-cover"
                      fallbackTextClassName="text-2xl"
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/10 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                    <p className="truncate text-sm font-semibold">
                      {match.profile.name}
                      <span className="font-light text-white/80">
                        , {match.profile.age}
                      </span>
                    </p>
                    <p className="truncate text-[11px] text-white/75">
                      {match.profile.city}
                    </p>
                    <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-white/60">
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