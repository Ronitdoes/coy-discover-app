"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useRef, useState } from "react";

import { ChevronsRightIcon, HeartFilledIcon } from "@/components/icons";

interface GetStartedButtonProps {
  onGetStarted: () => void;
  className?: string;
}

const TRIGGER_RATIO = 0.55;

/**
 * The onboarding CTA. It is a normal button — press Enter, Space, or tap it —
 * but it can also be swiped to the right like a match card in Discover.
 */
export function GetStartedButton({
  onGetStarted,
  className = "",
}: GetStartedButtonProps) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [travel, setTravel] = useState(0);
  const trackRef = useRef<HTMLButtonElement>(null);
  const handleRef = useRef<HTMLSpanElement>(null);
  const startX = useRef<number | null>(null);
  const offsetRef = useRef(0);
  const maxTravel = useRef(0);
  const suppressClick = useRef(false);
  const finished = useRef(false);

  const setDragOffset = useCallback((value: number) => {
    offsetRef.current = value;
    setOffset(value);
  }, []);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    onGetStarted();
  }, [onGetStarted]);

  function handlePointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    const track = trackRef.current;
    const handle = handleRef.current;
    if (track && handle) {
      const styles = window.getComputedStyle(track);
      const inset =
        (parseFloat(styles.paddingLeft) || 0) +
        (parseFloat(styles.paddingRight) || 0);
      maxTravel.current = Math.max(
        0,
        track.clientWidth - inset - handle.offsetWidth,
      );
      setTravel(maxTravel.current);
    }

    startX.current = event.clientX;
    suppressClick.current = false;
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    if (startX.current === null) return;

    const distance = Math.max(
      0,
      Math.min(maxTravel.current, event.clientX - startX.current),
    );
    if (distance > 6) suppressClick.current = true;
    setDragOffset(distance);
  }

  function handlePointerEnd() {
    if (startX.current === null) return;

    startX.current = null;
    setDragging(false);

    if (offsetRef.current >= maxTravel.current * TRIGGER_RATIO) {
      finish();
      return;
    }

    setDragOffset(0);
  }

  function handlePointerCancel() {
    startX.current = null;
    suppressClick.current = false;
    setDragging(false);
    setDragOffset(0);
  }

  function handleClick() {
    // A completed drag is followed by a synthetic click; ignore just that one.
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    finish();
  }

  const progress = Math.min(
    1,
    offset / Math.max(1, travel * TRIGGER_RATIO),
  );

  return (
    <button
      ref={trackRef}
      type="button"
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerCancel}
      aria-label="Get started"
      className={`group relative flex h-[66px] w-full touch-none select-none items-center rounded-full border-2 border-ink bg-ink px-2.5 shadow-[5px_5px_0_0_var(--color-ink)] ${className}`}
    >
      <span
        ref={handleRef}
        className="relative z-10 flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-full bg-coy-pink text-white"
        style={{
          transform: `translateX(${offset}px) rotate(${-6 + progress * 6}deg) scale(${1 + progress * 0.06})`,
          transition: dragging
            ? "none"
            : "transform 320ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <HeartFilledIcon className="h-[22px] w-[22px]" />
      </span>

      <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[15px] font-extrabold tracking-[-0.01em] text-white">
        Get Started
      </span>

      <span className="ml-auto mr-2 flex items-center text-coy-pink">
        <ChevronsRightIcon
          className="animate-onboarding-chevrons h-6 w-6"
          strokeWidth={2.8}
        />
      </span>
    </button>
  );
}
