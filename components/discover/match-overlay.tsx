"use client";

import { useEffect, useRef } from "react";

import { Avatar } from "@/components/avatar";
import { HeartFilledIcon } from "@/components/icons";
import { CURRENT_USER } from "@/lib/current-user";
import type { Match } from "@/lib/types";

interface MatchOverlayProps {
  match: Match;
  onKeepSwiping: () => void;
  onViewMatches: () => void;
}

const FLOATING_HEARTS = [
  { left: "12%", top: "56%", delay: "0s", size: "h-6 w-6" },
  { left: "80%", top: "60%", delay: "0.9s", size: "h-4 w-4" },
  { left: "28%", top: "68%", delay: "1.7s", size: "h-5 w-5" },
  { left: "64%", top: "50%", delay: "2.2s", size: "h-7 w-7" },
];

export function MatchOverlay({ match, onKeepSwiping, onViewMatches }: MatchOverlayProps) {
  const keepSwipingRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    keepSwipingRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onKeepSwiping();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onKeepSwiping]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="match-title"
      className="fixed inset-0 z-50 flex justify-center bg-stone-950/50 backdrop-blur-sm sm:items-center"
    >
      <div className="relative flex h-full w-full max-w-md flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-rose-500 via-rose-600 to-fuchsia-700 px-6 text-center text-white sm:h-[calc(100dvh-3rem)] sm:max-h-[900px] sm:rounded-[2.25rem]">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          {FLOATING_HEARTS.map((heart) => (
            <HeartFilledIcon
              key={`${heart.left}-${heart.top}`}
              className={`animate-heart-float absolute text-white/25 ${heart.size}`}
              style={{
                left: heart.left,
                top: heart.top,
                animationDelay: heart.delay,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 flex flex-col items-center">
          <p className="animate-match-pop text-xs font-semibold uppercase tracking-[0.45em] text-white/70">
            It&rsquo;s a
          </p>
          <h2
            id="match-title"
            className="animate-match-pop mt-1 text-6xl font-black tracking-tight drop-shadow-sm"
          >
            Match!
          </h2>

          <div className="animate-match-pop mt-10 flex items-center justify-center gap-4">
            <Avatar
              src={CURRENT_USER.photo}
              name={CURRENT_USER.name}
              className="h-24 w-24 rounded-full object-cover ring-4 ring-white/40"
              fallbackTextClassName="text-2xl"
            />
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur">
              <HeartFilledIcon className="h-5 w-5" />
            </span>
            <Avatar
              src={match.profile.photo}
              name={match.profile.name}
              className="h-24 w-24 rounded-full object-cover ring-4 ring-white/40"
              fallbackTextClassName="text-2xl"
            />
          </div>

          <p className="animate-match-pop mt-8 max-w-xs text-base leading-relaxed text-white/90">
            You and{" "}
            <span className="font-semibold text-white">{match.profile.name}</span>{" "}
            liked each other.
          </p>

          <div className="animate-match-pop mt-9 flex w-full max-w-xs flex-col gap-3">
            <button
              ref={keepSwipingRef}
              type="button"
              onClick={onKeepSwiping}
              className="w-full rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-rose-600 shadow-lg shadow-rose-950/20 transition hover:bg-rose-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/50 active:scale-[0.98]"
            >
              Keep swiping
            </button>
            <button
              type="button"
              onClick={onViewMatches}
              className="w-full rounded-full border border-white/40 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/40 active:scale-[0.98]"
            >
              View matches
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}