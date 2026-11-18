"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { SwipeCard } from "@/components/discover/swipe-card";
import { HeartFilledIcon, XIcon } from "@/components/icons";
import type { Profile, SwipeDirection } from "@/lib/types";

interface SwipeDeckProps {
  profiles: Profile[];
  /** Called as soon as a swipe is committed (the card is already animating out). */
  onSwipe: (profile: Profile, direction: SwipeDirection) => void;
  /** Blocks gestures while the match overlay is open. */
  disabled?: boolean;
}

interface Ghost {
  key: string;
  profile: Profile;
  direction: SwipeDirection;
  x: number;
  y: number;
}

interface PointerStart {
  id: number;
  x: number;
  y: number;
  time: number;
}

/** Distance in px before a drag counts as a swipe. */
const SWIPE_THRESHOLD = 96;
/** A fast flick counts even below the distance threshold. */
const VELOCITY_THRESHOLD = 0.5;
/** Keep in sync with the CSS animation duration in globals.css. */
const FLY_MS = 300;
const MAX_VISIBLE = 3;

export function SwipeDeck({ profiles, onSwipe, disabled = false }: SwipeDeckProps) {
  const top = profiles[0];

  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  const pointerStart = useRef<PointerStart | null>(null);

  const trigger = useCallback(
    (direction: SwipeDirection, from?: { x: number; y: number }) => {
      if (disabled || !top) return;

      setDrag(null);
      const key = `${top.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setGhosts((current) => [
        ...current,
        { key, profile: top, direction, x: from?.x ?? 0, y: from?.y ?? 0 },
      ]);
      onSwipe(top, direction);

      window.setTimeout(() => {
        setGhosts((current) => current.filter((ghost) => ghost.key !== key));
      }, FLY_MS);
    },
    [disabled, onSwipe, top],
  );

  // Desktop keyboard support: ← pass, → like.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (disabled || event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        trigger("pass");
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        trigger("like");
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [disabled, trigger]);

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (disabled || !top) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    pointerStart.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      time: performance.now(),
    };
    setDrag({ x: 0, y: 0 });
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const start = pointerStart.current;
    if (!start || start.id !== event.pointerId) return;
    setDrag({ x: event.clientX - start.x, y: event.clientY - start.y });
  }

  function finishDrag(event: ReactPointerEvent<HTMLDivElement>, cancelled: boolean) {
    const start = pointerStart.current;
    if (!start || start.id !== event.pointerId) return;

    pointerStart.current = null;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const elapsed = Math.max(1, performance.now() - start.time);
    const velocity = Math.abs(dx) / elapsed;

    setDrag(null);
    if (cancelled) return;

    const shouldSwipe =
      Math.abs(dx) > SWIPE_THRESHOLD ||
      (Math.abs(dx) > 48 && velocity > VELOCITY_THRESHOLD);

    if (shouldSwipe) {
      trigger(dx > 0 ? "like" : "pass", { x: dx, y: dy });
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="relative flex min-h-0 flex-1 items-center justify-center">
        <div className="relative h-full w-full max-h-[680px]">
          {profiles.slice(0, MAX_VISIBLE).map((profile, index) => {
            const isTop = index === 0;

            const style: CSSProperties =
              isTop && drag
                ? {
                    transform: `translate3d(${drag.x}px, ${drag.y * 0.35}px, 0) rotate(${drag.x / 20}deg)`,
                    transition: "none",
                    touchAction: "pan-y",
                    zIndex: 30,
                  }
                : {
                    transform: `translate3d(0, ${index * 10}px, 0) scale(${1 - index * 0.05})`,
                    transition: "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)",
                    touchAction: isTop ? "pan-y" : "auto",
                    zIndex: 30 - index * 10,
                  };

            return (
              <div
                key={profile.id}
                style={style}
                className={`absolute inset-0 ${
                  isTop
                    ? "cursor-grab active:cursor-grabbing"
                    : "pointer-events-none"
                }`}
                onPointerDown={isTop ? handlePointerDown : undefined}
                onPointerMove={isTop ? handlePointerMove : undefined}
                onPointerUp={
                  isTop ? (event) => finishDrag(event, false) : undefined
                }
                onPointerCancel={
                  isTop ? (event) => finishDrag(event, true) : undefined
                }
              >
                <SwipeCard
                  profile={profile}
                  dragX={isTop && drag ? drag.x : 0}
                />
              </div>
            );
          })}

          {ghosts.map((ghost) => (
            <div
              key={ghost.key}
              aria-hidden
              className={`pointer-events-none absolute inset-0 ${
                ghost.direction === "like"
                  ? "animate-card-fly-right"
                  : "animate-card-fly-left"
              }`}
              style={
                {
                  zIndex: 40,
                  "--fly-x": `${ghost.x}px`,
                  "--fly-y": `${ghost.y * 0.35}px`,
                  "--fly-r": `${ghost.x / 20}deg`,
                } as CSSProperties
              }
            >
              <SwipeCard profile={ghost.profile} stamp={ghost.direction} />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-5">
        <button
          type="button"
          onClick={() => trigger("pass")}
          disabled={disabled || !top}
          aria-label={top ? `Pass on ${top.name}` : "Pass"}
          className="coy-btn h-16 w-16 bg-white p-0 text-ink hover:bg-lavender-soft"
        >
          <XIcon className="h-7 w-7" strokeWidth={2.6} />
        </button>

        <button
          type="button"
          onClick={() => trigger("like")}
          disabled={disabled || !top}
          aria-label={top ? `Like ${top.name}` : "Like"}
          className="coy-btn h-16 w-16 bg-coy-pink p-0 text-white hover:bg-coy-pink-dark"
        >
          <HeartFilledIcon className="h-7 w-7" />
        </button>
      </div>

      <p className="mt-3 flex items-center justify-center gap-2 text-center text-[10px] font-extrabold uppercase tracking-[0.16em] text-smoke">
        <span className="hidden sm:inline">← pass · like →</span>
        <span className="sm:hidden">swipe right to choose</span>
      </p>
    </div>
  );
}
