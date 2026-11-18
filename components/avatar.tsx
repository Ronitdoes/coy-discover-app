/* eslint-disable @next/next/no-img-element -- placeholder portraits are loaded from randomuser.me; a gradient + initials fallback renders when the network is unavailable. */
"use client";

import { useState } from "react";

interface AvatarProps {
  src: string;
  name: string;
  /** Classes for the image or the fallback block (sizing, rounding, object-fit). */
  className?: string;
  /** Text size used by the initials fallback. */
  fallbackTextClassName?: string;
}

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Remote placeholder photo with a graceful gradient-initials fallback.
 * Falls back on error, and also when the URL is empty.
 */
export function Avatar({
  src,
  name,
  className = "",
  fallbackTextClassName = "text-4xl",
}: AvatarProps) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        aria-label={`${name}'s photo`}
        role="img"
        className={`flex items-center justify-center bg-gradient-to-br from-rose-400 via-rose-500 to-fuchsia-600 font-black text-white ${fallbackTextClassName} ${className}`}
      >
        <span className="leading-none tracking-tight">{initialsOf(name)}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={`${name}'s photo`}
      draggable={false}
      loading="lazy"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}