"use client";

import { useEffect, useRef } from "react";

import { Avatar } from "@/components/avatar";
import { HeartFilledIcon, XIcon } from "@/components/icons";
import { CURRENT_USER } from "@/lib/current-user";
import type { Match } from "@/lib/types";

interface MatchOverlayProps {
  match: Match;
  onKeepSwiping: () => void;
  onViewMatches: () => void;
}

const FLOATING_HEARTS = [
  { left: "9%", top: "54%", delay: "0s", size: "h-5 w-5" },
  { left: "83%", top: "58%", delay: "0.9s", size: "h-4 w-4" },
  { left: "25%", top: "70%", delay: "1.7s", size: "h-6 w-6" },
  { left: "68%", top: "46%", delay: "2.2s", size: "h-3.5 w-3.5" },
  { left: "44%", top: "62%", delay: "3s", size: "h-4 w-4" },
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
      aria-describedby="match-copy"
      onClick={onKeepSwiping}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4 backdrop-blur-[2px]"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="coy-card animate-match-pop no-scrollbar relative max-h-[calc(100dvh-2rem)] w-full max-w-[400px] overflow-y-auto overflow-x-hidden bg-lavender px-5 pb-5 pt-8 text-center"
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          {FLOATING_HEARTS.map((heart) => (
            <HeartFilledIcon
              key={`${heart.left}-${heart.top}`}
              className={`animate-heart-float absolute text-coy-pink/25 ${heart.size}`}
              style={{
                left: heart.left,
                top: heart.top,
                animationDelay: heart.delay,
              }}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={onKeepSwiping}
          aria-label="Close match and keep swiping"
          className="coy-btn absolute right-3.5 top-3.5 z-20 h-9 w-9 bg-white p-0 text-ink hover:bg-blush"
        >
          <XIcon className="h-4 w-4" strokeWidth={2.8} />
        </button>

        <div className="relative z-10 flex flex-col items-center">
          <div className="flex items-center justify-center">
            <Avatar
              src={CURRENT_USER.photo}
              name={CURRENT_USER.name}
              className="h-[78px] w-[78px] rounded-full border-[3px] border-ink bg-lavender object-cover"
              fallbackTextClassName="text-2xl"
            />
            <span className="animate-heart-badge z-10 -mx-2.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-coy-pink text-white shadow-[2px_2px_0_0_var(--color-ink)]">
              <HeartFilledIcon className="h-4 w-4" />
            </span>
            <Avatar
              src={match.profile.photo}
              name={match.profile.name}
              className="h-[78px] w-[78px] rounded-full border-[3px] border-ink bg-lavender object-cover"
              fallbackTextClassName="text-2xl"
            />
          </div>

          <p className="mt-4 inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-mint px-3 py-1 text-[9px] font-extrabold uppercase tracking-[0.16em] text-ink">
            <HeartFilledIcon className="h-3 w-3 text-coy-pink" />
            Mutual like
          </p>

          <h2
            id="match-title"
            className="mt-2 text-balance text-[38px] font-black leading-[0.95] tracking-[-0.055em] text-ink"
          >
            It&rsquo;s a match!
          </h2>

          <p
            id="match-copy"
            className="mx-auto mt-2.5 max-w-[20rem] text-[13px] font-medium leading-relaxed text-ink/65"
          >
            You and{" "}
            <span className="font-extrabold text-ink">{match.profile.name}</span>{" "}
            liked each other. Likes stay private until they&rsquo;re mutual —
            that&rsquo;s the coy promise.
          </p>

          <div className="mt-6 flex w-full max-w-[280px] flex-col gap-3">
            <button
              ref={keepSwipingRef}
              type="button"
              onClick={onKeepSwiping}
              className="coy-btn w-full bg-coy-pink px-6 py-3.5 text-[14px] text-white hover:bg-coy-pink-dark"
            >
              Keep swiping
            </button>
            <button
              type="button"
              onClick={onViewMatches}
              className="coy-btn w-full bg-white px-6 py-3.5 text-[14px] text-ink hover:bg-mint-soft"
            >
              View your matches
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
